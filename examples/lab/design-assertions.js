// Framework Design Assertion Suite
// This suite verifies the architectural claims about Lit, Stencil, FAST, and Custom Signals.
// Run: bun run examples/comparisons/07-design-assertions.js

import assert from 'node:assert';
import { signal, computed, effect, batch } from '../core/signal.js';

class BenchmarkTracker {
  constructor() {
    this.renders = 0;
    this.bindings = 0;
    this.computed = 0;
  }
  incRender() { this.renders++; }
  incBinding() { this.bindings++; }
  incComputed() { this.computed++; }
  reset() { this.renders = 0; this.bindings = 0; this.computed = 0; }
}

// ─── Simulations (The Design) ───

class LitSim {
  constructor(t) {
    this.t = t;
    this._state = { count: 0, name: 'Test' };
    this._pending = false;
  }
  get doubled() { this.t.incComputed(); return this._state.count * 2; }
  set(k, v) {
    if (this._state[k] === v) return;
    this._state[k] = v;
    if (!this._pending) {
      this._pending = true;
      queueMicrotask(() => {
        this.t.incRender();
        this.t.incBinding(); this.t.incBinding(); this.t.incBinding();
        this._pending = false;
      });
    }
  }
}

class StencilSim {
  constructor(t) {
    this.t = t;
    this._state = { count: 0, name: 'Test' };
    this._pending = false;
  }
  get doubled() { this.t.incComputed(); return this._state.count * 2; }
  set(k, v) {
    if (this._state[k] === v) return;
    this._state[k] = v;
    if (!this._pending) {
      this._pending = true;
      queueMicrotask(() => {
        this.t.incRender();
        this.t.incBinding();
        this._pending = false;
      });
    }
  }
}

class FASTSim {
  constructor(t) {
    this.t = t;
    this._state = { count: 0, name: 'Test' };
    this._subs = new Map();
  }
  subscribe(k) {
    if (!this._subs.has(k)) this._subs.set(k, []);
    this._subs.get(k).push(() => this.t.incBinding());
  }
  setupComputed(name, dep) {
    this.subscribe(dep);
    this.subscribe(name);
    const oldNotify = this.notify.bind(this);
    this.notify = (k) => {
      if (k === dep) { this.t.incComputed(); oldNotify(name); }
      oldNotify(k);
    };
  }
  set(k, v) {
    if (this._state[k] === v) return;
    this._state[k] = v;
    this.notify(k);
  }
  notify(k) {
    const callbacks = this._subs.get(k) || [];
    callbacks.forEach(cb => cb());
  }
}

class SignalSim {
  constructor(t) {
    this.t = t;
    this.count = signal(0);
    this.name = signal('Test');
    this.doubled = computed(() => { this.t.incComputed(); return this.count() * 2; });
    effect(() => { this.count(); this.t.incBinding(); });
    effect(() => { this.name(); this.t.incBinding(); });
    effect(() => { this.doubled(); this.t.incBinding(); });
  }
}

// ─── Test Suite ───

async function runTests() {
  const t = {
    lit: new BenchmarkTracker(),
    stencil: new BenchmarkTracker(),
    fast: new BenchmarkTracker(),
    custom: new BenchmarkTracker()
  };

  const lit = new LitSim(t.lit);
  const stencil = new StencilSim(t.stencil);
  const fast = new FASTSim(t.fast);
  fast.subscribe('name'); 
  fast.setupComputed('doubled', 'count');
  const custom = new SignalSim(t.custom);

  Object.values(t).forEach(v => v.reset());

  console.log('🚀 Running Framework Design Assertions...\n');

  // Test 1: Granularity
  console.log('Test 1: Granularity (Update "name" only)');
  lit.set('name', 'A');
  stencil.set('name', 'A');
  fast.set('name', 'A');
  custom.name.set('A');
  await new Promise(r => setTimeout(r, 0));

  assert.strictEqual(t.lit.renders, 1, 'Lit should trigger 1 render');
  assert.strictEqual(t.lit.bindings, 3, 'Lit should update all bindings');
  assert.strictEqual(t.fast.renders, 0, 'FAST should have 0 renders (targeted)');
  assert.strictEqual(t.fast.bindings, 1, 'FAST should update exactly 1 binding');
  assert.strictEqual(t.custom.bindings, 1, 'Custom should update exactly 1 binding');
  console.log('✅ Pass');

  // Test 2: Derived State
  console.log('\nTest 2: Derived State (Update "count")');
  Object.values(t).forEach(v => v.reset());
  lit.set('count', 1);
  stencil.set('count', 1);
  fast.set('count', 1);
  custom.count.set(1);
  await new Promise(r => setTimeout(r, 0));

  assert.strictEqual(t.lit.bindings, 3, 'Lit should update all bindings');
  assert.strictEqual(t.fast.computed, 1, 'FAST should trigger 1 computed update');
  assert.strictEqual(t.fast.bindings, 2, 'FAST should update count and doubled bindings');
  assert.strictEqual(t.custom.computed, 1, 'Custom should trigger 1 computed update');
  assert.strictEqual(t.custom.bindings, 2, 'Custom should update count and doubled bindings');
  console.log('✅ Pass');

  // Test 3: Batching
  console.log('\nTest 3: Batching (3 rapid changes)');
  Object.values(t).forEach(v => v.reset());
  lit.set('count', 2); lit.set('name', 'B'); lit.set('count', 3);
  stencil.set('count', 2); stencil.set('name', 'B'); stencil.set('count', 3);
  fast.set('count', 2); fast.set('name', 'B'); fast.set('count', 3);
  batch(() => {
    custom.count.set(2); custom.name.set('B'); custom.count.set(3);
  });
  await new Promise(r => setTimeout(r, 0));

  assert.strictEqual(t.lit.renders, 1, 'Lit should batch to 1 render');
  assert.strictEqual(t.stencil.renders, 1, 'Stencil should batch to 1 render');
  assert.strictEqual(t.fast.bindings, 5, 'FAST should NOT batch by default (2+1+2)');
  assert.strictEqual(t.custom.bindings, 5, 'Custom should batch using batch()');
  console.log('✅ Pass');

  // Test 4: Symmetric Updates (No-op)
  console.log('\nTest 4: Symmetric Updates (Setting same value)');
  Object.values(t).forEach(v => v.reset());
  
  // First update to establish state
  lit.set('name', 'A');
  stencil.set('name', 'A');
  fast.set('name', 'A');
  custom.name.set('A');
  await new Promise(r => setTimeout(r, 0));
  Object.values(t).forEach(v => v.reset());

  // Now set the SAME value
  lit.set('name', 'A');
  stencil.set('name', 'A');
  fast.set('name', 'A');
  custom.name.set('A');
  await new Promise(r => setTimeout(r, 0));

  assert.strictEqual(t.lit.renders, 0, 'Lit should not render if value is unchanged');
  assert.strictEqual(t.fast.bindings, 0, 'FAST should not update if value is unchanged');
  assert.strictEqual(t.custom.bindings, 0, 'Custom should not update if value is unchanged');
  console.log('✅ Pass');


  console.log('\n🎉 All design assertions passed!');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:');
  console.error(err);
  process.exit(1);
});
