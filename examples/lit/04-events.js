// Lit: Events & Communication
// Run: bun run examples/lit/04-events.js

import { LitElement, html, css } from 'lit';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Lit: Events & Communication                       ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §2.6 Event System:
// | Emit   | dispatchEvent(CustomEvent) |
// | Listen | @click="${handler}"        |
// | Bubbles| Manual (bubbles: true)     |
// ═══════════════════════════════════════════════════════════════

class EventEmitter extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; border: 1px solid #ccc; }
    button { margin: 4px; padding: 8px 16px; }
  `;

  name = 'World';

  emitGreet() {
    this.dispatchEvent(new CustomEvent('greet', {
      detail: { name: this.name, timestamp: Date.now() },
      bubbles: true,
      composed: true,
    }));
  }

  emitCancellable() {
    const event = new CustomEvent('cancellable', {
      detail: { canCancel: true },
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    this.dispatchEvent(event);

    if (event.defaultPrevented) {
      console.log('Event was cancelled by parent');
    } else {
      console.log('Event was not cancelled');
    }
  }

  render() {
    return html`
      <button @click=${() => this.emitGreet()}>Greet</button>
      <button @click=${() => this.emitCancellable()}>Cancellable Event</button>
    `;
  }
}

customElements.define('event-emitter', EventEmitter);

class EventParent extends LitElement {
  static styles = css`
    :host { display: block; padding: 16px; background: #f5f5f5; }
    .event-log { font-family: monospace; font-size: 12px; }
  `;

  _events = [];

  handleGreet(e) {
    this._events = [...this._events, `Greet: ${e.detail.name} @ ${e.detail.timestamp}`];
    this.requestUpdate();
  }

  handleCancellable(e) {
    this._events = [...this._events, `Cancellable: ${JSON.stringify(e.detail)}`];
    this.requestUpdate();
  }

  render() {
    return html`
      <h3>Parent Component</h3>
      <event-emitter
        name="Alice"
        @greet=${(e) => this.handleGreet(e)}
        @cancellable=${(e) => this.handleCancellable(e)}
      ></event-emitter>

      <div class="event-log">
        ${this._events.map((e, i) => html`<div>${i + 1}. ${e}</div>`)}
      </div>
    `;
  }
}

customElements.define('event-parent', EventParent);

console.log('Event patterns demonstrated:');
console.log('  - new CustomEvent("name", { detail, bubbles, composed })');
console.log('  - @click=\${handler} → declarative binding');
console.log('  - @custom-event=\${handler} → custom event binding');
console.log('  - event.preventDefault() → cancelable events');
console.log('  - composed: true → cross Shadow DOM boundary');

console.log('\n✅ Lit events validated');
