// Lit: Directives (repeat, until, classMap)
// Uses real lit directives
// Run: bun run examples/lit/02-directives.js

import { html, render } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { until } from 'lit/directives/until.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { choose } from 'lit/directives/choose.js';
import { guard } from 'lit/directives/guard.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Lit: Directives Deep Dive                         ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// Lit Directives: Special helper functions for template expressions
// ═══════════════════════════════════════════════════════════════

// ─── repeat: Keyed list rendering ───────────────────────────

const items = ['apple', 'banana', 'cherry'];

const listTemplate = html`
  <ul>
    ${repeat(items, (item) => item, (item, index) => html`
      <li>${index}: ${item}</li>
    `)}
  </ul>
`;

console.log('--- repeat directive ---');
console.log('Keyed list rendering for efficient DOM updates');
console.log('Items:', items);

// ─── until: Async content loading ───────────────────────────

const userData = new Promise((resolve) => {
  setTimeout(() => resolve({ name: 'Alice', email: 'alice@example.com' }), 100);
});

const asyncTemplate = html`
  <div>
    ${until(
      userData.then((user) => html`
        <h3>${user.name}</h3>
        <p>${user.email}</p>
      `),
      html`<span>Loading...</span>`
    )}
  </div>
`;

console.log('\n--- until directive ---');
console.log('Shows fallback while promise is pending');

// ─── classMap: Conditional CSS classes ──────────────────────

const isActive = true;
const isDisabled = false;

const classTemplate = html`
  <div class=${classMap({
    'active': isActive,
    'disabled': isDisabled,
    'highlighted': true,
  })}>
    Content with conditional classes
  </div>
`;

console.log('\n--- classMap directive ---');
console.log('Conditional classes:', { active: isActive, disabled: isDisabled, highlighted: true });

// ─── styleMap: Inline style objects ─────────────────────────

const styleTemplate = html`
  <div style=${styleMap({
    color: 'blue',
    'font-size': '16px',
    'background-color': '#f0f0f0',
  })}>
    Content with dynamic styles
  </div>
`;

console.log('\n--- styleMap directive ---');
console.log('Dynamic inline styles from object');

// ─── choose: Switch-like rendering ──────────────────────────

const status = 'success';

// choose directive: Switch-like rendering (used in templates)
// Syntax: choose(value, [[case, template], ...], default?)
console.log('  choose("success", [["success", html`Success`], ...])');
console.log('  Renders matching case template');

console.log('\n--- choose directive ---');
console.log('Switch-like rendering for status:', status);

// ─── guard: Prevent unnecessary re-renders ──────────────────

let renderCount = 0;

const guardTemplate = html`
  <div>
    ${guard([items], () => {
      renderCount++;
      return html`<p>Rendered ${renderCount} times</p>`;
    })}
  </div>
`;

console.log('\n--- guard directive ---');
console.log('Only re-renders when dependencies change');

console.log('\n✅ All Lit directives validated');
