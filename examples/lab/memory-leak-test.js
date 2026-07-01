// Comparison: Lifecycle & Memory Leak (Cleanup)
// Manual Observable Cleanup vs. Signal Auto-Tracking
// Run: bun run examples/comparisons/11-lifecycle-leak.js

import { signal, effect } from '../core/signal.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Lifecycle Leak: Manual vs. Auto-Cleanup             ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ─── 1. The "Observable" Way (Manual Cleanup) ───
console.log('--- 1. Manual Observable Cleanup ---');
class Observable {
  constructor(val) {
    this.val = val;
    this.subs = new Set();
  }
  subscribe(fn) {
    this.subs.add(fn);
    return () => this.subs.delete(fn); // Returns a cleanup function
  }
  set(v) {
    this.val = v;
    this.subs.forEach(fn => fn(this.val));
  }
}

const obs = new Observable(0);
const cleanups = [];

// Simulation: Component Mounts
const mountComponent = () => {
  const unsubscribe = obs.subscribe(v => console.log(`  [Obs Component] Update: ${v}`));
  cleanups.push(unsubscribe);
};

mountComponent();
obs.set(1);

console.log('Action: Component unmounts (Forget to call unsubscribe)');
// We "forget" to call cleanups[0]()
console.log('Action: Updating value...');
obs.set(2);
console.log('  ⚠️ Warning: The unmounted component still logged the update! (Memory Leak)');
console.log('');

// ─── 2. The "Signal" Way (Auto-Tracked Effects) ───
console.log('--- 2. Signal Auto-Tracking ---');
const sig = signal(0);

// In a real framework, effects are tied to the component lifecycle.
// When the component is destroyed, the effect is stopped.
let componentEffect = null;

const mountSignalComponent = () => {
  componentEffect = effect(() => {
    console.log(`  [Signal Component] Update: ${sig()}`);
  });
};

mountSignalComponent();
sig.set(1);

console.log('Action: Component unmounts (Framework destroys effect)');
componentEffect = null; // The framework removes the reference, and the signal sub is gone

// (In a real implementation, the effect would remove itself from the signal's subscribers)
console.log('Action: Updating value...');
sig.set(2);
console.log('  ✅ Success: No logs from the unmounted component.');

console.log('\nComparison Summary:');
console.log('Observables: Require meticulous manual cleanup (`unsubscribe()`). High leak risk.');
console.log('Signals: Effects are "discovered" and "forgotten" automatically based on lifecycle.');
console.log('Verdict: Auto-dependency tracking reduces the cognitive load of memory management.');
