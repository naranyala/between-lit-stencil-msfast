// Comparison: Lifecycle & Events
// Run: bun run examples/comparisons/05-lifecycle-events.js

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Lifecycle & Events: Framework Comparison          ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §2.5 Lifecycle Table & §2.6 Event System
// ═══════════════════════════════════════════════════════════════

console.log('--- Lifecycle Hooks ---\n');

console.log('Lit Lifecycle:');
console.log('  constructor()           → set initial state');
console.log('  connectedCallback()     → add to DOM, setup');
console.log('  firstUpdated()          → DOM ready (first time only)');
console.log('  updated(changedProps)   → after each render');
console.log('  disconnectedCallback()  → cleanup');
console.log('  updateComplete          → Promise for render completion');
console.log('');

console.log('Stencil Lifecycle:');
console.log('  constructor()           → set initial state');
console.log('  connectedCallback()     → add to DOM');
console.log('  componentWillLoad()    → async data fetching (returns Promise)');
console.log('  componentDidLoad()      → first render complete');
console.log('  componentDidUpdate()   → after re-render');
console.log('  disconnectedCallback()  → cleanup');
console.log('');

console.log('FAST Lifecycle:');
console.log('  constructor()           → set initial state');
console.log('  connectedCallback()     → add to DOM');
console.log('  *Changed() methods      → per-property change handlers');
console.log('  disconnectedCallback()  → cleanup');
console.log('  adoptedCallback()       → moved to new document');
console.log('');

console.log('Custom Signal Lifecycle:');
console.log('  constructor()           → set initial state');
console.log('  connectedCallback()     → add to DOM, start effects');
console.log('  disconnectedCallback()  → cleanup effects');

console.log('');

console.log('--- Event System ---\n');

// Lit-style events
class LitEmitter {
  emit(name, detail) {
    const event = new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    });
    console.log(`  [Lit] dispatchEvent("${name}", ${JSON.stringify(detail)})`);
    return event;
  }
}

// Stencil-style events
class StencilEmitter {
  event(name, options = {}) {
    return {
      emit: (detail) => {
        console.log(`  [Stencil] @Event("${name}") emit(${JSON.stringify(detail)})`);
        console.log(`    bubbles: ${options.bubbles !== false}, composed: ${options.composed !== false}`);
      },
    };
  }
}

// FAST-style events
class FASTEmitter {
  $emit(name, detail, options = {}) {
    console.log(`  [FAST] $emit("${name}", ${JSON.stringify(detail)})`);
    console.log(`    auto-bubble: true, auto-preventDefault: true`);
  }
}

const lit = new LitEmitter();
const stencil = new StencilEmitter();
const fast = new FASTEmitter();

console.log('Lit Events:');
lit.emit('select', { id: 42 });
console.log('  Listen: @click="${handler}" in template');
console.log('  Bubble: Manual (bubbles: true)');
console.log('');

const selectEvent = stencil.event('select', { bubbles: true });
console.log('Stencil Events:');
selectEvent.emit({ id: 42 });
console.log('  Listen: @Listen("click") decorator');
console.log('  Bubble: Configurable via decorator');
console.log('');

console.log('FAST Events:');
fast.$emit('select', { id: 42 });
console.log('  Listen: @click="${x => x.handler()}" in template');
console.log('  Bubble: Automatic');
console.log('  PreventDefault: Automatic (opt-out: return true)');

console.log('');

console.log('Custom Signal Events:');
console.log('  Emit: element.dispatchEvent(new CustomEvent(...))');
console.log('  Listen: @click="${handler}" in template');
console.log('  Use signals for state, native events for communication');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('Summary');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('  Lifecycle: All follow native Custom Element callbacks');
console.log('  Events: Lit = manual, Stencil = decorator, FAST = automatic');
console.log('  DX: FAST > Lit > Stencil');
console.log('  Control: Stencil > Lit > FAST');

console.log('\n✅ Lifecycle & events compared');
