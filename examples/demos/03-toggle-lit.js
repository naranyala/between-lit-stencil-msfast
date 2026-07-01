// Demo 3: Toggle Switch with ElementInternals (Lit)
// Run: bun run examples/demos/03-toggle-lit.js

import { LitElement, html, css } from 'lit';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Demo 3: Toggle Switch with ElementInternals (Lit) ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §4 Demo 3: "ElementInternals"
// ═══════════════════════════════════════════════════════════════

class ToggleSwitch extends LitElement {
  static formAssociated = true;

  static styles = css`
    :host {
      display: inline-block;
      width: 48px;
      height: 24px;
      background: #ccc;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.3s;
    }
    :host(:state(checked)) {
      background: #4ade80;
    }
    .knob {
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s;
      margin: 2px;
    }
    :host(:state(checked)) .knob {
      transform: translateX(24px);
    }
  `;

  checked = false;
  internals = null;

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.internals.role = 'switch';
  }

  toggle() {
    this.checked = !this.checked;

    // Submit value natively when parent <form> is submitted
    this.internals.setFormValue(this.checked ? 'on' : null);

    // Update ARIA state for screen readers
    this.internals.ariaChecked = String(this.checked);

    // Expose CSS :state() pseudo-states
    if (this.checked) {
      this.internals.states.add('checked');
    } else {
      this.internals.states.delete('checked');
    }

    this.dispatchEvent(new CustomEvent('change', {
      detail: { checked: this.checked },
      bubbles: true,
    }));

    this.requestUpdate();
  }

  render() {
    return html`
      <div class="knob" @click=${() => this.toggle()}></div>
    `;
  }
}

customElements.define('toggle-switch', ToggleSwitch);

console.log('ToggleSwitch component defined');
console.log('');
console.log('Patterns used:');
console.log('  - static formAssociated = true → native form integration');
console.log('  - this.attachInternals() → ElementInternals API');
console.log('  - this.internals.setFormValue() → native form submission');
console.log('  - this.internals.ariaChecked → accessibility');
console.log('  - this.internals.states.add() → CSS :state() pseudo-class');
console.log('  - :host(:state(checked)) → native CSS styling');

console.log('\n✅ Toggle Switch (Lit) validated');
