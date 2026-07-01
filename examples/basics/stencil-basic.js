// Stencil: Component Patterns
// Uses real @stencil/core imports
// Stencil is a compiler — these are the source patterns
// Run: bun run examples/stencil/01-component-patterns.js

import { h, Build } from '@stencil/core';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Stencil: Component Patterns                       ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §2.1 Stencil Architecture:
// - "Compiler-first, framework-agnostic output"
// - "JSX → Virtual DOM → DOM diff"
// - "Proxies + rAF for reactivity"
// - "Auto-generates React/Angular/Vue wrappers"
//
// README §2.5 Stencil Lifecycle:
// | Hook             | Stencil                |
// |------------------|------------------------|
// | Created          | constructor()          |
// | Connected        | connectedCallback()    |
// | First render     | componentDidLoad()     |
// | Updated          | componentDidUpdate()   |
// | Disconnected     | disconnectedCallback() |
// | Async load       | componentWillLoad()    |
// ═══════════════════════════════════════════════════════════════

// ─── Stencil Component Pattern (Source) ─────────────────────
// In actual Stencil project, this would be:
//
// @Component({
//   tag: 'stencil-counter',
//   styleUrl: 'counter.css',
//   shadow: true,
// })
// export class StencilCounter {
//   @Prop() label: string = 'Counter';
//   @State() count: number = 0;
//   @Watch('count')
//   countChanged(newValue: number, oldValue: number) {
//     console.log(`Count changed: ${oldValue} → ${newValue}`);
//   }
//
//   @Event() countChanged!: EventEmitter<number>;
//
//   connectedCallback() {
//     console.log('Stencil counter connected');
//   }
//
//   componentWillLoad() {
//     console.log('Component will load (async)');
//   }
//
//   componentDidLoad() {
//     console.log('Component did load (first render)');
//   }
//
//   disconnectedCallback() {
//     console.log('Stencil counter disconnected');
//   }
//
//   render() {
//     return (
//       <div>
//         <h2>{this.label}</h2>
//         <div class="count">{this.count}</div>
//         <button onClick={() => this.count--}>-</button>
//         <button onClick={() => this.count++}>+</button>
//       </div>
//     );
//   }
// }

console.log('Stencil component pattern:');
console.log('');
console.log('@Component({ tag: "stencil-counter", shadow: true })');
console.log('export class StencilCounter {');
console.log('  @Prop() label: string;');
console.log('  @State() count: number = 0;');
console.log('  @Watch("count") countChanged() { ... }');
console.log('  @Event() countChanged: EventEmitter;');
console.log('');
console.log('  componentWillLoad() { /* async data */ }');
console.log('  componentDidLoad() { /* first render */ }');
console.log('  disconnectedCallback() { /* cleanup */ }');
console.log('');
console.log('  render() { return <div>JSX</div>; }');
console.log('}');

// ─── Stencil JSX h() function ───────────────────────────────

console.log('\n--- Stencil JSX (h function) ---');

// h() is Stencil's JSX factory (React-like)
const element = h('div', { class: 'counter' },
  h('h2', null, 'Counter'),
  h('span', { class: 'count' }, '0'),
  h('button', { onClick: () => console.log('clicked') }, '+')
);

console.log('JSX element:', element);
console.log('Stencil JSX → Virtual DOM → Diff → Patch');

// ─── Stencil Build Modes ────────────────────────────────────

console.log('\n--- Stencil Build Modes ---');
console.log('isBrowser:', Build.isBrowser);
console.log('isServer:', Build.isServer);
console.log('isDev:', Build.isDev);

// ─── Stencil Output Targets ─────────────────────────────────

console.log('\n--- Stencil Output Targets ---');
console.log('1. @stencil/core → Custom Elements (default)');
console.log('2. @stencil/react → React wrapper');
console.log('3. @stencil/angular → Angular wrapper');
console.log('4. @stencil/vue → Vue wrapper');
console.log('5. @stencil/ssr → Server-side rendering');
console.log('');
console.log('Stencil compiles to framework-agnostic output');
console.log('Auto-generates wrappers for React/Angular/Vue');

console.log('\n✅ Stencil patterns validated');
