// Comparison: Lit vs Stencil vs FAST vs Custom
// Shows how each framework implements the same component
// Run: bun run examples/comparisons/01-counter-all-frameworks.js

import { LitElement, html, css } from 'lit';
import { signal, computed, effect } from '../../core/signal.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Counter Component: 4 Framework Comparison         ║');
console.log('║  Lit vs Stencil vs FAST vs Custom Signals          ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// Same component implemented in all 4 frameworks
// ═══════════════════════════════════════════════════════════════

// ─── 1. Lit Implementation ──────────────────────────────────

class LitCounter extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; }
    .count { font-size: 2rem; }
  `;

  label = 'Lit Counter';
  count = 0;

  increment() {
    this.count++;
  }

  render() {
    return html`
      <h3>${this.label}</h3>
      <div class="count">${this.count}</div>
      <button @click=${() => this.increment()}>+</button>
    `;
  }
}

customElements.define('lit-counter', LitCounter);

console.log('--- 1. Lit Implementation ---');
console.log('class LitCounter extends LitElement {');
console.log('  label = "Lit Counter";');
console.log('  count = 0;');
console.log('  render() { return html`...`; }');
console.log('}');
console.log('customElements.define("lit-counter", LitCounter);');
console.log('');

// ─── 2. Stencil Implementation (source pattern) ─────────────

console.log('--- 2. Stencil Implementation ---');
console.log('');
console.log('// @Component({ tag: "stencil-counter", shadow: true })');
console.log('// export class StencilCounter {');
console.log('//   @Prop() label: string = "Stencil Counter";');
console.log('//   @State() count: number = 0;');
console.log('//   @Event() countChanged: EventEmitter<number>;');
console.log('//');
console.log('//   render() { return <div>JSX</div>; }');
console.log('// }');
console.log('');
console.log('Stencil: JSX → Virtual DOM → Diff → Patch');
console.log('');

// ─── 3. FAST Implementation (source pattern) ────────────────

console.log('--- 3. FAST Implementation ---');
console.log('');
console.log('// class FASTCounter extends FASTElement {');
console.log('//   @attr label: string = "FAST Counter";');
console.log('//   count: number = 0;');
console.log('//');
console.log('//   increment() {');
console.log('//     this.count++;');
console.log('//     Observable.notify(this, "count");');
console.log('//   }');
console.log('// }');
console.log('');
console.log('// FASTCounter.define({');
console.log('//   name: "fast-counter",');
console.log('//   template: html`...`,');
console.log('//   styles: css`...`');
console.log('// });');
console.log('');
console.log('FAST: Observable.track/notify → targeted binding updates');
console.log('');

// ─── 4. Custom Signal-based Implementation ──────────────────

console.log('--- 4. Custom Signal Implementation ---');

const count = signal(0);
const doubled = computed(() => count() * 2);

let effectLog = [];
effect(() => {
  effectLog.push(`count=${count()}, doubled=${doubled()}`);
});

count.set(1);
count.set(2);
count.set(3);

console.log('const count = signal(0);');
console.log('const doubled = computed(() => count() * 2);');
console.log('');
console.log('effect(() => {');
console.log('  console.log(`count=${count()}, doubled=${doubled()}`);');
console.log('});');
console.log('');
console.log('Effect runs:');
effectLog.forEach((entry, i) => console.log(`  ${i + 1}. ${entry}`));
console.log('');

// ─── Comparison Summary ─────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════');
console.log('Comparison Summary');
console.log('═══════════════════════════════════════════════════════════\n');

const comparison = [
  ['Feature', 'Lit', 'Stencil', 'FAST', 'Custom'],
  ['Architecture', 'Runtime', 'Compiler', 'Runtime', 'Runtime'],
  ['Rendering', 'Tagged template', 'JSX/VDOM', 'Tagged template', 'Tagged template'],
  ['Reactivity', 'Getter/setter', 'Proxy', 'Observable', 'Signal'],
  ['Registration', 'customElements.define', '@Component', '.define()', 'customElements.define'],
  ['Styling', 'css`...`', 'CSS files', 'Design Tokens', 'css`...`'],
  ['Bundle', '~5KB', 'Varies', '~8KB', 'Minimal'],
];

for (const row of comparison) {
  console.log('  ' + row.map((cell, i) => cell.padEnd(i === 0 ? 14 : 18)).join(''));
}

console.log('\n✅ All 4 framework implementations compared');
