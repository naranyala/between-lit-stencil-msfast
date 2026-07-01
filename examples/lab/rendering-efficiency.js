// Framework Design Testing Suite
// Comparing Lit vs Stencil vs FAST vs Custom Signals
// Focus: Batching, Granularity, and Derived State (Computed)
// Run: bun run examples/comparisons/06-framework-benchmark.js

import { signal, computed, effect, batch } from '../core/signal.js';

class BenchmarkTracker {
  constructor(name) {
    this.name = name;
    this.renders = 0;
    this.bindingUpdates = 0;
    this.computedUpdates = 0;
  }

  incRender() { this.renders++; }
  incBinding() { this.bindingUpdates++; }
  incComputed() { this.computedUpdates++; }
  reset() { this.renders = 0; this.bindingUpdates = 0; this.computedUpdates = 0; }
  get stats() { return { renders: this.renders, bindings: this.bindingUpdates, computed: this.computedUpdates }; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Lit Design Simulation (Coarse-grained / Microtask)
// ─────────────────────────────────────────────────────────────────────────────
class LitSimulation {
  constructor(tracker) {
    this.tracker = tracker;
    this._state = { count: 0, name: 'Test' };
    this._pending = false;
  }

  // In Lit, computed values are usually getters that are re-evaluated during render
  get doubled() {
    this.tracker.incComputed();
    return this._state.count * 2;
  }

  set(key, val) {
    if (this._state[key] === val) return;
    this._state[key] = val;
    this.requestUpdate();
  }

  requestUpdate() {
    if (this._pending) return;
    this._pending = true;
    queueMicrotask(() => {
      this.tracker.incRender();
      // In a real render, all bindings are re-evaluated
      this.tracker.incBinding(); // Update count binding
      this.tracker.incBinding(); // Update name binding
      this.tracker.incBinding(); // Update doubled binding
      this._pending = false;
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Stencil Design Simulation (Fine-grained Proxy -> VDOM Diff)
// ─────────────────────────────────────────────────────────────────────────────
class StencilSimulation {
  constructor(tracker) {
    this.tracker = tracker;
    this._state = { count: 0, name: 'Test' };
    this.proxy = new Proxy(this._state, {
      set: (target, prop, value) => {
        if (target[prop] === value) return true;
        target[prop] = value;
        this.requestDiff();
        return true;
      }
    });
    this._pending = false;
  }

  get doubled() {
    this.tracker.incComputed();
    return this._state.count * 2;
  }

  requestDiff() {
    if (this._pending) return;
    this._pending = true;
    queueMicrotask(() => {
      this.tracker.incRender(); // VDOM Diff
      // After diff, only changed bindings are updated
      // In this simple simulation, we assume the diff identifies 1 change
      this.tracker.incBinding(); 
      this._pending = false;
    });
  }

  set(key, val) { this.proxy[key] = val; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FAST Design Simulation (Observable / Targeted)
// ─────────────────────────────────────────────────────────────────────────────
class FASTSimulation {
  constructor(tracker) {
    this.tracker = tracker;
    this._state = { count: 0, name: 'Test' };
    this._subs = new Map();
  }

  subscribe(key) {
    if (!this._subs.has(key)) this._subs.set(key, []);
    this._subs.get(key).push(() => this.tracker.incBinding());
  }

  // FAST computed values are observables that depend on other observables
  setupComputed(name, dependency, fn) {
    this.subscribe(dependency);
    this.subscribe(name);
    // When dependency changes, computed must be notified
    const originalNotify = this.notify.bind(this);
    this.notify = (key) => {
      if (key === dependency) {
        this.tracker.incComputed();
        originalNotify(name);
      }
      originalNotify(key);
    };
  }

  set(key, val) {
    if (this._state[key] === val) return;
    this._state[key] = val;
    this.notify(key);
  }

  notify(key) {
    const callbacks = this._subs.get(key) || [];
    callbacks.forEach(cb => cb());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Custom Signal Implementation (Dependency Tracking)
// ─────────────────────────────────────────────────────────────────────────────
class SignalSimulation {
  constructor(tracker) {
    this.tracker = tracker;
    this.count = signal(0);
    this.name = signal('Test');
    
    this.doubled = computed(() => {
      this.tracker.incComputed();
      return this.count() * 2;
    });

    effect(() => {
      this.count();
      this.tracker.incBinding();
    });
    effect(() => {
      this.name();
      this.tracker.incBinding();
    });
    effect(() => {
      this.doubled();
      this.tracker.incBinding();
    });
  }

  setCount(val) { this.count.set(val); }
  setName(val) { this.name.set(val); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite Execution
// ─────────────────────────────────────────────────────────────────────────────

async function runSuite() {
  const trackers = {
    Lit: new BenchmarkTracker('Lit'),
    Stencil: new BenchmarkTracker('Stencil'),
    FAST: new BenchmarkTracker('FAST'),
    Custom: new BenchmarkTracker('Custom'),
  };

  const lit = new LitSimulation(trackers.Lit);
  const stencil = new StencilSimulation(trackers.Stencil);
  const fast = new FASTSimulation(trackers.FAST);
  fast.subscribe('count');
  fast.subscribe('name');
  fast.subscribe('doubled');
  fast.setupComputed('doubled', 'count', (v) => v * 2);
  const custom = new SignalSimulation(trackers.Custom);

  const scenarios = [
    {
      name: 'Test 1: Granularity (Update "name" only)',
      description: 'Changing a variable that doesn\'t affect others.',
      fn: async () => {
        lit.set('name', 'Updated Name');
        stencil.set('name', 'Updated Name');
        fast.set('name', 'Updated Name');
        custom.setName('Updated Name');
        await new Promise(r => setTimeout(r, 0));
      }
    },
    {
      name: 'Test 2: Derived State (Update "count")',
      description: 'Changing a variable that triggers a computed value.',
      fn: async () => {
        lit.set('count', 1);
        stencil.set('count', 1);
        fast.set('count', 1);
        custom.setCount(1);
        await new Promise(r => setTimeout(r, 0));
      }
    },
    {
      name: 'Test 3: Batching (3 rapid changes)',
      description: 'Performing multiple updates in a single logical operation.',
      fn: async () => {
        lit.set('count', 2);
        lit.set('name', 'Name 2');
        lit.set('count', 3);

        stencil.set('count', 2);
        stencil.set('name', 'Name 2');
        stencil.set('count', 3);

        fast.set('count', 2);
        fast.set('name', 'Name 2');
        fast.set('count', 3);

        batch(() => {
          custom.setCount(2);
          custom.setName('Name 2');
          custom.setCount(3);
        });
        await new Promise(r => setTimeout(r, 0));
      }
    }
  ];

  console.log('🚀 Framework Design Testing Suite\n');

  for (const scenario of scenarios) {
    Object.values(trackers).forEach(t => t.reset());
    
    await scenario.fn();
    
    console.log(`--- ${scenario.name} ---`);
    console.log(`Description: ${scenario.description}`);
    console.table(Object.fromEntries(
      Object.entries(trackers).map(([name, t]) => [name, t.stats])
    ));
    console.log('\n');
  }
}

runSuite().catch(console.error);
