// Comparison: Template Rendering
// Lit Parts vs Stencil VDOM vs FAST Observable Bindings vs Custom Parts
// Run: bun run examples/comparisons/03-template-rendering.js

import { signal, computed, effect } from '../custom/signal.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Template Rendering: 4 Approaches Compared         ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §2.3 Template Rendering Deep Dive
// ═══════════════════════════════════════════════════════════════

// ─── 1. Lit: Part-based DOM (No VDOM) ───────────────────────

console.log('--- 1. Lit: Part-based DOM ---');
console.log('');
console.log('Template parsing:');
console.log('  html`<div>${expr}</div>`');
console.log('    → parse once → create <template> with comment markers');
console.log('    → create Part objects (NodePart, AttributePart, etc.)');
console.log('');
console.log('Update:');
console.log('  Only mutate the Part\'s node:');
console.log('    node.textContent = newValue  // NodePart');
console.log('    node.setAttribute(name, val) // AttributePart');
console.log('');
console.log('No diffing, no virtual tree');

// Simulate Lit Part system
class LitPart {
  constructor(node) {
    this.node = node;
    this.value = undefined;
  }

  update(value) {
    if (this.value !== value) {
      this.value = value;
      this.node.textContent = value;
      console.log(`  [Lit Part] Updated: "${value}"`);
    }
  }
}

const count = signal(0);
const part = new LitPart({ textContent: '' });

effect(() => {
  part.update(count());
});

count.set(1);
count.set(2);

console.log('');

// ─── 2. Stencil: Virtual DOM ────────────────────────────────

console.log('--- 2. Stencil: Virtual DOM ---');
console.log('');
console.log('Rendering pipeline:');
console.log('  JSX → virtual tree → diff with previous tree → patch real DOM');
console.log('');
console.log('Overhead:');
console.log('  - Creating virtual nodes on every render');
console.log('  - Diffing entire component tree');
console.log('  - Memory allocation for VDOM');

// Simulate VDOM diffing
class VNode {
  constructor(tag, props, children) {
    this.tag = tag;
    this.props = props;
    this.children = children;
  }
}

function h(tag, props, ...children) {
  return new VNode(tag, props || {}, children.flat());
}

function diff(oldTree, newTree) {
  const patches = [];

  if (!oldTree) {
    patches.push({ type: 'CREATE', vNode: newTree });
  } else if (oldTree.tag !== newTree.tag) {
    patches.push({ type: 'REPLACE', vNode: newTree });
  } else {
    for (const key of Object.keys({ ...oldTree.props, ...newTree.props })) {
      if (oldTree.props[key] !== newTree.props[key]) {
        patches.push({ type: 'PROPS', key, value: newTree.props[key] });
      }
    }
  }

  return patches;
}

const oldTree = h('div', { class: 'card' }, h('span', null, '0'));
const newTree = h('div', { class: 'card active' }, h('span', null, '1'));

const patches = diff(oldTree, newTree);
console.log('  VDOM diff result:');
patches.forEach((p, i) => console.log(`    ${i + 1}. ${p.type} ${p.key || ''}: ${p.value || ''}`));

console.log('');

// ─── 3. FAST: Observable Binding ─────────────────────────────

console.log('--- 3. FAST: Observable Binding ---');
console.log('');
console.log('Template:');
console.log('  html`<div>${x => x.count}</div>`');
console.log('');
console.log('Binding system:');
console.log('  Arrow function captures property access');
console.log('  Observable tracks: binding → count');
console.log('  On change: only this binding updates');
console.log('');
console.log('No diffing, no Part objects — direct node update');

// Simulate FAST binding
class FASTBinding {
  constructor(expression, targetNode) {
    this.expression = expression;
    this.targetNode = targetNode;
    this.value = undefined;
  }

  update(context) {
    const newValue = this.expression(context);
    if (this.value !== newValue) {
      this.value = newValue;
      this.targetNode.textContent = newValue;
      console.log(`  [FAST Binding] Updated: "${newValue}"`);
    }
  }
}

const countState = { count: 0 };
const binding = new FASTBinding((ctx) => `Count: ${ctx.count}`, { textContent: '' });

binding.update(countState);
countState.count = 1;
binding.update(countState);
countState.count = 2;
binding.update(countState);

console.log('');

// ─── 4. Custom: Signal-driven Parts ─────────────────────────

console.log('--- 4. Custom: Signal-driven Parts ---');
console.log('');
console.log('Template:');
console.log('  html`<div>${count}</div>`  // count is a signal');
console.log('');
console.log('Part update:');
console.log('  When signal changes, only this Part updates');
console.log('  No dependency tracking overhead');

class CustomPart {
  constructor(node) {
    this.node = node;
    this.value = undefined;
  }

  update(newValue) {
    if (this.value !== newValue) {
      this.value = newValue;
      this.node.textContent = newValue;
      console.log(`  [Custom Part] Updated: "${newValue}"`);
    }
  }
}

const customCount = signal(0);
const customPart = new CustomPart({ textContent: '' });

effect(() => {
  customPart.update(customCount());
});

customCount.set(1);
customCount.set(2);
customCount.set(3);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('Template Rendering Summary');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('  Lit:      Parse once → Part objects → direct DOM mutation');
console.log('  Stencil:  JSX → VDOM → diff → patch (overhead: VDOM creation + diffing)');
console.log('  FAST:     Arrow functions → Observable binding → direct DOM update');
console.log('  Custom:   Signals → Part tracking → direct DOM update');
console.log('');
console.log('  Performance: FAST ≈ Custom > Lit >> Stencil');
console.log('  Memory: Custom < Lit < FAST < Stencil (VDOM allocation)');

console.log('\n✅ All template rendering approaches compared');
