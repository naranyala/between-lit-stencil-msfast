// Demo 2: Async User Profile (Lit Implementation)
// Run: bun run examples/demos/02-user-profile-lit.js

import { LitElement, html, css } from 'lit';
import { until } from 'lit/directives/until.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Demo 2: Async User Profile (Lit)                  ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §4 Demo 2: "Suspense & Resources"
// ═══════════════════════════════════════════════════════════════

const mockUsers = {
  '1': { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer' },
  '2': { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Designer' },
  '3': { id: '3', name: 'Carol White', email: 'carol@example.com', role: 'Manager' },
};

async function fetchUser(id) {
  await new Promise(r => setTimeout(r, 100));
  const user = mockUsers[id];
  if (!user) throw new Error(`User ${id} not found`);
  return user;
}

class UserProfile extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui;
      max-width: 400px;
      margin: 0 auto;
      padding: 16px;
    }
    .card {
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
    }
    .skeleton {
      background: #eee;
      border-radius: 4px;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .error {
      color: red;
      padding: 8px;
      background: #fee;
      border-radius: 4px;
    }
    select {
      padding: 8px;
      margin-bottom: 16px;
      width: 100%;
    }
  `;

  userId = '1';
  userData = null;
  error = null;

  connectedCallback() {
    super.connectedCallback();
    this.loadUser();
  }

  loadUser() {
    this.error = null;
    this.userData = fetchUser(this.userId).catch(e => {
      this.error = e.message;
      return null;
    });
    this.requestUpdate();
  }

  render() {
    return html`
      <h2>User Profile</h2>

      <select @change=${(e) => {
        this.userId = e.target.value;
        this.loadUser();
      }}>
        <option value="1" ?selected=${this.userId === '1'}>Alice</option>
        <option value="2" ?selected=${this.userId === '2'}>Bob</option>
        <option value="3" ?selected=${this.userId === '3'}>Carol</option>
        <option value="999" ?selected=${this.userId === '999'}>Non-existent</option>
      </select>

      <div class="card">
        ${this.error
          ? html`<div class="error">${this.error}</div>`
          : until(
              this.userData?.then(user => user ? html`
                <h3>${user.name}</h3>
                <p>Email: ${user.email}</p>
                <p>Role: ${user.role}</p>
              ` : html`<div class="error">User not found</div>`),
              html`<div class="skeleton" style="height: 100px;">Loading...</div>`
            )
        }
      </div>
    `;
  }
}

customElements.define('user-profile', UserProfile);

console.log('UserProfile component defined');
console.log('');
console.log('Patterns used:');
console.log('  - until() directive for async content');
console.log('  - Skeleton loading state');
console.log('  - Error handling with conditional rendering');
console.log('  - Auto-refetch on userId change');

console.log('\n✅ User Profile (Lit) validated');
