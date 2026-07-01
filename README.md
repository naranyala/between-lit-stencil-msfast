# Architecting Browser-Native Web Components: From Frameworks to Custom Abstractions

A comprehensive study of **Lit**, **Stencil**, and **FAST** — and an architectural guide for building your own modern, signal-based Web Component framework.

---

## Part 1: The Framework Landscape

While native Web Components (Custom Elements, Shadow DOM, HTML Templates) are supported in all modern browsers, using them via vanilla JavaScript can be verbose. Frameworks solve this by providing reactivity, templating, and styling abstractions.

### 1.1 High-Level Comparison

| | **Lit** | **Stencil** | **FAST** |
|---|---------|-------------|----------|
| **Maintainer** | Google / OpenJS | Ionic | Microsoft |
| **Architecture** | Runtime library | Compiler | Runtime library |
| **Rendering** | Tagged templates (no VDOM) | JSX (VDOM) | Tagged templates (no VDOM) |
| **Reactivity** | Property accessors + microtask | Proxies + rAF | Observables + task queue |
| **Bundle Size** | ~5KB (Tiny) | Varies (compiled) | ~8KB (Small) |
| **Best For** | Simplicity, standalone UI | Multi-framework design systems | Adaptive theming, enterprise |

**Design Validation:** These claims are verified via our architectural testing suite in `examples/lab/design-assertions.js`, which simulates the internal update cycles of each framework.


### 1.2 Framework Profiles

**Lit (by Google)**
*   **Approach:** A thin runtime wrapper staying "close to the metal." Extends `HTMLElement` via `LitElement`.
*   **Pros:** Tiny bundle, standards-aligned, massive adoption (Google, Adobe, Microsoft).
*   **Cons:** No built-in SSG/routing, less "magic" than full frameworks.

**Stencil (by Ionic)**
*   **Approach:** A build-time compiler. Developers write TypeScript + JSX, which compiles to optimized vanilla Custom Elements.
*   **Pros:** Familiar DX (JSX), framework-agnostic output, built-in tooling, auto-generates React/Angular wrappers.
*   **Cons:** Compiler dependency, VDOM overhead, not drop-in via `<script>`.

**FAST (by Microsoft)**
*   **Approach:** A runtime library heavily focused on performance and **Adaptive UI**.
*   **Pros:** Adaptive theming, fastest raw performance, enterprise-grade tokens.
*   **Cons:** Smaller ecosystem, steeper learning curve.

---

## Part 2: Framework Deep Dive (Lit, Stencil, FAST)

Understanding how these three frameworks solve Web Component challenges provides the foundation for building your own abstraction.

### 2.1 Architecture Overview

| | **Lit** | **Stencil** | **FAST** |
|---|---------|-------------|----------|
| **Core Philosophy** | Thin runtime, close to metal | Compiler-first, framework-agnostic output | Performance + Adaptive UI |
| **Base Class** | `LitElement` extends `HTMLElement` | None (compiler transforms) | `FASTElement` extends `HTMLElement` |
| **Registration** | `@customElement('name')` or manual | Auto via `@Component` | `MyEl.define({name, template, styles})` |
| **Rendering** | Tagged templates → Part-based DOM | JSX → Virtual DOM → DOM diff | Tagged templates → Observable bindings |
| **Reactivity** | Getter/setter + microtask batch | Proxies + rAF | Observable pub/sub + task queue |
| **Styling** | `css` tag + constructible stylesheets | External CSS files + scoped fallback | `css` tag + Design Tokens |
| **SSR** | Experimental (`@lit-labs/ssr`) | Built-in pre-rendering | Supported |
| **DI/Context** | `@lit/context` (event-based) | None (use mixins) | Built-in DI container |
| **Framework Wrappers** | `@lit/react` (manual) | Auto-generated (React/Angular/Vue) | Framework-agnostic by default |

### 2.2 Reactivity Deep Dive

**Lit — Getter/Setter Interception:**
```
Property change → setter called → requestUpdate() → microtask → performUpdate()
```
- Creates accessor descriptors on prototype
- Batches multiple changes into single microtask
- Shallow equality by default, customizable via `hasChanged`
- No deep observation (immutable updates required)

**Stencil — Proxy-based:**
```
State mutation → Proxy trap → queueMicrotask → VDOM diff → DOM patch
```
- Wraps `@State()` in ES6 Proxies
- Detects array mutations (push, splice) automatically
- Uses `requestAnimationFrame` for render scheduling
- Supports `@Watch()` for side effects on property changes

**FAST — Observable Pub/Sub:**
```
Property access → Observable.track() → subscribe binding
Property change → Observable.notify() → update specific DOM node
```
- Tracks exact dependency graph per binding
- Updates only the DOM nodes that depend on changed property
- No component-wide re-renders
- Array observation via splice records

### 2.3 Template Rendering Deep Dive

**Lit — Part-based (No VDOM):**
```
html`<div>${expr}</div>` → parse once → create Part objects → update Part values
```
- Parses template into `<template>` with comment markers
- Creates `NodePart`, `AttributePart`, `BooleanPart` etc.
- On update: only mutate the Part's node (e.g., `node.textContent = value`)
- No diffing, no virtual tree

**Stencil — Virtual DOM:**
```
JSX → virtual tree → diff with previous tree → patch real DOM
```
- Familiar React-like mental model
- Async rendering via `requestAnimationFrame`
- Supports `key` prop for list diffing
- Overhead: creating/updating virtual nodes

**FAST — Direct Observable Binding:**
```
html`<div>${x => x.count}</div>` → ViewTemplate → Binding → DOM node
```
- Arrow functions capture property access
- Observable system tracks which bindings depend on which properties
- On property change: only affected bindings update
- Fastest theoretical approach (no diffing, no Part objects)

### 2.4 Styling Deep Dive

**Lit:**
```
static styles = css`...` → new CSSStyleSheet() → adoptedStyleSheets
```
- Native constructible stylesheets (no `<style>` injection)
- Shared across component instances
- Composable via array: `static styles = [base, theme, specific]`

**Stencil:**
```
@Component({ styleUrl, styleUrls, styles, scoped, shadow })
```
- External CSS files processed by compiler
- Scoped CSS via data attributes (no Shadow DOM required)
- Shadow DOM optional (fallback to scoped)

**FAST:**
```
DesignToken.create('name').withDefault(value) → CSS custom properties
```
- Tokens are reactive signals mapped to `--css-var`
- Changing token value updates all usages automatically
- Supports complex calculations (e.g., derived colors)

### 2.5 Lifecycle Deep Dive

| Hook | Lit | Stencil | FAST |
|------|-----|---------|------|
| Created | `constructor()` | `constructor()` | `constructor()` |
| Connected | `connectedCallback()` | `connectedCallback()` | `connectedCallback()` |
| First render | `firstUpdated()` | `componentDidLoad()` | Automatic |
| Updated | `updated(changedProps)` | `componentDidUpdate()` | `*Changed()` per property |
| Disconnected | `disconnectedCallback()` | `disconnectedCallback()` | `disconnectedCallback()` |
| Adopted | — | — | `adoptedCallback()` |
| Async load | — | `componentWillLoad()` | — |

**Lit** provides a robust lifecycle with `changedProps` map. **Stencil** mirrors React class component lifecycle. **FAST** prefers thin native callbacks + property-specific `*Changed()` methods.

### 2.6 Event System Deep Dive

| | Lit | Stencil | FAST |
|---|-----|---------|------|
| **Emit** | `this.dispatchEvent(new CustomEvent(...))` | `@Event() this.event.emit()` | `this.$emit('name', detail)` |
| **Listen** | `@click="${handler}"` in template | `@Listen('click')` decorator | `@click="${x => x.handler()}"` |
| **Auto-bubble** | Manual (`bubbles: true`) | Configurable via decorator | Automatic |
| **Prevent default** | Manual | Manual | Automatic (opt-out with `return true`) |

### 2.7 Decision Guide

| Choose | When |
|--------|------|
| **Lit** | Building lightweight components, need smallest bundle, want standards-aligned code, progressive enhancement |
| **Stencil** | Enterprise design systems consumed by React/Angular/Vue teams, need auto-generated wrappers, prefer JSX |
| **FAST** | Complex adaptive theming, white-labeling, Microsoft/Fluent ecosystem, need design tokens, maximum performance |
| **Build your own** | Need fine-grained signals, no VDOM overhead, custom primitives (ElementInternals, DSD), full control |

### 2.8 The "Outer Loop": Systems Integration

Beyond the internal update cycle, we compare how these frameworks handle system-level integration:

| Feature | **Lit / Stencil / FAST** | **Custom Signal Framework** | **Winner** |
| :--- | :--- | :--- | :--- |
| **Cross-Component State** | Context Providers / DI Containers | Global Signal Stores | **Signals** (No provider hell) |
| **Browser Form Integration** | Hidden inputs / Manual sync | `ElementInternals` / `setFormValue` | **Custom** (Zero DOM bloat) |
| **Async Data Flow** | Manual `loading/error` flags | Declarative `createResource` | **Custom** (Reactive async) |
| **Memory Management** | Manual `unsubscribe` / Lifecycle hooks | Auto-dependency tracking | **Signals** (Leak-resistant) |

**Verification:** These comparisons are implemented as runnable simulations in `examples/comparisons/08-state-orbit.js` through `11-lifecycle-leak.js`.

### 2.9 Key Takeaways for Building Your Own

From studying these frameworks, the essential patterns are:

1. **Base class** should extend `HTMLElement` and manage Shadow DOM creation
2. **Reactivity** should track dependencies automatically (signals > getters/setters)
3. **Templates** should parse once, update parts directly (no VDOM)
4. **Styling** should use constructible stylesheets (no `<style>` injection)
5. **Lifecycle** should map to native Custom Element callbacks
6. **Events** should be declarative in templates
7. **DI/Context** should cross Shadow DOM boundaries

---

## Part 3: Architecting a Custom Signal-Based Framework

If you extract the best features from Lit, Stencil, and FAST, the ideal "next-gen" framework is built on **Signals**, entirely bypassing component-level re-renders.

### 3.1 Core Architecture

```text
┌─────────────────────────────────────┐
│  Signals Layer (TC39 or custom)     │
├─────────────────────────────────────┤
│  Element Base Class                 │
│  - Shadow DOM, lifecycle, updates   │
├─────────────────────────────────────┤
│  Template Engine                    │
│  - Tagged templates, fine-grained   │
└─────────────────────────────────────┘
```

### 3.2 The Base Class (`SignalElement`)
Must handle Shadow DOM creation and coordinate Signal updates.
```typescript
class SignalElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
}
```

### 3.3 Top API Primitives & The Problems They Solve

1. **`ElementInternals` (`@formAssociated`)**
   * **The Problem:** Web Components act like opaque boxes to native `<form>` tags. They don't submit data natively and ignore CSS `:state(invalid)`.
   * **The Solution:** `attachInternals()` lets components act exactly like native `<input>` elements.

2. **`untrack()` (or `peek()`) in Signals**
   * **The Problem:** Reading a Signal's value inside an `effect()` automatically subscribes to it, causing infinite loops when you only wanted to read the current state once.
   * **The Solution:** `untrack(() => value())` pauses the dependency tracker during the read.

3. **`batch()` for Signals**
   * **The Problem:** Updating three separate signals sequentially triggers three heavy DOM render cycles.
   * **The Solution:** `batch()` groups them into one clean transaction.

4. **Declarative `<Suspense>`**
   * **The Problem:** Handling async fetches requires messy boilerplate: `if (loading) return <Spinner/>`.
   * **The Solution:** `<Suspense>` pauses the DOM render while children resolve promises.

5. **DOM `Part` Bindings (Instead of Virtual DOM)**
   * **The Problem:** VDOMs eat up CPU computing tree diffs on every state change.
   * **The Solution:** Tagged templates map variables to exact memory references (Parts) in the DOM, allowing direct `node.textContent = newValue` mutations.

---

## Part 4: Component Demos (Our Imaginary API in Action)

By combining our custom `SignalElement` and advanced API primitives, we can build incredibly powerful, declarative, and high-performance Web Components. Here are three practical examples using our imaginary API:

### Demo 1: Smart Todo List (Signals & Control Flow)
This component demonstrates fine-grained reactivity using `signal()`, `computed()`, and our declarative `<For>` and `<Show>` components. Notice how we don't need a Virtual DOM—updating the `todos` array only mutates the exact nodes that changed.

```typescript
import { SignalElement, signal, computed, html, css } from 'my-custom-framework';
import { For, Show } from 'my-custom-framework/flow';

export class TodoApp extends SignalElement {
  // Signals for state
  todos = signal([{ id: 1, text: 'Learn Web Components', done: true }]);
  filter = signal('all');

  // Computed state (memoized, only re-evaluates when dependencies change)
  filteredTodos = computed(() => {
    if (this.filter() === 'all') return this.todos();
    if (this.filter() === 'active') return this.todos().filter(t => !t.done);
    return this.todos().filter(t => t.done);
  });

  remainingCount = computed(() => this.todos().filter(t => !t.done).length);

  addTodo(e: Event) {
    e.preventDefault();
    const input = e.target.elements.todoInput;
    if (!input.value) return;
    
    // Immutable update triggers reactivity
    this.todos.set([...this.todos(), { id: Date.now(), text: input.value, done: false }]);
    input.value = '';
  }

  static styles = css`
    .done { text-decoration: line-through; color: gray; }
  `;

  render = () => html`
    <form @submit=${this.addTodo}>
      <input name="todoInput" placeholder="What needs to be done?" />
      <button>Add</button>
    </form>

    <ul>
      <!-- <For> handles highly optimized keyed list rendering without a VDOM -->
      <${For} each=${this.filteredTodos} key=${t => t.id} render=${(todo) => html`
        <li class=${() => todo.done ? 'done' : ''}>
          <input type="checkbox" .checked=${todo.done} 
                 @change=${() => todo.done = !todo.done} />
          ${todo.text}
        </li>
      `} />
    </ul>

    <!-- <Show> avoids rendering the footer entirely if there are no todos -->
    <${Show} when=${() => this.todos().length > 0}>
      <footer>
        <span>${this.remainingCount} items left</span>
        <button @click=${() => this.filter.set('all')}>All</button>
        <button @click=${() => this.filter.set('active')}>Active</button>
      </footer>
    <//>
  `;
}
customElements.define('todo-app', TodoApp);
```

### Demo 2: Async User Profile (Suspense & Resources)
Dealing with async data natively inside Web Components is notoriously difficult. Our framework solves this with `createResource` (which integrates fetch states with our Signals) and `<Suspense>` (which catches unresolved promises).

```typescript
import { SignalElement, createResource, html, css, attr } from 'my-custom-framework';
import { Suspense, ErrorBoundary } from 'my-custom-framework/async';

const fetchUser = async (id: string) => {
  const res = await fetch(`https://api.example.com/users/${id}`);
  if (!res.ok) throw new Error('User not found');
  return res.json();
};

export class UserProfile extends SignalElement {
  // Syncs with <user-profile user-id="123">
  @attr({ attribute: 'user-id' }) userId = signal('1');

  // Resource automatically re-fetches when userId changes
  userData = createResource(this.userId, fetchUser);

  static styles = css`
    .card { border: 1px solid #ccc; padding: 1rem; border-radius: 8px; }
    .skeleton { animation: pulse 1.5s infinite; background: #eee; }
  `;

  render = () => html`
    <div class="card">
      <${ErrorBoundary} fallback=${(err) => html`<p class="error">${err.message}</p>`}>
        <!-- Suspense catches the resource promise and shows fallback UI automatically -->
        <${Suspense} fallback=${() => html`<div class="skeleton">Loading profile...</div>`}>
          
          <img src=${() => this.userData().avatar} alt="Profile Picture" />
          <h2>${() => this.userData().name}</h2>
          <p>${() => this.userData().email}</p>
          
        <//>
      <//>
    </div>
  `;
}
customElements.define('user-profile', UserProfile);
```

### Demo 3: Native-Feeling Toggle Switch (ElementInternals)
This component proves that Custom Elements *can* behave identically to native HTML inputs. By utilizing `@formAssociated` and `attachInternals()`, this switch will automatically submit its value when placed inside a standard `<form>` tag, and can be styled using CSS `:state()` selectors.

```typescript
import { SignalElement, signal, html, css, formAssociated } from 'my-custom-framework';

@formAssociated
export class ToggleSwitch extends SignalElement {
  // Tells the browser this component acts like a form control
  static formAssociated = true;
  private internals: ElementInternals;
  
  checked = signal(false);

  constructor() {
    super();
    // Attach standard ElementInternals API
    this.internals = this.attachInternals();
    this.internals.role = 'switch';
  }

  toggle() {
    this.checked.set(!this.checked());
    
    // 1. Submit this value natively when the parent <form> is submitted
    this.internals.setFormValue(this.checked() ? 'on' : null);
    
    // 2. Update native ARIA state for screen readers
    this.internals.ariaChecked = String(this.checked());
    
    // 3. Expose cutting-edge CSS pseudo-states without reflecting attributes
    if (this.checked()) {
      this.internals.states.add('checked');
    } else {
      this.internals.states.delete('checked');
    }
  }

  static styles = css`
    :host {
      display: inline-block;
      width: 40px; height: 20px;
      background: #ccc;
      border-radius: 20px;
      cursor: pointer;
      transition: background 0.3s;
    }
    /* We can style based on the internal state natively! */
    :host(:state(checked)) {
      background: #4ade80; /* Green */
    }
    .knob {
      width: 20px; height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s;
    }
    :host(:state(checked)) .knob {
      transform: translateX(20px);
    }
  `;

  render = () => html`
    <div class="knob" @click=${this.toggle}></div>
  `;
}
customElements.define('toggle-switch', ToggleSwitch);
```

### Demo 4: Data Table with Sorting & Filtering (Computed + Batch)

```typescript
import { SignalElement, signal, computed, batch, html, css, For } from 'my-custom-framework';

export class DataTable extends SignalElement {
  @attr({ attribute: 'data-url' }) dataUrl = signal('');
  
  data = signal([]);
  sortKey = signal('name');
  sortDir = signal<'asc' | 'desc'>('asc');
  searchQuery = signal('');

  // Computed: filtered + sorted data (only recalculates when deps change)
  processedData = computed(() => {
    let result = this.data();
    
    // Filter
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }
    
    // Sort
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...result].sort((a, b) => (a[key] > b[key] ? dir : -dir));
  });

  connectedCallback() {
    super.connectedCallback();
    fetch(this.dataUrl()).then(r => r.json()).then(d => this.data.set(d));
  }

  // Batch: update sort key + direction in one render cycle
  sortBy(key: string) {
    batch(() => {
      if (this.sortKey() === key) {
        this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
      } else {
        this.sortKey.set(key);
        this.sortDir.set('asc');
      }
    });
  }

  static styles = css`
    :host { display: block; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { cursor: pointer; user-select: none; }
    th:hover { background: #f5f5f5; }
    .sort-icon::after { content: '↕'; margin-left: 4px; opacity: 0.3; }
    .sort-active::after { opacity: 1; }
    input { margin-bottom: 8px; padding: 6px; width: 100%; }
  `;

  render = () => html`
    <input
      placeholder="Search..."
      :value=${this.searchQuery}
      @input=${(e) => this.searchQuery.set(e.target.value)}
    />
    <table>
      <thead>
        <tr>
          <th class=${() => `sort-icon ${this.sortKey() === 'name' ? 'sort-active' : ''}`}
              @click=${() => this.sortBy('name')}>Name</th>
          <th class=${() => `sort-icon ${this.sortKey() === 'email' ? 'sort-active' : ''}`}
              @click=${() => this.sortBy('email')}>Email</th>
          <th class=${() => `sort-icon ${this.sortKey() === 'role' ? 'sort-active' : ''}`}
              @click=${() => this.sortBy('role')}>Role</th>
        </tr>
      </thead>
      <tbody>
        <${For} each=${this.processedData} key=${r => r.id}>
          ${(row) => html`
            <tr>
              <td>${row.name}</td>
              <td>${row.email}</td>
              <td>${row.role}</td>
            </tr>
          `}
        <//>
      </tbody>
    </table>
  `;
}
customElements.define('data-table', DataTable);
```

### Demo 5: Modal Dialog (Portal + Focus Trap)

```typescript
import { SignalElement, signal, html, css, ref, onCleanup } from 'my-custom-framework';
import { Portal } from 'my-custom-framework/dom';

export class ModalDialog extends SignalElement {
  @attr({ type: Boolean }) open = signal(false);
  
  private triggerRef = ref();

  connectedCallback() {
    super.connectedCallback();
    // Escape key closes modal
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.close();
    });
  }

  openModal() {
    this.open.set(true);
    // Save trigger for focus restore
    this.triggerRef.current = document.activeElement;
    // Trap focus
    this.trapFocus();
  }

  close() {
    this.open.set(false);
    // Restore focus to trigger
    this.triggerRef.current?.focus();
  }

  trapFocus() {
    const focusable = this.shadowRoot.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) {
      (focusable[0] as HTMLElement).focus();
    }
  }

  static styles = css`
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: white; border-radius: 8px; padding: 24px;
      min-width: 400px; max-width: 90vw; max-height: 90vh;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .close-btn {
      position: absolute; top: 8px; right: 8px;
      background: none; border: none; font-size: 20px; cursor: pointer;
    }
  `;

  render = () => html`
    <button ref=${this.triggerRef} @click=${() => this.openModal()}>
      Open Modal
    </button>
    
    <${Show} when=${this.open}>
      <${Portal} target=${document.body}>
        <div class="overlay" @click=${(e) => e.target === e.currentTarget && this.close()}>
          <div class="modal" role="dialog" aria-modal="true">
            <button class="close-btn" @click=${() => this.close()}>×</button>
            <slot></slot>
          </div>
        </div>
      <//>
    <//>
  `;
}
customElements.define('modal-dialog', ModalDialog);

// Usage:
html`<modal-dialog>
  <h2>Confirm Action</h2>
  <p>Are you sure you want to proceed?</p>
  <button @click=${() => console.log('confirmed')}>Yes</button>
</modal-dialog>`
```

### Demo 6: Form with Validation (Resource + Error Handling)

```typescript
import { SignalElement, signal, computed, html, css, resource } from 'my-custom-framework';
import { Show, ErrorBoundary, Suspense } from 'my-custom-framework/flow';

export class ContactForm extends SignalElement {
  // Form state
  name = signal('');
  email = signal('');
  message = signal('');
  
  // Validation (computed)
  errors = computed(() => {
    const e: Record<string, string> = {};
    if (!this.name()) e.name = 'Name is required';
    if (!this.email()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email())) e.email = 'Invalid email';
    if (!this.message()) e.message = 'Message is required';
    return e;
  });

  isValid = computed(() => Object.keys(this.errors()).length === 0);

  // Submission resource
  submitResult = resource(
    () => null, // No dependency - only runs on manual trigger
    async () => {
      const res = await fetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: this.name(),
          email: this.email(),
          message: this.message(),
        }),
      });
      if (!res.ok) throw new Error('Submission failed');
      return res.json();
    }
  );

  async handleSubmit(e: Event) {
    e.preventDefault();
    if (!this.isValid()) return;
    await this.submitResult.refetch();
  }

  static styles = css`
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 4px; font-weight: 500; }
    input, textarea { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    .error { color: red; font-size: 12px; margin-top: 4px; }
    .success { color: green; padding: 12px; background: #d4edda; border-radius: 4px; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `;

  render = () => html`
    <form @submit=${(e) => this.handleSubmit(e)}>
      <div class="form-group">
        <label>Name</label>
        <input :value=${this.name} @input=${(e) => this.name.set(e.target.value)} />
        <${Show} when=${() => this.errors().name}>
          <div class="error">${() => this.errors().name}</div>
        <//>
      </div>

      <div class="form-group">
        <label>Email</label>
        <input type="email" :value=${this.email} @input=${(e) => this.email.set(e.target.value)} />
        <${Show} when=${() => this.errors().email}>
          <div class="error">${() => this.errors().email}</div>
        <//>
      </div>

      <div class="form-group">
        <label>Message</label>
        <textarea rows="4" :value=${this.message} @input=${(e) => this.message.set(e.target.value)}></textarea>
        <${Show} when=${() => this.errors().message}>
          <div class="error">${() => this.errors().message}</div>
        <//>
      </div>

      <button type="submit" ?disabled=${() => !this.isValid()}>Send Message</button>
    </form>

    <${ErrorBoundary} fallback=${(err) => html`<div class="error">Error: ${err.message}</div>`}>
      <${Suspense} fallback=${html`<div>Sending...</div>`}>
        <${Show} when=${() => this.submitResult.data()}>
          <div class="success">Message sent successfully!</div>
        <//>
      <//>
    <//>
  `;
}
customElements.define('contact-form', ContactForm);
```

### Demo 7: Infinite Scroll (IntersectionObserver + Resource)

```typescript
import { SignalElement, signal, computed, html, css, resource, useIntersectionObserver } from 'my-custom-framework';
import { For, Show } from 'my-custom-framework/flow';

export class InfiniteList extends SignalElement {
  @attr({ attribute: 'api-url' }) apiUrl = signal('');
  
  page = signal(1);
  allItems = signal([]);

  // Resource fetches page when page number changes
  pageData = resource(
    () => this.page(),
    async (pageNum) => {
      const res = await fetch(`${this.apiUrl()}?page=${pageNum}&limit=20`);
      return res.json();
    }
  );

  // Computed: append new items to existing
  items = computed(() => {
    const existing = this.allItems();
    const newItems = this.pageData.data()?.items ?? [];
    return [...existing, ...newItems];
  });

  hasMore = computed(() => this.pageData.data()?.hasMore ?? false);

  loadMore() {
    if (this.hasMore() && !this.pageData.pending()) {
      this.allItems.set(this.items()); // Snapshot current items
      this.page.set(this.page() + 1);
    }
  }

  // Intersection observer triggers loadMore when sentinel is visible
  setupObserver(ref: HTMLElement) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) this.loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(ref);
    onCleanup(() => observer.disconnect());
  }

  static styles = css`
    .list { max-height: 400px; overflow-y: auto; }
    .item { padding: 12px; border-bottom: 1px solid #eee; }
    .sentinel { height: 1px; }
    .loading { text-align: center; padding: 20px; color: #666; }
  `;

  render = () => html`
    <div class="list">
      <${For} each=${this.items} key=${item => item.id}>
        ${(item) => html`
          <div class="item">${item.title}</div>
        `}
      <//>

      <div class="sentinel" ref=${(el) => el && this.setupObserver(el)}></div>

      <${Show} when=${this.pageData.pending}>
        <div class="loading">Loading more items...</div>
      <//>
    </div>
  `;
}
customElements.define('infinite-list', InfiniteList);
```

### Demo 8: Dark Mode Toggle (Design Tokens + Transition)

```typescript
import { SignalElement, signal, computed, html, css, DesignToken } from 'my-custom-framework';
import { viewTransition } from 'my-custom-framework/animation';

// Design tokens
const bgColor = DesignToken.create('bg-color').withDefault('#ffffff');
const textColor = DesignToken.create('text-color').withDefault('#1f2937');
const accentColor = DesignToken.create('accent-color').withDefault('#3b82f6');

const themes = {
  light: { bg: '#ffffff', text: '#1f2937', accent: '#3b82f6' },
  dark: { bg: '#1f2937', text: '#f9fafb', accent: '#60a5fa' },
};

export class ThemeToggle extends SignalElement {
  theme = signal<'light' | 'dark'>('light');

  toggleTheme() {
    const next = this.theme() === 'light' ? 'dark' : 'light';
    
    // View transition for smooth animation
    if (document.startViewTransition) {
      document.startViewTransition(() => this.applyTheme(next));
    } else {
      this.applyTheme(next);
    }
  }

  applyTheme(name: 'light' | 'dark') {
    this.theme.set(name);
    const t = themes[name];
    bgColor.withDefault(t.bg);
    textColor.withDefault(t.text);
    accentColor.withDefault(t.accent);
  }

  connectedCallback() {
    super.connectedCallback();
    // Respect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(prefersDark ? 'dark' : 'light');
  }

  static styles = css`
    :host {
      display: flex; align-items: center; gap: 8px;
      color: var(--text-color);
    }
    .toggle {
      width: 48px; height: 24px;
      background: var(--bg-color);
      border: 2px solid var(--accent-color);
      border-radius: 12px;
      cursor: pointer;
      position: relative;
      transition: background 0.3s;
    }
    .toggle::after {
      content: '';
      position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px;
      background: var(--accent-color);
      border-radius: 50%;
      transition: transform 0.3s;
    }
    .toggle.active::after {
      transform: translateX(24px);
    }
    .label { font-size: 14px; }
  `;

  render = () => html`
    <span class="label">${() => this.theme() === 'light' ? '☀️' : '🌙'}</span>
    <div class="toggle ${() => this.theme() === 'dark' ? 'active' : ''}"
         @click=${() => this.toggleTheme()}></div>
  `;
}
customElements.define('theme-toggle', ThemeToggle);
```

### Demo 9: Multi-Step Wizard (Store + Transition)

```typescript
import { SignalElement, signal, computed, html, css, useStore } from 'my-custom-framework';
import { Show, For } from 'my-custom-framework/flow';

// Shared wizard state
const wizardStore = useStore({
  currentStep: signal(0),
  formData: signal({
    personal: { name: '', email: '' },
    address: { street: '', city: '', zip: '' },
    payment: { card: '', expiry: '' },
  }),
  
  steps: ['Personal', 'Address', 'Payment'],
  
  next() { this.currentStep.set(Math.min(this.currentStep() + 1, 2)); },
  prev() { this.currentStep.set(Math.max(this.currentStep() - 1, 0)); },
  
  updateField(section: string, field: string, value: string) {
    const data = { ...this.formData() };
    data[section] = { ...data[section], [field]: value };
    this.formData.set(data);
  },
  
  isStepValid(step: number) {
    const data = this.formData();
    switch (step) {
      case 0: return data.personal.name && data.personal.email;
      case 1: return data.address.street && data.address.city;
      case 2: return data.payment.card && data.payment.expiry;
      default: return false;
    }
  },
  
  canProceed: computed(function(this: any) {
    return this.isStepValid(this.currentStep());
  }),
});

export class WizardForm extends SignalElement {
  private store = useStore(wizardStore);

  submit() {
    console.log('Submitting:', this.store.formData());
  }

  static styles = css`
    .wizard { max-width: 500px; margin: 0 auto; }
    .steps { display: flex; margin-bottom: 24px; }
    .step {
      flex: 1; padding: 12px; text-align: center;
      background: #f5f5f5; border-bottom: 3px solid transparent;
    }
    .step.active { border-bottom-color: #3b82f6; font-weight: bold; }
    .step.done { border-bottom-color: #22c55e; }
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 4px; }
    input { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    .actions { display: flex; justify-content: space-between; margin-top: 24px; }
    button { padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    .btn-primary { background: #3b82f6; color: white; border: none; }
    .btn-secondary { background: #e5e7eb; border: none; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `;

  render = () => html`
    <div class="wizard">
      <!-- Step indicators -->
      <div class="steps">
        <${For} each=${() => this.store.steps} key=${(_, i) => i}>
          ${(step, i) => html`
            <div class="step ${() => i === this.store.currentStep() ? 'active' : ''} 
                         ${() => i < this.store.currentStep() ? 'done' : ''}">
              ${step}
            </div>
          `}
        <//>
      </div>

      <!-- Step 1: Personal -->
      <${Show} when=${() => this.store.currentStep() === 0}>
        <div class="form-group">
          <label>Name</label>
          <input :value=${() => this.store.formData().personal.name}
                 @input=${(e) => this.store.updateField('personal', 'name', e.target.value)} />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" :value=${() => this.store.formData().personal.email}
                 @input=${(e) => this.store.updateField('personal', 'email', e.target.value)} />
        </div>
      <//>

      <!-- Step 2: Address -->
      <${Show} when=${() => this.store.currentStep() === 1}>
        <div class="form-group">
          <label>Street</label>
          <input :value=${() => this.store.formData().address.street}
                 @input=${(e) => this.store.updateField('address', 'street', e.target.value)} />
        </div>
        <div class="form-group">
          <label>City</label>
          <input :value=${() => this.store.formData().address.city}
                 @input=${(e) => this.store.updateField('address', 'city', e.target.value)} />
        </div>
      <//>

      <!-- Step 3: Payment -->
      <${Show} when=${() => this.store.currentStep() === 2}>
        <div class="form-group">
          <label>Card Number</label>
          <input :value=${() => this.store.formData().payment.card}
                 @input=${(e) => this.store.updateField('payment', 'card', e.target.value)} />
        </div>
        <div class="form-group">
          <label>Expiry</label>
          <input :value=${() => this.store.formData().payment.expiry}
                 @input=${(e) => this.store.updateField('payment', 'expiry', e.target.value)} />
        </div>
      <//>

      <!-- Navigation -->
      <div class="actions">
        <button class="btn-secondary" 
                ?disabled=${() => this.store.currentStep() === 0}
                @click=${() => this.store.prev()}>Previous</button>
        
        <${Show} when=${() => this.store.currentStep() < 2}>
          <button class="btn-primary" 
                  ?disabled=${() => !this.store.canProceed()}
                  @click=${() => this.store.next()}>Next</button>
        <//>
        
        <${Show} when=${() => this.store.currentStep() === 2}>
          <button class="btn-primary" 
                  ?disabled=${() => !this.store.canProceed()}
                  @click=${() => this.submit()}>Submit</button>
        <//>
      </div>
    </div>
  `;
}
customElements.define('wizard-form', WizardForm);
```

---

## Part 5: Enterprise-Grade Advanced Primitives (Cutting-Edge)

To truly surpass current giants, your custom framework should integrate the absolute latest W3C specifications:

### 5.1 View Transition API Integration
**Capability:** Intercepts a signal update microtask, pauses it, calls `document.startViewTransition()`, and applies the DOM mutation inside the callback, resulting in seamless, native 60FPS cross-DOM animations.
```typescript
document.startViewTransition(() => {
  this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
});
```

### 5.2 Declarative Shadow DOM (DSD) & Resumability
**Capability:** The browser renders the Shadow DOM before JS loads via `<template shadowrootmode="open">`. By serializing signal subscriptions into HTML attributes, you achieve **Resumability** (Qwik-style)—lazily downloading JS only when an event (like a click) actually occurs.

---

## Part 6: FAQ

### Q1: Why do we need decorators?
Decorators provide **Declarative Metaprogramming** to reduce boilerplate:
1. **Auto-registration**: `@customElement('my-el')` replaces `customElements.define()`.
2. **Property reflection**: `@attr` handles getters/setters, type coercion, and reactivity triggers automatically.

### Q2: What if we build without decorators?
**With decorators:**
```typescript
@customElement('my-counter')
class MyCounter extends LitElement {
  @property({ type: Number }) count = 0;
}
```
**Without decorators (Functional/Signal-based):**
```javascript
const MyCounter = defineComponent(() => {
  const count = signal(0);
  return () => html`<div>${count()}</div>`;
});
```
**Verdict:** Class-based architectures require verbose static blocks without decorators. Functional architectures don't need decorators at all.

### Q3: Should my framework use a Virtual DOM (VDOM) or Fine-Grained Signals?
Fine-grained Signals are universally replacing VDOM architectures. VDOMs (like Stencil or React) require re-evaluating the whole component tree and diffing it. Signals bind directly to the exact DOM node, bypassing diffing overhead entirely, saving massive memory and CPU cycles.

---

## Part 7: Summary

*   **Choose Lit if**: You want the simplest, lightest, standards-aligned library.
*   **Choose Stencil if**: You need to compile enterprise design systems to React/Angular/Vue natively.
*   **Choose FAST if**: You require complex adaptive theming and design-token-driven UIs.
*   **Build your own if**: You want to leverage modern **Signals**, eliminate VDOM overhead, and integrate cutting-edge primitives like ElementInternals, DSD, and the View Transition API exactly to your architectural specifications.
