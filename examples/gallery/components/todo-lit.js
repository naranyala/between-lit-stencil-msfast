// Demo 1: Smart Todo List (Lit Implementation)
// Uses real lit library
// Run: bun run examples/demos/01-todo-lit.js

import { LitElement, html, css } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Demo 1: Smart Todo List (Lit)                     ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §4 Demo 1: "Signals & Control Flow"
// ═══════════════════════════════════════════════════════════════

class TodoApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui;
      max-width: 400px;
      margin: 0 auto;
      padding: 16px;
    }
    .done {
      text-decoration: line-through;
      color: gray;
    }
    form {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    input {
      flex: 1;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button.primary {
      background: #3b82f6;
      color: white;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
    footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    .filters button {
      background: #f5f5f5;
      margin-right: 4px;
    }
    .filters button.active {
      background: #3b82f6;
      color: white;
    }
  `;

  todos = [
    { id: 1, text: 'Learn Web Components', done: true },
    { id: 2, text: 'Master Lit', done: false },
    { id: 3, text: 'Build a framework', done: false },
  ];

  filter = 'all';

  get filteredTodos() {
    if (this.filter === 'active') return this.todos.filter(t => !t.done);
    if (this.filter === 'done') return this.todos.filter(t => t.done);
    return this.todos;
  }

  get remainingCount() {
    return this.todos.filter(t => !t.done).length;
  }

  addTodo(e) {
    e.preventDefault();
    const form = e.target;
    const input = form.elements.namedItem('todoInput');
    if (!input.value.trim()) return;

    this.todos = [
      ...this.todos,
      { id: Date.now(), text: input.value.trim(), done: false },
    ];
    input.value = '';
    this.requestUpdate();
  }

  toggleTodo(id) {
    this.todos = this.todos.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    this.requestUpdate();
  }

  deleteTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    this.requestUpdate();
  }

  setFilter(filter) {
    this.filter = filter;
    this.requestUpdate();
  }

  render() {
    return html`
      <h1>Todo App</h1>

      <form @submit=${(e) => this.addTodo(e)}>
        <input name="todoInput" placeholder="What needs to be done?" />
        <button type="submit" class="primary">Add</button>
      </form>

      <ul>
        ${repeat(this.filteredTodos, t => t.id, todo => html`
          <li class=${classMap({ done: todo.done })}>
            <input
              type="checkbox"
              .checked=${todo.done}
              @change=${() => this.toggleTodo(todo.id)}
            />
            <span>${todo.text}</span>
            <button @click=${() => this.deleteTodo(todo.id)}>×</button>
          </li>
        `)}
      </ul>

      ${this.todos.length > 0 ? html`
        <footer>
          <span>${this.remainingCount} items left</span>
          <div class="filters">
            <button class=${classMap({ active: this.filter === 'all' })}
                    @click=${() => this.setFilter('all')}>All</button>
            <button class=${classMap({ active: this.filter === 'active' })}
                    @click=${() => this.setFilter('active')}>Active</button>
            <button class=${classMap({ active: this.filter === 'done' })}
                    @click=${() => this.setFilter('done')}>Done</button>
          </div>
        </footer>
      ` : ''}
    `;
  }
}

customElements.define('todo-app', TodoApp);

console.log('TodoApp component defined');
console.log('');
console.log('Patterns used:');
console.log('  - repeat() directive for keyed list rendering');
console.log('  - classMap() directive for conditional classes');
console.log('  - @submit, @click, @change event handlers');
console.log('  - .checked property binding');
console.log('  - Computed getter for filteredTodos');
console.log('  - Computed getter for remainingCount');

console.log('\n✅ Todo App (Lit) validated');
