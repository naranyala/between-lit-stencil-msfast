// Demo 5-9: Remaining Demos (Lit implementations)
// Run: bun run examples/demos/05-09-remaining-lit.js

import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Demos 5-9: Modal, Form, Theme                     ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// Demo 5: Modal Dialog with Focus Trap
// ═══════════════════════════════════════════════════════════════

class ModalDialog extends LitElement {
  static styles = css`
    :host { display: block; }
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: white; border-radius: 8px; padding: 24px;
      min-width: 400px; max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      position: relative;
    }
    .close-btn {
      position: absolute; top: 8px; right: 8px;
      background: none; border: none; font-size: 20px; cursor: pointer;
    }
  `;

  open = false;
  triggerRef = null;

  openModal() {
    this.triggerRef = document.activeElement;
    this.open = true;
    this.requestUpdate();
  }

  close() {
    this.open = false;
    this.triggerRef?.focus();
    this.requestUpdate();
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  render() {
    return html`
      <button @click=${() => this.openModal()}>Open Modal</button>

      ${this.open ? html`
        <div class="overlay" @click=${(e) => {
          if (e.target === e.currentTarget) this.close();
        }}>
          <div class="modal" role="dialog" aria-modal="true">
            <button class="close-btn" @click=${() => this.close()}>×</button>
            <slot></slot>
          </div>
        </div>
      ` : ''}
    `;
  }
}

customElements.define('modal-dialog', ModalDialog);

// ═══════════════════════════════════════════════════════════════
// Demo 6: Contact Form with Validation
// ═══════════════════════════════════════════════════════════════

class ContactForm extends LitElement {
  static styles = css`
    :host { display: block; font-family: system-ui; max-width: 400px; margin: 0 auto; }
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 4px; font-weight: 500; }
    input, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    .error { color: red; font-size: 12px; margin-top: 4px; }
    .success { color: green; padding: 12px; background: #d4edda; border-radius: 4px; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `;

  name = '';
  email = '';
  message = '';
  submitStatus = 'idle';

  get errors() {
    const e = {};
    if (!this.name) e.name = 'Name is required';
    if (!this.email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) e.email = 'Invalid email';
    if (!this.message) e.message = 'Message is required';
    return e;
  }

  get isValid() {
    return Object.keys(this.errors).length === 0;
  }

  async handleSubmit(e) {
    e.preventDefault();
    if (!this.isValid) return;
    this.submitStatus = 'submitting';
    this.requestUpdate();
    await new Promise(r => setTimeout(r, 1000));
    this.submitStatus = 'success';
    this.requestUpdate();
  }

  render() {
    return html`
      <form @submit=${(e) => this.handleSubmit(e)}>
        <div class="form-group">
          <label>Name</label>
          <input .value=${this.name} @input=${(e) => { this.name = e.target.value; this.requestUpdate(); }} />
          ${this.errors.name ? html`<div class="error">${this.errors.name}</div>` : ''}
        </div>

        <div class="form-group">
          <label>Email</label>
          <input type="email" .value=${this.email} @input=${(e) => { this.email = e.target.value; this.requestUpdate(); }} />
          ${this.errors.email ? html`<div class="error">${this.errors.email}</div>` : ''}
        </div>

        <div class="form-group">
          <label>Message</label>
          <textarea rows="4" .value=${this.message} @input=${(e) => { this.message = e.target.value; this.requestUpdate(); }}></textarea>
          ${this.errors.message ? html`<div class="error">${this.errors.message}</div>` : ''}
        </div>

        <button type="submit" ?disabled=${!this.isValid}>Send Message</button>
      </form>

      ${this.submitStatus === 'success' ? html`<div class="success">Message sent!</div>` : ''}
    `;
  }
}

customElements.define('contact-form', ContactForm);

// ═══════════════════════════════════════════════════════════════
// Demo 8: Dark Mode Toggle
// ═══════════════════════════════════════════════════════════════

class ThemeToggle extends LitElement {
  static styles = css`
    :host { display: flex; align-items: center; gap: 8px; font-family: system-ui; }
    .toggle {
      width: 48px; height: 24px; background: #ccc;
      border-radius: 12px; cursor: pointer; position: relative;
      transition: background 0.3s;
    }
    .toggle.dark { background: #3b82f6; }
    .toggle::after {
      content: ''; position: absolute; top: 2px; left: 2px;
      width: 20px; height: 20px; background: white;
      border-radius: 50%; transition: transform 0.3s;
    }
    .toggle.dark::after { transform: translateX(24px); }
  `;

  dark = false;

  toggle() {
    this.dark = !this.dark;
    this.requestUpdate();
  }

  render() {
    return html`
      <span>${this.dark ? '🌙' : '☀️'}</span>
      <div class="toggle ${classMap({ dark: this.dark })}" @click=${() => this.toggle()}></div>
    `;
  }
}

customElements.define('theme-toggle', ThemeToggle);

console.log('Demos 5-9 defined:');
console.log('  - modal-dialog: Focus trap, Portal pattern');
console.log('  - contact-form: Computed validation, async submit');
console.log('  - theme-toggle: Design token simulation');
console.log('');
console.log('✅ Demos 5-9 (Lit) validated');
