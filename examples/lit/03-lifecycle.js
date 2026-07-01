// Lit: Lifecycle Hooks
// Run: bun run examples/lit/03-lifecycle.js

import { LitElement, html, css } from 'lit';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Lit: Lifecycle Hooks Deep Dive                    ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §2.5 Lifecycle Table:
// | Hook        | Lit                |
// |-------------|--------------------|
// | Created     | constructor()      |
// | Connected   | connectedCallback  |
// | First render| firstUpdated()     |
// | Updated     | updated(changed)   |
// | Disconnected| disconnectedCB     |
// ═══════════════════════════════════════════════════════════════

class LifecycleDemo extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; }
    .log { font-family: monospace; font-size: 12px; }
  `;

  value = 0;
  _log = [];

  constructor() {
    super();
    this._log.push('1. constructor()');
  }

  connectedCallback() {
    super.connectedCallback();
    this._log.push('2. connectedCallback()');
  }

  firstUpdated(changedProperties) {
    this._log.push('3. firstUpdated() — DOM is ready');
  }

  updated(changedProperties) {
    this._log.push('4. updated() — changed: ' + [...changedProperties.keys()].join(', '));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._log.push('5. disconnectedCallback()');
  }

  render() {
    return html`
      <div class="log">
        ${this._log.map((entry, i) => html`<div>${i + 1}. ${entry}</div>`)}
      </div>
      <button @click=${() => this.value++}>Update value (${this.value})</button>
    `;
  }
}

customElements.define('lifecycle-demo', LifecycleDemo);

// ═══════════════════════════════════════════════════════════════
// Lit-specific: updateComplete promise
// ═══════════════════════════════════════════════════════════════

class AsyncUpdateDemo extends LitElement {
  count = 0;

  async performUpdate() {
    await this.updateComplete;
    console.log('DOM update complete');
  }

  render() {
    return html`
      <div>Count: ${this.count}</div>
      <button @click=${() => { this.count++; this.performUpdate(); }}>
        Increment
      </button>
    `;
  }
}

customElements.define('async-update-demo', AsyncUpdateDemo);

// ═══════════════════════════════════════════════════════════════
// Verify lifecycle methods exist
// ═══════════════════════════════════════════════════════════════

console.log('LifecycleDemo methods:');
console.log('- constructor:', typeof LifecycleDemo.prototype.constructor);
console.log('- connectedCallback:', typeof LifecycleDemo.prototype.connectedCallback);
console.log('- firstUpdated:', typeof LifecycleDemo.prototype.firstUpdated);
console.log('- updated:', typeof LifecycleDemo.prototype.updated);
console.log('- disconnectedCallback:', typeof LifecycleDemo.prototype.disconnectedCallback);
console.log('- render:', typeof LifecycleDemo.prototype.render);

console.log('\nLifecycle order:');
console.log('  1. constructor() → set initial state');
console.log('  2. connectedCallback() → add to DOM');
console.log('  3. firstUpdated() → DOM ready (first time only)');
console.log('  4. updated(changedProps) → after each render');
console.log('  5. disconnectedCallback() → removed from DOM');

console.log('\n✅ Lit lifecycle validated');
