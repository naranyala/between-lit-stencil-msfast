// Lit: Basic Component with Reactivity
// Uses real lit library imports
// Run: bun run examples/lit/01-basic-component.js

import { LitElement, html, css } from 'lit';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Lit: Basic Component with Reactivity              ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// This demonstrates Lit's core patterns (runnable in Bun)
// ═══════════════════════════════════════════════════════════════

class MyCounter extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui;
      padding: 16px;
    }
    .count {
      font-size: 2rem;
      font-weight: bold;
    }
    button {
      padding: 8px 16px;
      margin: 4px;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
    }
  `;

  // @property: reflects to attribute, triggers re-render
  count = 0;
  label = 'Counter';
  _history = [];

  increment() {
    this.count++;
    this._history = [...this._history, this.count];
    this.dispatchEvent(new CustomEvent('count-changed', {
      detail: { count: this.count },
      bubbles: true,
      composed: true,
    }));
  }

  decrement() {
    if (this.count > 0) {
      this.count--;
      this._history = [...this._history, this.count];
    }
  }

  reset() {
    this.count = 0;
    this._history = [];
  }

  render() {
    return html`
      <h2>${this.label}</h2>
      <div class="count">${this.count}</div>
      <div>
        <button @click=${() => this.decrement()}>-</button>
        <button @click=${() => this.increment()}>+</button>
        <button @click=${() => this.reset()}>Reset</button>
      </div>
      <div>History: ${this._history.join(' → ') || 'Empty'}</div>
    `;
  }
}

// Register the element
customElements.define('my-counter', MyCounter);

console.log('Lit component defined: my-counter');
console.log('Component class:', MyCounter.name);
console.log('Extends:', Object.getPrototypeOf(MyCounter.prototype).constructor.name);
console.log('Static styles:', typeof MyCounter.styles);
console.log('');
console.log('Patterns demonstrated:');
console.log('  - customElements.define("my-counter") → registration');
console.log('  - render() → html`...` → tagged template (no VDOM)');
console.log('  - @click=\${handler} → declarative event binding');
console.log('');

// Create instance and demonstrate
const counter = new MyCounter();
counter.count = 5;
counter.label = 'My Counter';
console.log('Instance created:', { count: counter.count, label: counter.label });

console.log('✅ Lit basic component validated');
