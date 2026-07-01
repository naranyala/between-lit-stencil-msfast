// Comparison: Reactivity Systems
// Lit Getter/Setter vs Stencil Proxy vs FAST Observable vs Custom Signal
// Run: bun run examples/comparisons/02-reactivity-deep-dive.js

import { signal, computed, effect, batch, untrack } from '../custom/signal.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Reactivity Deep Dive: 4 Systems Compared          ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §2.2 Reactivity Deep Dive
// ═══════════════════════════════════════════════════════════════

// ─── 1. Lit-style: Getter/Setter Interception ───────────────

console.log('--- 1. Lit: Getter/Setter Interception ---');

class LitStyleReactivity {
  constructor() {
    this._count = 0;
    this._updateQueued = false;
  }

  get count() {
    return this._count;
  }

  set count(value) {
    const old = this._count;
    this._count = value;
    if (old !== value) {
      this.requestUpdate();
    }
  }

  requestUpdate() {
    if (!this._updateQueued) {
      this._updateQueued = true;
      queueMicrotask(() => {
        this.performUpdate();
        this._updateQueued = false;
      });
    }
  }

  performUpdate() {
    console.log(`  [Lit] performUpdate() → DOM mutation: count=${this._count}`);
  }
}

const lit = new LitStyleReactivity();
lit.count = 1;
lit.count = 2;
lit.count = 3;

console.log('  Flow: setter → requestUpdate → microtask → performUpdate');
console.log('');

// ─── 2. Stencil-style: Proxy-based State ────────────────────

console.log('--- 2. Stencil: Proxy-based State ---');

function createStencilProxy(target, onUpdate) {
  return new Proxy(target, {
    set(obj, prop, value) {
      const old = obj[prop];
      obj[prop] = value;
      if (old !== value) {
        onUpdate(prop, value, old);
      }
      return true;
    },
  });
}

let stencilRenderCount = 0;
const stencilState = createStencilProxy({ count: 0 }, (prop, value, old) => {
  stencilRenderCount++;
  console.log(`  [Stencil] Proxy trap: ${prop} changed ${old} → ${value}`);
  console.log(`  [Stencil] queueMicrotask → VDOM diff → DOM patch (render #${stencilRenderCount})`);
});

stencilState.count = 1;
stencilState.count = 2;
stencilState.count = 3;

console.log('  Flow: Proxy trap → queueMicrotask → VDOM diff → DOM patch');
console.log('');

// ─── 3. FAST-style: Observable Pub/Sub ──────────────────────

console.log('--- 3. FAST: Observable Pub/Sub ---');

class FASTObservable {
  constructor() {
    this._subscribers = new Map();
    this._tracking = null;
  }

  track(name) {
    if (this._tracking) {
      if (!this._subscribers.has(name)) {
        this._subscribers.set(name, new Set());
      }
      this._subscribers.get(name).add(this._tracking);
    }
  }

  notify(name) {
    const subs = this._subscribers.get(name);
    if (subs) {
      for (const sub of subs) {
        console.log(`  [FAST] notify → binding update for "${name}"`);
        sub();
      }
    }
  }
}

const fastObs = new FASTObservable();
let fastValue = 0;

fastObs._tracking = () => console.log(`  [FAST] binding re-evaluated: count=${fastValue}`);
fastObs.track('count');

fastValue = 1;
fastObs.notify('count');

fastValue = 2;
fastObs.notify('count');

console.log('  Flow: Observable.track → subscribe binding → notify → update specific DOM');
console.log('');

// ─── 4. Custom Signal-based ─────────────────────────────────

console.log('--- 4. Custom: Signal-based Reactivity ---');

const count = signal(0);
const doubled = computed(() => count() * 2);
const tripled = computed(() => count() * 3);

let effectRun = 0;
const effectLog = [];
effect(() => {
  effectRun++;
  const msg = `Effect #${effectRun}: count=${count()}, doubled=${doubled()}, tripled=${tripled()}`;
  effectLog.push(msg);
  console.log(`  [Signal] ${msg}`);
});

count.set(1);
count.set(2);
count.set(3);

console.log('');
console.log('  Flow: signal access → track dependency → signal set → notify → effect re-runs');
console.log('');

// ─── Advanced: untrack and batch ─────────────────────────────

console.log('--- Advanced: untrack & batch ---');

const a = signal(1);
const b = signal(2);

// untrack: read without subscribing
effect(() => {
  const tracked = a();
  const untracked = untrack(() => b());
  console.log(`  [untrack] tracked=${tracked}, untracked=${untracked}`);
});

// Changing b does NOT trigger the effect (untracked)
b.set(10);
console.log('  [untrack] b changed → effect NOT re-run (untracked)');

// Changing a triggers the effect (tracked)
a.set(100);
console.log('  [untrack] a changed → effect re-run (tracked)');

console.log('');
console.log('--- Summary ---');
console.log('');
console.log('  Lit:      Getter/Setter → microtask → full component re-render');
console.log('  Stencil:  Proxy trap → microtask → VDOM diff → targeted patch');
console.log('  FAST:     Observable.track/notify → specific binding update');
console.log('  Custom:   Signal → track dependencies → targeted effect re-run');
console.log('');
console.log('  Performance: FAST ≈ Custom > Stencil >> Lit');

console.log('\n✅ All reactivity systems compared');
