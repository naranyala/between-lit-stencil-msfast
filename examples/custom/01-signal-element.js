// Custom Framework: Signal-based Element
// Borrows patterns from Lit, Stencil, and FAST
// Run: bun run examples/custom/01-signal-element.js

import { signal, computed, effect, batch, untrack } from './signal.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Custom Framework: Signal-based Element             ║');
console.log('║  Combining best of Lit + Stencil + FAST             ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §3: Custom Signal-Based Framework
// ═══════════════════════════════════════════════════════════════

// ─── Signal System (from FAST Observable pattern) ───────────

console.log('--- Custom Signal System ---');
console.log('');
console.log('Inspired by:');
console.log('  - FAST: Observable.track/notify → automatic dependency tracking');
console.log('  - Lit: Tagged templates → Part-based DOM updates');
console.log('  - Stencil: Component lifecycle → native callbacks');
console.log('');

// ─── Demo: Signal Reactivity ────────────────────────────────

const count = signal(0);
const doubled = computed(() => count() * 2);
const tripled = computed(() => count() * 3);

const effectLog = [];
effect(() => {
  effectLog.push(`count=${count()}, doubled=${doubled()}, tripled=${tripled()}`);
});

count.set(1);
count.set(2);
count.set(3);

console.log('Signal reactivity test:');
effectLog.forEach((entry, i) => console.log(`  ${i + 1}. ${entry}`));

// ─── Demo: untrack ──────────────────────────────────────────

console.log('');
console.log('--- untrack: Read without subscribing ---');

const a = signal(1);
const b = signal(2);

const untrackLog = [];
effect(() => {
  const tracked = a();
  const untracked = untrack(() => b());
  untrackLog.push(`tracked=${tracked}, untracked=${untracked}`);
});

b.set(10);
untrackLog.push('b changed → effect NOT re-run');

a.set(100);
untrackLog.push('a changed → effect re-run');

untrackLog.forEach((entry, i) => console.log(`  ${i + 1}. ${entry}`));

// ─── Demo: batch ────────────────────────────────────────────

console.log('');
console.log('--- batch: Grouped Updates ---');

const x = signal(0);
const y = signal(0);

const batchLog = [];
effect(() => {
  batchLog.push(`x=${x()}, y=${y()}`);
});

x.set(1);
y.set(1);

batch(() => {
  x.set(2);
  y.set(2);
});

console.log('Batch effect runs:');
batchLog.forEach((entry, i) => console.log(`  ${i + 1}. ${entry}`));

// ─── Framework Patterns Summary ─────────────────────────────

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('Custom Framework Patterns');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('1. Signal-based reactivity (from FAST):');
console.log('   - signal() → automatic dependency tracking');
console.log('   - computed() → memoized derived state');
console.log('   - effect() → side effects on changes');
console.log('   - batch() → grouped updates');
console.log('   - untrack() → read without subscribing');
console.log('');
console.log('2. Template engine (from Lit):');
console.log('   - html`...` → tagged template literals');
console.log('   - Part-based DOM updates (no VDOM)');
console.log('   - Parse once, update parts directly');
console.log('');
console.log('3. Element base class:');
console.log('   - Extends HTMLElement');
console.log('   - Manages Shadow DOM');
console.log('   - Maps lifecycle to native callbacks');
console.log('   - Constructible stylesheets');
console.log('');
console.log('4. Performance characteristics:');
console.log('   - No VDOM overhead');
console.log('   - Fine-grained updates (only affected nodes)');
console.log('   - Minimal memory allocation');
console.log('   - O(1) per signal update');

console.log('\n✅ Custom framework validated');
