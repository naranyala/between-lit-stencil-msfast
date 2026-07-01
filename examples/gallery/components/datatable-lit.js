// Demo 4: Data Table with Sorting & Filtering (Lit)
// Run: bun run examples/demos/04-datatable-lit.js

import { LitElement, html, css } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Demo 4: Data Table with Sorting & Filtering (Lit) ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

class DataTable extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui;
      max-width: 600px;
      margin: 0 auto;
      padding: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      cursor: pointer;
      user-select: none;
    }
    th:hover {
      background: #f5f5f5;
    }
    .sort-icon::after {
      content: '↕';
      margin-left: 4px;
      opacity: 0.3;
    }
    .sort-active::after {
      opacity: 1;
    }
    input {
      margin-bottom: 8px;
      padding: 6px;
      width: 100%;
      box-sizing: border-box;
    }
  `;

  data = [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Engineer' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'Designer' },
    { id: 3, name: 'Carol', email: 'carol@example.com', role: 'Manager' },
    { id: 4, name: 'David', email: 'david@example.com', role: 'Engineer' },
    { id: 5, name: 'Eve', email: 'eve@example.com', role: 'Designer' },
  ];

  sortKey = 'name';
  sortDir = 'asc';
  searchQuery = '';

  get processedData() {
    let result = this.data;

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }

    const dir = this.sortDir === 'asc' ? 1 : -1;
    return [...result].sort((a, b) =>
      (a[this.sortKey] > b[this.sortKey] ? dir : -dir)
    );
  }

  sortBy(key) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.requestUpdate();
  }

  render() {
    return html`
      <input
        placeholder="Search..."
        .value=${this.searchQuery}
        @input=${(e) => {
          this.searchQuery = e.target.value;
          this.requestUpdate();
        }}
      />

      <table>
        <thead>
          <tr>
            ${['name', 'email', 'role'].map(key => html`
              <th class=${classMap({
                'sort-icon': true,
                'sort-active': this.sortKey === key,
              })} @click=${() => this.sortBy(key)}>
                ${key.charAt(0).toUpperCase() + key.slice(1)}
              </th>
            `)}
          </tr>
        </thead>
        <tbody>
          ${repeat(this.processedData, r => r.id, row => html`
            <tr>
              <td>${row.name}</td>
              <td>${row.email}</td>
              <td>${row.role}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

customElements.define('data-table', DataTable);

console.log('DataTable component defined');
console.log('');
console.log('Patterns used:');
console.log('  - Computed getter for processedData (filter + sort)');
console.log('  - repeat() directive for keyed list rendering');
console.log('  - classMap() for sort indicator styling');
console.log('  - .value property binding for input');
console.log('  - @input event handler for search');

console.log('\n✅ Data Table (Lit) validated');
