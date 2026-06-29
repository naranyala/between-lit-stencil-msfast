# Browser-Native Web Component Frameworks: Comparative Study

A comprehensive study of **Lit**, **Stencil**, and **FAST** — and an architectural guide for building your own signal-based Web Component framework.

---

## Part 1: The Framework Landscape

### 1.1 High-Level Comparison

| | **Lit** | **Stencil** | **FAST** |
|---|---------|-------------|----------|
| **Maintainer** | Google/OpenJS | Ionic | Microsoft |
| **Architecture** | Runtime library | Compiler | Runtime library |
| **Rendering** | Tagged templates (no VDOM) | JSX (VDOM) | Tagged templates (no VDOM) |
| **Reactivity** | Property accessors + microtask | Proxies + rAF | Observables + task queue |
| **Bundle Size** | ~5KB (Tiny) | Varies (compiled) | ~8KB (Small) |
| **SSR** | Experimental | Built-in | Supported |
| **DI** | `@lit/context` | None | Built-in container |
| **Best For** | Simplicity, standalone UI | Multi-framework interop | Adaptive theming, enterprise |

### 1.2 Lit (by Google)

**Approach:** Thin runtime wrapper staying "close to the metal."

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('my-counter')
class MyCounter extends LitElement {
  static styles = css`button { padding: 8px 16px; }`;

  @property({ type: Number, reflect: true })
  count = 0;

  @state()
  private _internal = 'hidden';

  render() {
    return html`
      <button @click=${() => this.count++}>
        Count: ${this.count}
      </button>
      <div>${this._internal}</div>
    `;
  }
}
```

**ReactiveElement internals:**
```typescript
export abstract class ReactiveElement extends HTMLElement {
  static elementProperties: PropertyDeclarationMap;
  static elementStyles: Array<CSSResultOrNative>;

  isUpdatePending = false;
  hasUpdated = false;
  _$changedProperties!: PropertyValues;

  static getPropertyDescriptor(name: PropertyKey, key: string, options: PropertyDeclaration) {
    const { get, set } = getOwnPropertyDescriptor(this.prototype, name) ?? {};
    return {
      get,
      set(this: ReactiveElement, value: unknown) {
        const oldValue = get?.call(this);
        set?.call(this, value);
        this.requestUpdate(name, oldValue, options);
      },
      configurable: true,
      enumerable: true,
    };
  }

  requestUpdate(name?: PropertyKey, oldValue?: unknown, options?: PropertyDeclaration) {
    if (!this.isUpdatePending) {
      this.__enqueueUpdate();
    }
  }

  private async __enqueueUpdate() {
    this.isUpdatePending = true;
    await this.__updatePromise;
    this.performUpdate();
  }

  protected performUpdate() {
    if (!this.isUpdatePending) return;
    // Apply changes to DOM
    this.hasUpdated = true;
  }
}
```

### 1.3 Stencil (by Ionic)

**Approach:** Build-time compiler transforming TS+JSX → vanilla Custom Elements.

```typescript
import { Component, Prop, State, Watch, h } from '@stencil/core';

@Component({
  tag: 'my-counter',
  shadow: true,
  styleUrl: 'my-counter.css',
})
export class MyCounter {
  @Prop({ reflect: true })
  count: number = 0;

  @State()
  internal = 'hidden';

  @Watch('count')
  countChanged(newValue: number, oldValue: number) {
    console.log(`Count changed: ${oldValue} → ${newValue}`);
  }

  componentWillLoad() {
    console.log('Component is about to load');
  }

  componentDidLoad() {
    console.log('Component has loaded');
  }

  render() {
    return (
      <button onClick={() => this.count++}>
        Count: {this.count}
      </button>
    );
  }
}
// Compiler generates: customElements.define('my-counter', CompiledClass)
```

### 1.4 FAST (by Microsoft)

**Approach:** Runtime library focused on performance and Adaptive UI.

```typescript
import { attr, FASTElement, html, css } from '@microsoft/fast-element';

const template = html<FASTCounter>`
  <button @click="${x => x.increment()}">
    Count: ${x => x.count}
  </button>
`;

const styles = css`
  button { padding: 8px 16px; }
`;

class FASTCounter extends FASTElement {
  @attr({ mode: 'reflect' })
  count: number = 0;

  increment() {
    this.count++;
  }

  connectedCallback() {
    super.connectedCallback();
    console.log('Element connected');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    console.log('Element disconnected');
  }
}

FASTCounter.define({
  name: 'fast-counter',
  template,
  styles,
});
```

**Observable system:**
```typescript
import { Observable } from '@microsoft/fast-element';

// Manual observation without decorators
class Person {
  private _name: string = '';

  get name() {
    Observable.track(this, 'name');
    return this._name;
  }

  set name(value: string) {
    this._name = value;
    Observable.notify(this, 'name');
  }
}

// Subscribing to changes
const person = new Person();
const notifier = Observable.getNotifier(person);
const handler = {
  handleChange(source: Person, propertyName: string) {
    console.log(`${propertyName} changed to: ${source[propertyName]}`);
  }
};

notifier.subscribe(handler, 'name');
```

---

## Part 2: Internal API Primitives Deep Dive

### 2.1 Component Base Class

| Aspect | Lit | Stencil | FAST |
|--------|-----|---------|------|
| **Base Class** | `ReactiveElement` → `LitElement` | None (compiler transforms) | `FASTElement` |
| **Inheritance** | Extends `HTMLElement` | Extends `HTMLElement` via compiled output | Extends `HTMLElement` |
| **Registration** | Manual `customElements.define()` | Auto via `@Component` | `MyEl.define({name, template, styles})` |

### 2.2 Reactivity System

| Aspect | Lit | Stencil | FAST |
|--------|-----|---------|------|
| **Property Decorator** | `@property(opts)` | `@Prop()` | `@attr` / `@observable` |
| **State Decorator** | `@state()` | `@State()` | `@observable` |
| **Change Detection** | Reference equality + custom `hasChanged` | Reference equality | Automatic access tracking |
| **Update Trigger** | Microtask batching | Immediate rAF | Task queue batching |

**Lit Property Declaration:**
```typescript
interface PropertyDeclaration<Type = unknown, TypeHint = unknown> {
  attribute?: boolean | string;
  type?: TypeHint;
  converter?: AttributeConverter<Type, TypeHint>;
  reflect?: boolean;
  hasChanged?(value: Type, oldValue: Type): boolean;
  state?: boolean;
  useDefault?: boolean;
}

// Default converter handles type coercion
const defaultConverter: ComplexAttributeConverter = {
  toAttribute(value: unknown, type?: unknown): unknown {
    switch (type) {
      case Boolean:
        return value ? '' : null;
      case Object:
      case Array:
        return value == null ? value : JSON.stringify(value);
    }
    return value;
  },
  fromAttribute(value: string | null, type?: unknown) {
    switch (type) {
      case Boolean:
        return value !== null;
      case Number:
        return value === null ? null : Number(value);
      case Object:
      case Array:
        try { return JSON.parse(value!); }
        catch { return null; }
    }
    return value;
  },
};
```

**Stencil Property System:**
```typescript
@Prop({ reflect: true, mutable: true, attribute: 'my-color' })
color: string = 'blue';

@State()
internalCount: number = 0;

@Watch('color')
@Watch('internalCount')
handleChanges(newValue: string | number, oldValue: string | number, propName: string) {
  console.log(`${propName} changed from ${oldValue} to ${newValue}`);
}

// Force update (bypass reactivity)
forceUpdate(this);
```

**FAST Property System:**
```typescript
@attr({ attribute: 'foo-bar', mode: 'boolean' })
foo: boolean = false;

@attr({ converter: numberConverter })
count: number = 0;

@observable
items: Item[] = [];

// Custom value converter
const numberConverter: ValueConverter = {
  toView(value: number): string {
    return String(value);
  },
  fromView(value: string): number {
    return Number(value);
  }
};

// Manual observation without decorators
class Person {
  private _firstName: string = '';
  private _lastName: string = '';

  get firstName() {
    Observable.track(this, 'firstName');
    return this._firstName;
  }

  set firstName(value: string) {
    this._firstName = value;
    Observable.notify(this, 'firstName');
  }

  get fullName() {
    // Computed property - automatically tracks dependencies
    return `${this.firstName} ${this.lastName}`;
  }
}
```

### 2.3 Template Rendering Engine

| Aspect | Lit | Stencil | FAST |
|--------|-----|---------|------|
| **Syntax** | `` html`...` `` | JSX `<div>...</div>` | `` html`...` `` |
| **Strategy** | Part-based DOM updates | VDOM reconciliation | Observable-to-DOM binding |
| **Directives** | `repeat`, `guard`, `until` | N/A | Custom `Directive` class |

**Lit Template with Directives:**
```typescript
import { html, repeat, guard, until, ifDefined } from 'lit';

// Repeat directive with keyed diffing
html`<ul>
  ${repeat(this.items, (item) => item.id, (item) => html`
    <li>${item.name}</li>
  `)}
</ul>`

// Guard directive - only re-render if deps change
html`${guard([this.userId, this.timestamp], () => html`
  <user-card .userId=${this.userId}></user-card>
`)}

// Until directive - show placeholder while promise resolves
html`<div>${until(this.dataPromise, html`<span>Loading...</span>`)}</div>`

// IfDefined - only set attribute if value is defined
html`<div class="${ifDefined(this.className)}"></div>`
```

**Stencil JSX:**
```typescript
render() {
  const { items, loading, error } = this;

  if (loading) {
    return <div class="spinner">Loading...</div>;
  }

  if (error) {
    return <div class="error">{error.message}</div>;
  }

  return (
    <div class="container">
      {items.map(item => (
        <my-item
          key={item.id}
          name={item.name}
          onItemSelect={() => this.selectItem(item)}
        />
      ))}
    </div>
  );
}
// Compiler generates VDOM diffing logic
```

**FAST Template with Bindings:**
```typescript
import { html, repeat, when, slotted } from '@microsoft/fast-element';

// Content binding
const template = html<FASTCard>`
  <div class="card">
    <h3>${x => x.title}</h3>
    <p>${x => x.description}</p>
  </div>
`;

// Boolean binding
html`<button ?disabled="${x => x.isDisabled}">Submit</button>`

// Event binding with context
html`<button @click="${(x, c) => x.handleClick(c.event)}">Click</button>`

// Property binding
html`<input :value="${x => x.value}" />`

// List rendering
html`<ul>
  ${repeat(x => x.items, html`
    <li>${x => x.name}</li>
  `)}
</ul>`

// Conditional rendering
html`${when(x => x.isLoggedIn, html`
  <div>Welcome back!</div>
`, html`
  <div>Please login</div>
`)}

// Slot projection
html`<div class="card">
  <slot name="header"></slot>
  <slot></slot>
  <slot name="footer"></slot>
</div>`
```

### 2.4 Styling System

| Aspect | Lit | Stencil | FAST |
|--------|-----|---------|------|
| **Definition** | `` css`...` `` tag | External CSS / inline | `` css`...` `` tag |
| **Encapsulation** | Shadow DOM | Shadow DOM or scoped | Shadow DOM |
| **Theming** | CSS custom properties | CSS custom properties | Design tokens |

**Lit Styles:**
```typescript
import { css, unsafeCSS } from 'lit';

// Basic styles
static styles = css`
  :host {
    display: block;
    font-family: system-ui;
  }
  .container {
    padding: var(--spacing-md, 16px);
    background: var(--bg-color, white);
  }
`;

// Style composition
const baseStyles = css`.base { margin: 0; }`;
const themeStyles = css`:host { color: var(--text-color); }`;

static styles = [baseStyles, themeStyles, css`
  .special { font-weight: bold; }
`];

// Dynamic styles via properties
render() {
  return html`
    <div class="${this.isActive ? 'active' : 'inactive'}">
      Content
    </div>
  `;
}

// CSS custom properties for theming
static styles = css`
  :host {
    --primary-color: #3b82f6;
    --text-color: #1f2937;
  }
  .button {
    background: var(--primary-color);
    color: var(--text-color);
  }
`;
```

**Stencil Styles:**
```typescript
@Component({
  tag: 'my-component',
  styleUrl: 'my-component.css',
  styleUrls: ['base.css', 'theme.css'],
  styles: `
    :host { display: block; }
    .container { padding: 16px; }
  `,
  scoped: true,
  shadow: true,
})
```

**FAST Styles with Design Tokens:**
```typescript
import { css } from '@microsoft/fast-element';
import { DesignToken } from '@microsoft/fast-foundation';

// Create design tokens
const primaryColor = DesignToken.create<string>('primary-color').withDefault('#3b82f6');
const spacingSmall = DesignToken.create<string>('spacing-small').withDefault('8px');
const spacingMedium = DesignToken.create<string>('spacing-medium').withDefault('16px');

// Use tokens in styles
const styles = css`
  :host {
    display: block;
    --primary: ${primaryColor};
    --spacing-s: ${spacingSmall};
    --spacing-m: ${spacingMedium};
  }
  .button {
    background: var(--primary);
    padding: var(--spacing-s) var(--spacing-m);
  }
`;

// Theme switching
function applyDarkTheme() {
  primaryColor.withDefault('#60a5fa');
  spacingSmall.withDefault('12px');
}
```

### 2.5 Lifecycle Management

| Hook | Lit | Stencil | FAST |
|------|-----|---------|------|
| Connected | `connectedCallback()` | `connectedCallback()` | `connectedCallback()` |
| Disconnected | `disconnectedCallback()` | `disconnectedCallback()` | `disconnectedCallback()` |
| First render | `firstUpdated()` | `componentDidLoad()` | Automatic |
| Updated | `updated(changedProps)` | `componentDidUpdate()` | `*Changed()` callbacks |

**Lit Lifecycle:**
```typescript
class MyElement extends LitElement {
  @property() data: string = '';

  constructor() {
    super();
    console.log('Element created');
  }

  connectedCallback() {
    super.connectedCallback();
    console.log('Element connected to DOM');
  }

  firstUpdated(changedProps: PropertyValues) {
    console.log('First render complete');
    // Access shadow DOM elements
    const input = this.shadowRoot?.querySelector('input');
    input?.focus();
  }

  updated(changedProps: PropertyValues) {
    console.log('Element updated');
    if (changedProps.has('data')) {
      console.log(`Data changed from ${changedProps.get('data')}`);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    console.log('Element disconnected from DOM');
  }

  render() {
    return html`<input .value=${this.data} />`;
  }
}
```

**Stencil Lifecycle:**
```typescript
@Component({ tag: 'my-component' })
export class MyComponent {
  @Prop() url: string;
  @State() data: any;

  // Before first render (async allowed)
  componentWillLoad() {
    return fetch(this.url).then(r => r.json());
  }

  // After first render
  componentDidLoad() {
    console.log('Component rendered');
  }

  // Before each update
  componentWillUpdate() {
    console.log('Component will update');
  }

  // After each update
  componentDidUpdate() {
    console.log('Component did update');
  }

  // Native lifecycle
  connectedCallback() {
    console.log('Connected');
  }

  disconnectedCallback() {
    console.log('Disconnected');
  }

  render() {
    return <div>{JSON.stringify(this.data)}</div>;
  }
}
```

**FAST Lifecycle:**
```typescript
class MyElement extends FASTElement {
  @observable data: any;

  constructor() {
    super();
    // Shadow DOM created here
  }

  connectedCallback() {
    super.connectedCallback();
    // Template hydrated, bindings connected
    this.$fastController.addBehavior(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Bindings disconnected
  }

  adoptedCallback() {
    console.log('Element moved to new document');
  }

  // Property-specific change callbacks
  dataChanged(oldValue: any, newValue: any) {
    console.log('Data changed');
  }
}
```

### 2.6 Event System

| Aspect | Lit | Stencil | FAST |
|--------|-----|---------|------|
| **Emit** | `this.dispatchEvent(new CustomEvent(...))` | `@Event() this.eventName.emit()` | `this.$emit('name', detail)` |
| **Listen** | `@click="${handler}"` | `@Listen('click')` | `@click="${x => x.handler()}"` |

**Lit Events:**
```typescript
class MyInput extends LitElement {
  @property() value: string = '';

  // Emit custom event
  emitChange() {
    this.dispatchEvent(new CustomEvent('value-change', {
      detail: { value: this.value, timestamp: Date.now() },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <input
        .value=${this.value}
        @input=${(e: Event) => {
          this.value = (e.target as HTMLInputElement).value;
          this.emitChange();
        }}
      />
      <button @click=${this.emitChange}>Submit</button>
    `;
  }
}
```

**Stencil Events:**
```typescript
@Component({ tag: 'my-input' })
export class MyInput {
  @Prop() value: string = '';

  @Event({ eventName: 'valueChange', bubbles: true, composed: true })
  valueChange: EventEmitter<{ value: string; timestamp: number }>;

  @Event({ eventName: 'submit' })
  submit: EventEmitter<void>;

  @Listen('keydown')
  handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.submit.emit();
    }
  }

  emitChange() {
    this.valueChange.emit({
      value: this.value,
      timestamp: Date.now(),
    });
  }

  render() {
    return (
      <input
        value={this.value}
        onInput={(e) => {
          this.value = (e.target as HTMLInputElement).value;
          this.emitChange();
        }}
      />
    );
  }
}
```

**FAST Events:**
```typescript
class MyInput extends FASTElement {
  @attr value: string = '';

  // Emit with $emit helper (auto-bubbles, auto-composes)
  emitChange() {
    this.$emit('value-change', {
      value: this.value,
      timestamp: Date.now(),
    });
  }

  // Auto-preventDefault unless returning true
  handleSubmit(e: Event) {
    // preventDefault() called automatically
    this.$emit('submit');
    return true; // Opt-out of preventDefault
  }
}

// Template with event binding
const template = html<MyInput>`
  <input
    :value="${x => x.value}"
    @input="${(x, c) => {
      x.value = c.event.target.value;
      x.emitChange();
    }}"
  />
  <button @click="${x => x.handleSubmit}">Submit</button>
`;
```

### 2.7 Dependency Injection & Composition

**Lit Context (Event-based):**
```typescript
import { ContextProvider, consumeContext, createContext } from '@lit/context';

// Create context
const ThemeContext = createContext<string>('theme');

// Provider component
class Parent extends LitElement {
  @provide({ context: ThemeContext })
  theme: string = 'light';

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
  }

  render() {
    return html`
      <button @click=${this.toggleTheme}>Toggle Theme</button>
      <slot></slot>
    `;
  }
}

// Consumer component
class Child extends LitElement {
  @consume({ context: ThemeContext })
  theme: string = 'light';

  render() {
    return html`
      <div class="${this.theme}">
        Current theme: ${this.theme}
      </div>
    `;
  }
}
```

**FAST DI:**
```typescript
import { DI, IRegistry, resolve } from '@microsoft/fast-element/di';

// Define a service
class HttpClient {
  async get(url: string) {
    const response = await fetch(url);
    return response.json();
  }
}

// Register with DI container
const container = DI.createContainer();
container.register(
  HTTPClientRegistration,
  UserServiceRegistration,
);

// Use in component
class MyComponent extends FASTElement {
  private http = resolve(HttpClient);

  async loadData() {
    const data = await this.http.get('/api/data');
    this.data = data;
  }
}

// Scoped DI (per-component)
class ScopedComponent extends FASTElement {
  // Create scoped container
  static container = DI.createContainer();

  private service = resolve(MyService);
}
```

---

## Part 3: Building a Signal-Based Framework

### 3.1 Core Architecture

```
┌─────────────────────────────────────────┐
│  Signals Layer (TC39 or custom)         │
├─────────────────────────────────────────┤
│  Element Base Class                     │
│  - Shadow DOM management                │
│  - Update scheduling (microtask)        │
│  - Lifecycle hooks                      │
├─────────────────────────────────────────┤
│  Template Engine                        │
│  - Tagged template literals             │
│  - Fine-grained DOM updates             │
├─────────────────────────────────────────┤
│  Styling System                         │
│  - Constructible stylesheets            │
│  - Design tokens (optional)             │
├─────────────────────────────────────────┤
│  Composition Layer                      │
│  - Slots, Events, Context, DI           │
└─────────────────────────────────────────┘
```

### 3.2 Core Signals Implementation

```typescript
// signal.ts - Core signal primitives
type Signal<T> = {
  (): T;
  set(value: T): void;
  peek(): T;
};

type Computed<T> = {
  (): T;
  peek(): T;
};

type Effect = {
  dispose(): void;
};

let currentEffect: Effect | null = null;
const signalGraph = new WeakMap<object, Map<string, Set<Effect>>>();

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const subscribers = new Set<Effect>();

  const getter = () => {
    if (currentEffect) {
      subscribers.add(currentEffect);
    }
    return value;
  };

  getter.set = (newValue: T) => {
    if (value !== newValue) {
      value = newValue;
      subscribers.forEach(effect => effect.execute());
    }
  };

  getter.peek = () => value;

  return getter;
}

export function computed<T>(fn: () => T): Computed<T> {
  let cached: T;
  let dirty = true;
  const subscribers = new Set<Effect>();

  const getter = () => {
    if (currentEffect) {
      subscribers.add(currentEffect);
    }

    if (dirty) {
      const prev = currentEffect;
      const computeEffect: Effect = {
        execute() {
          dirty = true;
          subscribers.forEach(e => e.execute());
        },
        dispose() {}
      };
      currentEffect = computeEffect;
      cached = fn();
      currentEffect = prev;
      dirty = false;
    }

    return cached;
  };

  getter.peek = () => {
    const prev = currentEffect;
    currentEffect = null;
    const value = getter();
    currentEffect = prev;
    return value;
  };

  return getter;
}

export function effect(fn: () => void): Effect {
  const effect: Effect = {
    execute() {
      const prev = currentEffect;
      currentEffect = effect;
      fn();
      currentEffect = prev;
    },
    dispose() {
      // Cleanup subscriptions
    }
  };

  effect.execute();
  return effect;
}

export function batch(fn: () => void) {
  // Group multiple signal updates
  fn();
}

export function untrack<T>(fn: () => T): T {
  const prev = currentEffect;
  currentEffect = null;
  const result = fn();
  currentEffect = prev;
  return result;
}

export function onCleanup(fn: () => void) {
  if (currentEffect) {
    const originalDispose = currentEffect.dispose;
    currentEffect.dispose = () => {
      fn();
      originalDispose();
    };
  }
}

export function createRoot(fn: (dispose: () => void) => void): () => void {
  const effects: Effect[] = [];
  const dispose = () => {
    effects.forEach(e => e.dispose());
    effects.length = 0;
  };

  fn(dispose);
  return dispose;
}
```

### 3.3 Element Base Class

```typescript
// element.ts
import { effect, Signal, onCleanup } from './signals';

export class SignalElement extends HTMLElement {
  private _effects: Effect[] = [];
  private _updateScheduled = false;
  private _renderRoot: ShadowRoot;

  constructor() {
    super();
    this._renderRoot = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this._setupEffects();
    this.requestUpdate();
  }

  disconnectedCallback() {
    this._cleanupEffects();
  }

  private _setupEffects() {
    // Override in subclasses to set up signal subscriptions
  }

  private _cleanupEffects() {
    this._effects.forEach(e => e.dispose());
    this._effects.length = 0;
  }

  requestUpdate() {
    if (!this._updateScheduled) {
      this._updateScheduled = true;
      queueMicrotask(() => {
        this.performUpdate();
        this._updateScheduled = false;
      });
    }
  }

  protected performUpdate() {
    // Override in subclasses to render
    const template = this.render();
    this._renderRoot.innerHTML = '';
    this._renderRoot.appendChild(template);
  }

  render(): DocumentFragment | HTMLElement {
    // Override in subclasses
    return document.createDocumentFragment();
  }

  // Helper to create effects tied to component lifecycle
  createEffect(fn: () => void) {
    const e = effect(fn);
    this._effects.push(e);
    return e;
  }
}
```

### 3.4 Template Engine

```typescript
// template.ts
export function html(strings: TemplateStringsArray, ...values: any[]): DocumentFragment {
  const template = document.createElement('template');
  let html = '';

  strings.forEach((str, i) => {
    html += str;
    if (i < values.length) {
      html += `<!--marker-${i}-->`;
    }
  });

  template.innerHTML = html;
  const fragment = template.content.cloneNode(true) as DocumentFragment;

  // Walk through and bind values to markers
  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_COMMENT);
  let marker: Comment | null;
  let valueIndex = 0;

  while ((marker = walker.nextNode() as Comment)) {
    if (marker.nodeValue?.startsWith('marker-')) {
      const value = values[valueIndex++];
      const parent = marker.parentNode!;

      if (typeof value === 'function') {
        // Signal binding
        const textNode = document.createTextNode('');
        parent.replaceChild(textNode, marker);
        effect(() => {
          textNode.textContent = value();
        });
      } else if (value instanceof Node) {
        parent.replaceChild(value, marker);
      } else {
        const textNode = document.createTextNode(String(value));
        parent.replaceChild(textNode, marker);
      }
    }
  }

  return fragment;
}

export function css(strings: TemplateStringsArray, ...values: any[]): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  let css = strings.join('');
  sheet.replaceSync(css);
  return sheet;
}
```

### 3.5 Complete Component Example

```typescript
// my-counter.ts
import { SignalElement } from './element';
import { signal, computed, effect, html, css } from './index';

export class MyCounter extends SignalElement {
  // Signals
  private count = signal(0);
  private doubled = computed(() => this.count() * 2);

  // Styles
  static styles = css`
    :host { display: block; }
    .counter { padding: 16px; }
    button { margin: 4px; }
  `;

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    // Setup effects
    this.createEffect(() => {
      console.log('Count changed:', this.count());
    });
  }

  increment() {
    this.count.set(this.count() + 1);
    this.requestUpdate();
  }

  decrement() {
    this.count.set(this.count() - 1);
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="counter">
        <h2>Count: ${this.count()}</h2>
        <p>Doubled: ${this.doubled()}</p>
        <button @click=${() => this.decrement()}>-</button>
        <button @click=${() => this.increment()}>+</button>
      </div>
    `;
  }
}

// Register the element
customElements.define('my-counter', MyCounter);
```

### 3.6 Context System

```typescript
// context.ts
type Context<T> = {
  id: symbol;
  defaultValue: T;
};

type Provider<T> = {
  provide(value: T): void;
};

type Consumer<T> = {
  consume(): T;
};

export function createContext<T>(defaultValue: T): Context<T> {
  return {
    id: Symbol(),
    defaultValue,
  };
}

export function provide<T>(context: Context<T>, value: T): Provider<T> {
  return {
    provide(v: T) {
      // Store value and notify consumers
    }
  };
}

export function consume<T>(context: Context<T>): Consumer<T> {
  return {
    consume(): T {
      // Look up the value from nearest provider
      return context.defaultValue;
    }
  };
}
```

### 3.7 Event System

```typescript
// events.ts
export function emit(element: HTMLElement, eventName: string, detail?: any) {
  element.dispatchEvent(new CustomEvent(eventName, {
    detail,
    bubbles: true,
    composed: true,
  }));
}

export function listen(
  element: HTMLElement,
  eventName: string,
  handler: (e: Event) => void,
  options?: AddEventListenerOptions
) {
  element.addEventListener(eventName, handler, options);
  return () => element.removeEventListener(eventName, handler, options);
}

export function delegate(
  container: HTMLElement,
  selector: string,
  eventName: string,
  handler: (e: Event) => void
) {
  const listener = (e: Event) => {
    const target = (e.target as HTMLElement).closest(selector);
    if (target && container.contains(target)) {
      handler(e);
    }
  };
  container.addEventListener(eventName, listener);
  return () => container.removeEventListener(eventName, listener);
}

// Event modifiers
export function prevent(handler: (e: Event) => void) {
  return (e: Event) => {
    e.preventDefault();
    handler(e);
  };
}

export function stop(handler: (e: Event) => void) {
  return (e: Event) => {
    e.stopPropagation();
    handler(e);
  };
}

export function once(handler: (e: Event) => void) {
  let called = false;
  return (e: Event) => {
    if (!called) {
      called = true;
      handler(e);
    }
  };
}
```

---

## Part 4: API Primitives — Problem → Solution

Each primitive solves a specific problem in web component development.

### 4.1 Signals Layer

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`signal()`** | State changes don't update UI automatically | Manual DOM manipulation on every state change | `count.set(5)` → DOM updates automatically |
| **`computed()`** | Derived state recalculates on every access | Redundant calculations, stale values | `doubled = computed(() => count() * 2)` → only recalculates when `count` changes |
| **`effect()`** | Side effects (logging, API calls) need to run when state changes | Manual subscription management, memory leaks | `effect(() => fetch(count()))` → auto-reruns on change, auto-cleans on disconnect |
| **`batch()`** | Multiple state changes cause multiple re-renders | N renders for N changes | `batch(() => { a.set(1); b.set(2); })` → 1 render |
| **`untrack()`** | Reading state subscribes to it (unwanted side effect) | Accidental re-runs, infinite loops | `untrack(() => name())` → read without subscribing |
| **`peek()`** | Need current value without triggering effect | Subscription created, effect re-runs | `peek(() => count())` → one-time read |
| **`onCleanup()`** | Effects need cleanup (timers, subscriptions) | Memory leaks, stale subscriptions | `onCleanup(() => clearInterval(id))` → runs on dispose |
| **`createRoot()`** | No way to own and dispose a group of effects | Manual cleanup of multiple effects | `dispose = createRoot(...)` → `dispose()` cleans all |
| **`produce()`** | Immutable state updates are verbose | `items.set([...items(), newItem])` | `produce(items, draft => draft.push(new))` |

**Concrete Example:**
```typescript
// Problem: Counter needs to update UI when count changes
// Without signal:
let count = 0;
document.getElementById('display').textContent = count; // Manual!
document.getElementById('btn').onclick = () => {
  count++;
  document.getElementById('display').textContent = count; // Manual again!
};

// With signal:
const count = signal(0);
html`<div>${count()}</div>` // Auto-updates
html`<button @click=${() => count.set(count() + 1)}>+</button>` // Just set, no manual DOM
```

---

### 4.2 Element Base Class

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`SignalElement`** | Every component needs Shadow DOM, lifecycle, update scheduling | Copy-paste boilerplate for every component | Extend once, get everything |
| **`attachShadow()`** | Styles leak between components | Global CSS conflicts | `this.attachShadow({mode: 'open'})` → isolated styles |
| **`requestUpdate()`** | Manual DOM updates on every state change | Verbose, error-prone DOM manipulation | Call once → microtask batches and renders |
| **`connectedCallback`** | Need to know when element enters DOM | No lifecycle awareness | `connectedCallback()` → setup listeners, start effects |
| **`disconnectedCallback`** | Need to clean up when element leaves DOM | Memory leaks from orphaned listeners | `disconnectedCallback()` → cleanup effects, listeners |

**Concrete Example:**
```typescript
// Problem: Component needs to fetch data when mounted, clean up on unmount
// Without base class:
class MyEl extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = '<div>Loading...</div>';
    fetch('/api/data').then(r => r.json()).then(data => {
      this.shadowRoot.innerHTML = `<div>${data.name}</div>`;
    });
  }
  disconnectedCallback() {
    // What to clean up? Nothing tracked.
  }
}

// With SignalElement:
class MyEl extends SignalElement {
  private data = signal(null);

  connectedCallback() {
    super.connectedCallback();
    this.createEffect(() => {
      // Auto-tracks signal dependencies
      // Auto-cleans on disconnect
      fetch('/api/data').then(r => r.json()).then(d => this.data.set(d));
    });
  }

  render() {
    return html`<div>${this.data()}</div>`;
  }
}
```

---

### 4.3 Template Engine

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`html` tag** | Templates are string-concatenation hell | `'<div>' + name + '</div>'` (XSS risk) | `` html`<div>${name}</div>` `` (safe, reactive) |
| **Marker comments** | Need to find where dynamic values go in template | Parse HTML string repeatedly | `<!--marker-0-->` → TreeWalker finds once, binds forever |
| **`Show`/`When`** | Conditional rendering tears down/recreates DOM | `if/else` with `innerHTML` (losing state) | `<${Show} when=${cond}>...</${Show}>` → toggles, preserves state |
| **`For` with key** | List re-rendering is O(n²) | Re-render entire list on any change | `key=${item.id}` → only moves/adds/removes changed items |
| **Slots** | No way to pass content into Shadow DOM | Light DOM content inaccessible | `<slot name="header">` → project parent content |
| **`Lazy`** | Large templates load eagerly | Slow initial load, wasted bandwidth | `lazy(() => import('./big.js'))` → load on demand |

**Concrete Example:**
```typescript
// Problem: Render a list of 1000 items, update only one
// Without keyed diffing:
function renderList(items) {
  container.innerHTML = items.map(i => `<div>${i.name}</div>`).join('');
  // Recreates ALL 1000 DOM nodes for ONE change!
}

// With For + key:
html`<${For} each=${() => items} key=${i => i.id}>
  ${(item) => html`<div>${item.name}</div>`}
<//>`
// Only the changed item's DOM node is updated. 999 untouched.
```

---

### 4.4 Styling System

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **Constructible stylesheets** | Same `<style>` tag duplicated per component instance | Memory overhead, style duplication | `new CSSStyleSheet()` → shared across instances |
| **`css` tag** | Styles are strings, no syntax checking | Typos in CSS, no autocomplete | `` css`:host { display: block }` `` → validated, tree-shakeable |
| **Design tokens** | Theming requires changing CSS variables everywhere | Manual `--var` updates, easy to miss | `primaryColor.withDefault('#f00')` → all components update |
| **CSS layers** | Third-party styles override yours | `!important` wars | `@layer base, components` → explicit cascade |
| **Media query signals** | Responsive logic is imperative, hard to test | `window.matchMedia` + manual listeners | `const mobile = useMediaQuery('(max-width: 768px)')` → reactive signal |

**Concrete Example:**
```typescript
// Problem: Theme switching requires updating many CSS variables
// Without tokens:
document.documentElement.style.setProperty('--primary', '#f00');
document.documentElement.style.setProperty('--text', '#fff');
// Must update every variable manually

// With tokens:
const primary = DesignToken.create('primary').withDefault('#3b82f6');
const text = DesignToken.create('text').withDefault('#1f2937');

// Switch theme
primary.withDefault('#ef4444');
text.withDefault('#ffffff');
// All components using these tokens update automatically
```

---

### 4.5 Lifecycle & Observers

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`onMount()`** | Need setup logic when element enters DOM | Override `connectedCallback` every time | `onMount(() => this.init())` → cleaner API |
| **`onUnmount()`** | Need cleanup when element leaves DOM | Override `disconnectedCallback` every time | `onUnmount(() => this.destroy())` → cleaner API |
| **`useResizeObserver()`** | Component needs to respond to size changes | Manual ResizeObserver setup/teardown | `const { width, height } = useResizeObserver()` → reactive signal |
| **`useIntersectionObserver()`** | Lazy loading, infinite scroll, visibility tracking | Complex IntersectionObserver boilerplate | `const { isVisible } = useIntersectionObserver()` → simple boolean |
| **`useMutationObserver()`** | React to DOM changes inside component | Manual MutationObserver setup | `const { mutations } = useMutationObserver()` → reactive |

**Concrete Example:**
```typescript
// Problem: Lazy-load images when they scroll into view
// Without IntersectionObserver:
class LazyImage extends SignalElement {
  connectedCallback() {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadImage();
        this.observer.disconnect();
      }
    }, { threshold: 0.1 });
    this.observer.observe(this);
  }
  disconnectedCallback() {
    this.observer?.disconnect();
  }
}

// With useIntersectionObserver:
class LazyImage extends SignalElement {
  render() {
    const { ref, isVisible } = useIntersectionObserver({ threshold: 0.1 });
    return html`
      <div ref=${ref}>
        ${isVisible() ? html`<img src=${this.src} />` : html`<div class="placeholder" />`}
      </div>
    `;
  }
}
```

---

### 4.6 Event System

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`emit()`** | Custom events are verbose and error-prone | `new CustomEvent('name', {detail, bubbles, composed})` | `this.$emit('name', detail)` → 3 lines → 1 line |
| **`delegate()`** | Many dynamic elements need the same listener | Add/remove listener per element | `delegate(container, '.btn', 'click', handler)` → one listener handles all |
| **`prevent()`/`stop()`** | Event modifiers are boilerplate | `e.preventDefault(); handler(e);` | `@submit=${prevent(onSubmit)}` → declarative |
| **`createBus()`** | Cross-component communication is complex | Props drilling, global variables | `bus.on('user:created', handler)` → decoupled |
| **`stream()`** | Async event handling is callback-heavy | Nested callbacks, hard to compose | `for await (const e of stream(bus, 'click'))` → clean async |

**Concrete Example:**
```typescript
// Problem: Form submission needs preventDefault + validation
// Without modifiers:
html`<form @submit=${(e) => {
  e.preventDefault();
  e.stopPropagation();
  this.handleSubmit(e);
}}>...</form>`

// With modifiers:
html`<form @submit=${prevent(stop(this.handleSubmit))}>...</form>`
```

---

### 4.7 Composition & DI

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`provide()`/`inject()`** | Props drilling through many levels | Pass props through 5+ components | Parent provides, deep child injects |
| **`mixin()`** | Shared behavior across unrelated components | Copy-paste code, deep inheritance | `class MyEl extends Draggable(Resizable(Component))` |
| **`withTheme()`** | Theme access needed in many components | Pass theme prop everywhere | `class MyEl extends withTheme(Component)` → `this.theme` |
| **`ErrorBoundary`** | One component crash kills entire app | Unhandled errors crash UI | `<${ErrorBoundary} fallback=${...}>` → catches, shows fallback |
| **`Suspense`** | Async data loading blocks UI | Spinner logic in every component | `<${Suspense} fallback=${...}>` → shows fallback while loading |

**Concrete Example:**
```typescript
// Problem: Theme needed in deeply nested component
// Without context:
<app>
  <header theme=${theme}>
    <nav theme=${theme}>
      <button theme=${theme}>Click</button>  // theme passed 3 levels!
    </nav>
  </header>
</app>

// With provide/inject:
const ThemeContext = createContext('light');

class App extends Component {
  provide('theme', this.theme);  // Provide once
}

class Button extends Component {
  theme = consume(ThemeContext);  // Inject anywhere
}
```

---

### 4.8 Performance

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`memo()`** | Expensive computations run on every render | Recalculate on every state change | `memo(fn, {equals: shallowEqual})` → only when inputs change |
| **`lazy()`** | Large components slow initial load | Bundle everything upfront | `lazy(() => import('./Big.js'))` → code-split |
| **`virtualScroll`** | 10,000 items can't all be in DOM | Browser crashes, slow scroll | Render only visible items (~20), recycle DOM nodes |
| **`idleSchedule()`** | Heavy work blocks main thread | Janky UI during computation | `idleSchedule(() => process())` → runs when browser idle |

**Concrete Example:**
```typescript
// Problem: Render 10,000 list items without freezing
// Without virtual scroll:
html`<div>
  ${items.map(item => html`<div>${item.name}</div>`)}
</div>`  // 10,000 DOM nodes = crash

// With virtual scroll:
html`<${virtualScroll} items=${items} height=${500} itemHeight=${40}>
  ${(item) => html`<div>${item.name}</div>`}
<//>`
// Only ~15 DOM nodes exist at any time
```

---

### 4.9 SSR & Hydration

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **DSD output** | Screen shows blank until JS loads | White flash, bad SEO | `<template shadowrootmode="open">` → browser renders HTML before JS |
| **Resumability** | Hydration runs ALL component JS on load | Slow time-to-interactive | Serialize state to HTML, load JS only on interaction |
| **Progressive hydration** | All components hydrate at once | Delayed interactivity | Hydrate visible components first, rest on demand |

**Concrete Example:**
```typescript
// Problem: User sees blank page for 2 seconds while JS loads
// Without SSR:
// 1. Browser downloads HTML (empty shell)
// 2. Browser downloads JS bundle
// 3. JS executes, renders components
// 4. User sees content (2s delay)

// With DSD:
// 1. Server renders <template shadowrootmode="open"> with content
// 2. Browser shows content immediately (0ms)
// 3. JS loads in background
// 4. JS hydrates interactive parts
```

---

### 4.10 Testing

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`render()`** | Testing components requires DOM setup | `document.createElement`, manual cleanup | `render(Component)` → auto-setup, auto-cleanup |
| **`fireEvent()`** | Simulating user interaction is verbose | `new MouseEvent(...)`, `dispatchEvent` | `fireEvent.click(element)` → one line |
| **`waitFor()`** | Async assertions are flaky | `setTimeout` hacks, race conditions | `waitFor(() => expect(...))` → proper async waiting |
| **`mockSignal()`** | Testing signal behavior is manual | Create real signals, track manually | `mockSignal(initial)` → controllable mock |

**Concrete Example:**
```typescript
// Problem: Test that clicking button updates counter
// Without testing utilities:
it('increments counter', async () => {
  const el = document.createElement('my-counter');
  document.body.appendChild(el);
  await el.updateComplete;

  const btn = el.shadowRoot.querySelector('button');
  btn.click();
  await el.updateComplete;

  expect(el.count).toBe(1);
  document.body.removeChild(el); // Manual cleanup
});

// With testing utilities:
it('increments counter', async () => {
  const { getByText } = render(MyCounter);

  await fireEvent.click(getByText('+'));

  expect(getByText('Count: 1')).toBeTruthy();
  // Auto-cleanup
});
```

---

### 4.11 Accessibility

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`aria()`** | ARIA attributes are verbose strings | `aria-pressed="${pressed}"` | `aria({ pressed: isPressed })` → type-safe |
| **`useFocus()`** | Focus management across Shadow DOM | Manual `element.focus()`, tab trapping | `const { ref, focus, blur } = useFocus()` → reactive |
| **`useKeyboard()`** | Keyboard navigation is repetitive | `addEventListener('keydown', ...)` per key | `useKeyboard({ Enter: handler })` → declarative |
| **`announce()`** | Screen reader announcements are tricky | Create live regions manually | `announce('Added to cart', 'polite')` → one line |
| **`liveRegion()`** | Dynamic content not announced | ARIA live region boilerplate | `liveRegion('polite')` → auto-announces changes |

**Concrete Example:**
```typescript
// Problem: Announce status changes to screen readers
// Without a11y primitives:
html`<div aria-live="polite" aria-atomic="true" role="status"
  id="announcer"></div>`;

// After state change:
document.getElementById('announcer').textContent = 'Item added to cart';

// With announce():
announce('Item added to cart', 'polite');
// Creates live region, sets text, cleans up automatically
```

---

### 4.12 Animation

| Primitive | Problem It Solves | Without It | With It |
|-----------|-------------------|-------------|---------|
| **`animate()`** | CSS animations need class toggling | Manual classList.add/remove | `animate('fade', {duration: 300})` → declarative |
| **`useGesture()`** | Touch/gesture handling is complex | Touch event math, velocity calc | `useGesture({ onSwipe: handler })` → simple API |
| **`useScrollAnimation()`** | Scroll-based animations need rAF loops | Manual scroll listener + rAF | `useScrollAnimation()` → reactive progress signal |
| **`viewTransition()`** | Page transitions are jarring | No native transition API | `viewTransition(() => {...})` → native 60fps transitions |

**Concrete Example:**
```typescript
// Problem: Animate element when it appears
// Without animation primitive:
class MyEl extends SignalElement {
  connectedCallback() {
    this.shadowRoot.querySelector('.box').animate([
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 300, easing: 'ease-out' });
  }
}

// With animate():
html`<div ${animate('slide-in', { duration: 300 })}>Content</div>`
// CSS @keyframes defined once, applied declaratively
```

---

## Part 5: Pruned Primitives (Redundant/Unnecessary)

### Removed Primitives

| Primitive | Why Removed |
|-----------|-------------|
| **`peek()`** | Redundant with `untrack()`. Both read without subscribing. `untrack()` is the standard name (Solid, TC39). |
| **`onMount()`/`onUnmount()`** | Redundant with `connectedCallback`/`disconnectedCallback`. These are native Custom Element lifecycle hooks — adding wrappers adds complexity without benefit. |
| **`onRender()`/`onUpdate()`** | Nice-to-have but rarely needed. Override `performUpdate()` directly instead. |
| **`withTheme()`** | Redundant with `provide/inject`. Theme is just a context — no special primitive needed. |
| **`liveRegion()`** | Redundant with `announce()`. `announce()` creates a live region internally. |
| **`stream()`** | Too niche. Events are fire-and-forget by design. Streaming events add complexity for rare use cases. |
| **`useGesture()`** | Too niche for a core framework. Touch/gesture handling is app-specific, not component-specific. |
| **`mockSignal()`** | Test utility, not a framework primitive. Use real signals in tests. |
| **`produce()`** | Nice-to-have. Immutable updates are verbose but predictable. Can be added later as opt-in. |
| **CSS layers** | Browser feature, not a framework primitive. Use `@layer` directly in CSS. |
| **Progressive hydration** | Advanced SSR feature. Defer to SSR-specific libraries. |

### Kept Primitives (Essential + Important)

**Tier 1: Must-have (core framework won't work without these)**
- `signal()`, `computed()`, `effect()`
- `batch()`, `untrack()`, `onCleanup()`
- `createRoot()`
- `SignalElement` base class
- `html` tagged template
- `css` tagged template
- `Show`/`For` control flow
- `provide()`/`inject()`
- `ErrorBoundary`

**Tier 2: Important (production-quality framework needs these)**
- `delegate()`
- `prevent()`/`stop()`
- `Suspense`
- `memo()`, `lazy()`
- `aria()`
- `render()`, `fireEvent()`, `waitFor()`

**Tier 3: Nice-to-have (can be added later or as plugins)**
- `DesignToken`
- `useResizeObserver()`, `useIntersectionObserver()`
- `virtualScroll`
- `announce()`
- `useFocus()`, `useKeyboard()`
- `animate()`
- `viewTransition()`
- DSD output, Resumability

---

## Part 6: Missing Primitives (Not Yet Covered)

These primitives are missing from the current list and are important for a complete framework.

### 6.1 `resource()` — Async Data Fetching

**Problem**: Every component that fetches data needs the same boilerplate (loading state, error state, refetch).

```typescript
// Without resource:
class UserCard extends SignalElement {
  user = signal(null);
  loading = signal(true);
  error = signal(null);

  async loadUser(id: number) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`/api/users/${id}`);
      this.user.set(await res.json());
    } catch (e) {
      this.error.set(e);
    } finally {
      this.loading.set(false);
    }
  }
}

// With resource:
const user = resource(
  () => this.userId,  // dependency signal
  async (id) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  }
);

// In template:
html`
  <${Suspense} fallback=${html`<div>Loading...</div>`}>
    <div>${() => user.data()?.name}</div>
  <//>
  <${Show} when=${() => user.error()}>
    <div class="error">${() => user.error()?.message}</div>
  <//>
`
```

### 6.2 `createContext()` — Standalone Context Creation

**Problem**: Context creation is tied to decorators or class syntax. Need a simple function.

```typescript
// Current (requires decorators):
@provide({ context: ThemeContext })
theme = 'light';

// Better (standalone function):
const ThemeContext = createContext('light');

// Provider
function ThemeProvider({ children }) {
  const theme = signal('light');
  provide(ThemeContext, theme);
  return children;
}

// Consumer
function ThemedButton() {
  const theme = useContext(ThemeContext);
  return html`<button style="background: ${theme() === 'dark' ? '#333' : '#fff'}">
    Click
  </button>`;
}
```

### 6.3 `useStore()` — Cross-Component State

**Problem**: Signals are component-local. Need shared state without prop drilling or context.

```typescript
// Without store:
// Each component creates its own signals, no shared state

// With store:
const counterStore = createStore({
  count: signal(0),
  increment() { this.count.set(this.count() + 1); },
  decrement() { this.count.set(this.count() - 1); },
});

// In any component:
class MyCounter extends SignalElement {
  private store = useStore(counterStore);

  render() {
    return html`
      <div>Count: ${this.store.count()}</div>
      <button @click=${() => this.store.decrement()}>-</button>
      <button @click=${() => this.store.increment()}>+</button>
    `;
  }
}
```

### 6.4 `useTransition()` — Async Transitions

**Problem**: Async state updates cause janky UI (loading spinners everywhere).

```typescript
// Without transition:
const data = signal(null);
const loading = signal(false);

async function fetchData() {
  loading.set(true);  // UI flickers to loading state
  data.set(await api.getData());
  loading.set(false);
}

// With transition:
const data = signal(null);
const isPending = useTransition();

async function fetchData() {
  isPending(true);  // Show stale content + pending indicator
  data.set(await api.getData());
  isPending(false);  // Swap to new content
}

// In template:
html`<div class="${isPending() ? 'stale' : 'fresh'}">
  ${data()}
</div>`
```

### 6.5 `useId()` — Stable Unique IDs

**Problem**: ARIA relationships need matching IDs across components. Random IDs break on re-render.

```typescript
// Without useId:
class MyInput extends SignalElement {
  render() {
    const id = Math.random().toString(36).slice(2); // Changes on every render!
    return html`
      <input id=${id} aria-describedby=${`error-${id}`} />
      <div id=${`error-${id}`}>Error message</div>
    `;
  }
}

// With useId:
class MyInput extends SignalElement {
  render() {
    const id = useId(); // Stable across re-renders
    return html`
      <input id=${id} aria-describedby=${`${id}-error`} />
      <div id=${`${id}-error`}>Error message</div>
    `;
  }
}
```

### 6.6 `useModel()` — Two-Way Binding

**Problem**: Two-way binding requires verbose event handlers.

```typescript
// Without model:
html`<input
  :value="${x => x.name}"
  @input="${(x, c) => x.name = c.event.target.value}"
/>`

// With model:
html`<input :model="${x => x.name}" />`
// Automatically syncs value ↔ attribute ↔ signal
```

### 6.7 ` портал()` — Render Outside Shadow DOM

**Problem**: Modals, tooltips, popovers need to render outside component's Shadow DOM.

```typescript
// Without portal:
// Must use light DOM or global overlay system

// With portal:
html`<${Portal} target=${document.body}>
  <div class="modal-overlay">
    <div class="modal">Content</div>
  </div>
<//>`
// Renders in document.body, but scoped to component's signals
```

### 6.8 `useMediaQuery()` — Responsive Signals

**Problem**: Responsive design requires imperative `matchMedia` listeners.

```typescript
// Without:
const mql = window.matchMedia('(max-width: 768px)');
const isMobile = signal(mql.matches);
mql.addEventListener('change', (e) => isMobile.set(e.matches));

// With:
const isMobile = useMediaQuery('(max-width: 768px)');
// Reactive signal, auto-cleanup on disconnect

// In template:
html`<div>${isMobile() ? 'Mobile layout' : 'Desktop layout'}</div>`
```

### 6.9 `useFetch()` — Data Fetching with Caching

**Problem**: Every fetch call needs cache invalidation, deduplication, revalidation logic.

```typescript
// Without:
// Manual cache management, race conditions, stale data

// With:
const { data, error, isLoading, refetch } = useFetch('/api/users', {
  // Dedup concurrent requests
  dedupe: true,
  // Revalidate on focus
  revalidateOnFocus: true,
  // Cache for 5 minutes
  cache: { ttl: 5 * 60 * 1000 },
});

// In template:
html`
  <${Show} when=${isLoading}>
    <div>Loading...</div>
  <//>
  <${Show} when=${() => error()}>
    <div>Error: ${() => error()?.message}</div>
  <//>
  <${Show} when=${() => data()}>
    <div>${() => data()?.name}</div>
  <//>
`
```

### 6.10 `useOnline()` — Network Status

**Problem**: Offline/online detection is boilerplate.

```typescript
// Without:
const online = signal(navigator.onLine);
window.addEventListener('online', () => online.set(true));
window.addEventListener('offline', () => online.set(false));

// With:
const online = useOnline();
// Reactive signal, auto-cleanup

// In template:
html`<div class="status-dot ${online() ? 'green' : 'red'}"></div>`
```

### 6.11 `useInterval()` — Timer Hook

**Problem**: `setInterval` needs cleanup, pause/resume, and signal integration.

```typescript
// Without:
let timer;
connectedCallback() {
  timer = setInterval(() => this.tick(), 1000);
}
disconnectedCallback() {
  clearInterval(timer);
}

// With:
useInterval(() => this.tick(), 1000);
// Auto-cleanup on disconnect, pause/resume support

// With pause:
const [start, stop] = useInterval(() => this.tick(), 1000);
html`<button @click=${stop}>Pause</button>`
```

### 6.12 `useClickOutside()` — Click Outside Detection

**Problem**: Dropdowns, modals need to close on outside click. Boilerplate to implement correctly.

```typescript
// Without:
connectedCallback() {
  this.handler = (e) => {
    if (!this.contains(e.target)) this.close();
  };
  document.addEventListener('click', this.handler);
}
disconnectedCallback() {
  document.removeEventListener('click', this.handler);
}

// With:
useClickOutside(() => this.close());
// Auto-cleanup, handles Shadow DOM correctly
```

---

## Part 7: Missing Primitives Reference

### Highlight: Top API Primitives & The Problems They Solve

Before diving into the exhaustive list, here are the most critical primitives you need when building a custom framework, and exactly what problems they solve:

1. **`ElementInternals` (`@formAssociated`)**
   * **The Problem:** Web Components act like opaque boxes to native `<form>` tags. A custom `<my-checkbox>` won't submit its data in a standard form post, nor will it respond to CSS pseudo-classes like `:state(invalid)` out of the box, forcing developers to hack hidden inputs.
   * **The Solution:** The `attachInternals()` API allows your Web Component to seamlessly participate in form submissions, report custom validity, and natively use modern CSS `:state()` selectors.

2. **`untrack()` (or `peek()`) in Signals**
   * **The Problem:** Sometimes you need to read a Signal's value inside an `effect()`, but you *don't* want that effect to re-run when the Signal changes. For example, logging a network request that includes the current `filter` state, without re-triggering the network request every time `filter` changes.
   * **The Solution:** `untrack(() => filter())` lets you read the current value while temporarily pausing the dependency tracker, preventing infinite loops and over-rendering.

3. **`batch()` for Signals**
   * **The Problem:** If you update three separate signals synchronously (`firstName.set('A'); lastName.set('B'); age.set('C');`), the reactivity system might trigger three separate DOM render cycles, causing UI thrashing and terrible performance.
   * **The Solution:** `batch(() => { ... })` groups all signal updates into a single transaction, ensuring the DOM is only updated exactly once after the block completes.

4. **Declarative `<Suspense>`**
   * **The Problem:** Handling async data fetching in UI usually requires messy boilerplate: `if (loading) return <Spinner/>; else return <Data/>;`. If a component deep in the tree fetches data, the parent has to awkwardly manage that state to prevent layout jumps.
   * **The Solution:** A `<Suspense>` wrapper automatically catches unresolved Promises originating from its children and renders a fallback UI, then hot-swaps to the final DOM once the data arrives, keeping components clean and focused.

5. **DOM `Part` Bindings (Instead of Virtual DOM)**
   * **The Problem:** Virtual DOMs (like Stencil) require re-rendering the entire component tree into memory and running a diffing algorithm on every state change, eating up CPU and memory.
   * **The Solution:** Tagged templates (like Lit/FAST) parse once into a `<template>` and map dynamic variables to exact `Part` references (e.g., a specific text node). When state changes, it directly mutates `node.textContent = newValue`, bypassing diffing entirely.

---### Template Engine

| Primitive | Description |
|-----------|-------------|
| `Show`/`Choose`/`When`/`Otherwise` | Conditional rendering |
| `For` with keyed diffing | List rendering |
| Slot management | Named/default/conditional slots |
| Template fragments | Composable template pieces |
| `Lazy` | Lazy template loading |

**Control Flow Components:**
```typescript
// Show component
export function Show(props: { when: () => boolean; fallback?: () => Node; children: () => Node }) {
  return () => props.when() ? props.children() : (props.fallback?.() ?? null);
}

// Choose component
export function Choose(props: { children: () => Node[] }) {
  return () => props.children();
}

// When component
export function When(props: { when: () => boolean; children: () => Node }) {
  return () => props.when() ? props.children() : null;
}

// For component with keyed diffing
export function For<T>(props: { each: () => T[]; key: (item: T) => string | number; children: (item: T) => Node }) {
  let previousKeys = new Map<string | number, Node>();

  return () => {
    const items = props.each();
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
      const key = props.key(item);
      let node = previousKeys.get(key);

      if (!node) {
        node = props.children(item);
        previousKeys.set(key, node);
      }

      fragment.appendChild(node);
    });

    return fragment;
  };
}

// Usage
html`
  <${Show} when=${() => this.isLoggedIn} fallback=${() => html`<p>Please login</p>`}>
    <p>Welcome back, ${this.user.name}!</p>
  <//>

  <${For} each=${() => this.items} key=${(item) => item.id}>
    ${(item) => html`<div>${item.name}</div>`}
  <//>
`;
```

### Advanced Signals

| Primitive | Description |
|-----------|-------------|
| `batch()` | Group multiple updates into one render |
| `untrack()` / `peek()` | Read without subscribing |
| `computed()` with custom equality | Derived state with memoization |
| `onCleanup()` / `onDispose()` | Cleanup hooks for effects |
| `createRoot()` | Owned signal graph (auto-dispose) |
| `produce()` | Immer-style mutations |

**Batch and Untrack:**
```typescript
// Batch multiple updates
batch(() => {
  this.firstName.set('John');
  this.lastName.set('Doe');
  this.age.set(30);
  // Only one render cycle
});

// Read without subscribing
effect(() => {
  const name = untrack(() => this.name()); // Won't trigger re-run
  const count = this.count(); // Will trigger re-run
  return `${name}: ${count}`;
});

// Peek - one-time read without subscription
const value = this.count.peek();
```

### Component Primitives

| Primitive | Description |
|-----------|-------------|
| `@prop()` with attribute reflection | Auto property↔attribute sync |
| `ref()` | Element references |
| `useId()` | Unique ID generation (survives SSR hydration) |
| `createResource()` | Async data fetching integrated with Suspense |
| `ErrorBoundary` / `catchError()` | Catch child errors and signal errors |
| `Portal` | Render to different DOM node |

**Ref and Portal:**
```typescript
// Ref
const inputRef = ref();
html`<input ref=${inputRef} />`;
// Later: inputRef.current.focus();

// Portal
html`<${Portal} target=${document.body}>
  <div>Rendered in body</div>
<//>`;

// Error Boundary
html`<${ErrorBoundary}
  fallback=${(err, retry) => html`
    <div class="error">
      <p>Error: ${err.message}</p>
      <button @click=${retry}>Retry</button>
    </div>
  `}
>
  <${RiskyComponent} />
<//>`;

// Suspense
html`<${Suspense} fallback=${html`<div>Loading...</div>`}>
  <${AsyncComponent} />
<//>`;
```

### Lifecycle Primitives

| Primitive | Description |
|-----------|-------------|
| `onMount()` / `onUnmount()` | DOM connect/disconnect |
| `onRender()` / `onUpdate()` | Pre/post render callbacks |
| `useResizeObserver()` | Size tracking |
| `useIntersectionObserver()` | Visibility tracking |
| `useMutationObserver()` | DOM mutation tracking |

**Observer Hooks:**
```typescript
// ResizeObserver
const { ref, width, height } = useResizeObserver();
html`<div ref=${ref}>Size: ${width}x${height}</div>`;

// IntersectionObserver
const { ref, isVisible } = useIntersectionObserver({ threshold: 0.5 });
html`<div ref=${ref}>${isVisible ? 'Visible' : 'Hidden'}</div>`;

// MutationObserver
const { ref, mutations } = useMutationObserver({ childList: true });
html`<div ref=${ref}>...</div>`;

// Idle/Visible
onIdle(() => loadHeavyResource());
onVisible(() => startAnimation());
```

### Event System

| Primitive | Description |
|-----------|-------------|
| `delegate()` | Event delegation |
| `createEvent()` | Custom event factory |
| `prevent()`/`stop()`/`once()` | Event modifiers |
| `isServer` / `hydrate()` | SSR context flags and hydration hooks |

**Event Stream & SSR:**
```typescript
// Event stream
for await (const event of stream(document.body, 'click')) {
  console.log('Click:', event);
}

// SSR check
if (!isServer) {
  hydrate(document.body, MyComponent);
}
```

### Styling

| Primitive | Description |
|-----------|-------------|
| Dynamic CSS with signals | `` css`${() => theme()}` `` |
| `createTheme()`/`useTheme()` | Design token system |
| `useMediaQuery()` | Responsive signals |
| CSS layers | `@layer` support |
| `useContainerQuery()` | Container queries |

**Dynamic Styles:**
```typescript
// Dynamic CSS with signal integration
const styles = css`
  .container {
    background: ${() => theme() === 'dark' ? '#000' : '#fff'};
    color: ${() => theme() === 'dark' ? '#fff' : '#000'};
  }
`;

// Theme tokens
const lightTheme = createTheme({
  colors: { primary: '#3b82f6', background: '#ffffff' },
  spacing: { sm: '4px', md: '8px', lg: '16px' }
});

// Media query signals
const isMobile = useMediaQuery('(max-width: 768px)');
html`<div>${isMobile() ? 'Mobile' : 'Desktop'}</div>`;

// CSS layers
const styles = layers('base', 'components', 'utilities')`
  @layer base { :host { display: block; } }
  @layer components { .btn { padding: 8px; } }
`;
```

### Performance

| Primitive | Description |
|-----------|-------------|
| `memo()` | Memoization |
| `lazy()` | Lazy component loading |
| `virtualScroll` | Virtual scrolling |
| `idleSchedule()` | Idle-time scheduling |

**Memo and Lazy:**
```typescript
// Memoization
const memoizedFn = memo(fn, { equals: shallowEqual });

// Lazy loading
const HeavyComponent = lazy(() => import('./HeavyComponent.js'));

// Virtual scrolling
html`<${virtualScroll} items=${items} height=${500} itemHeight=${50}>
  ${(item) => html`<div>${item.name}</div>`}
<//>`;

// Idle scheduling
idleSchedule(() => processHeavyTask());
```

### Testing

| Primitive | Description |
|-----------|-------------|
| `render()`/`fireEvent()`/`waitFor()` | Component testing utilities |
| `mockSignal()`/`mockComponent()` | Mock utilities |
| DOM assertions | `toHaveAttribute`, `toHaveClass` |

**Testing Utilities:**
```typescript
// Render component
const { container, getByText, unmount } = render(MyComponent, {
  props: { name: 'World' }
});

// Fire event
await fireEvent.click(getByText('Click me'));

// Wait for async
await waitFor(() => expect(getByText('Updated')).toBeTruthy());

// Mock signal
const mockCount = mockSignal(0);
const MockComponent = mockComponent(MyComponent, { count: mockCount });

// Assertions
expect(getByText('Hello')).toHaveAttribute('data-id', '1');
expect(getByText('Hello')).toHaveClass('active');
expect(container.innerHTML).toMatchSnapshot();
```

### Accessibility

| Primitive | Description |
|-----------|-------------|
| `aria()` | ARIA attribute helpers |
| `useFocus()` | Focus management |
| `useKeyboard()` | Keyboard navigation |
| `announce()` | Screen reader announcements |
| `liveRegion()` | Live regions |

**A11y Utilities:**
```typescript
// ARIA attributes
html`<button ${aria({ pressed: isPressed, label: 'Toggle' })}>...</button>`;

// Focus management
const { ref, focus, blur } = useFocus();
html`<input ref=${ref} />`;

// Keyboard navigation
const { ref } = useKeyboard({
  Enter: () => this.#submit(),
  Escape: () => this.#cancel(),
});

// Screen reader announcements
announce('Item added to cart', 'polite');
html`<div ${liveRegion('polite')}>${statusMessage}</div>`;
```

### Animation

| Primitive | Description |
|-----------|-------------|
| `animate()` | Animation directives |
| `useGesture()` | Gesture support |
| `useScrollAnimation()` | Scroll-driven animations |
| `viewTransition()` | View transitions API |

**Animation Primitives:**
```typescript
// Animation directive
html`<div ${animate('fade', { duration: 300 })}>...</div>`;

// Gesture support
const { ref } = useGesture({
  onDrag: (e) => this.#handleDrag(e),
  onPinch: (e) => this.#handlePinch(e),
});

// Scroll animation
const { ref, progress } = useScrollAnimation();
html`<div ref=${ref} style="opacity: ${progress}">...</div>`;

// View transitions
await viewTransition(() => { /* update DOM */ }).finished;
```

---

## Part 5: Enterprise-Grade Advanced Primitives

### 5.1 ElementInternals & Form Participation

```typescript
class CustomCheckbox extends SignalElement {
  static formAssociated = true;
  private internals: ElementInternals;

  @observable checked = false;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  toggle() {
    this.checked = !this.checked;
    this.internals.setFormValue(this.checked ? 'on' : null);

    // Toggle the :state(checked) CSS pseudo-class natively
    if (this.checked) {
      this.internals.states.add('checked');
    } else {
      this.internals.states.delete('checked');
    }
  }

  checkValidity() {
    return this.internals.checkValidity();
  }

  reportValidity() {
    return this.internals.reportValidity();
  }
}

// CSS pseudo-class usage
html`<style>
  :host(:state(checked)) {
    border: 2px solid green;
  }
  :host(:state(invalid)) {
    border: 2px solid red;
  }
</style>`;
```

### 5.2 Suspense & Async Boundaries

```typescript
// Async signal with pending/error states
function asyncSignal<T>(fn: () => Promise<T>) {
  const data = signal<T | null>(null);
  const pending = signal(true);
  const error = signal<Error | null>(null);

  effect(async () => {
    pending.set(true);
    error.set(null);
    try {
      const result = await fn();
      data.set(result);
    } catch (e) {
      error.set(e as Error);
    } finally {
      pending.set(false);
    }
  });

  return { data, pending, error };
}

// Usage with Suspense
const userData = asyncSignal(async () => {
  const res = await fetch('/api/user');
  return res.json();
});

html`
  <${Suspense} fallback=${html`<div class="spinner">Loading...</div>`}>
    <div>${() => userData.data()?.name}</div>
  <//>

  <${ErrorBoundary} fallback=${(err) => html`<div>Error: ${err}</div>`}>
    <${Suspense} fallback=${html`<div>Loading...</div>`}>
      <${UserProfile} userId=${123} />
    <//>
  <//>
`;
```

### 5.3 Declarative Shadow DOM & Resumability

```typescript
// SSR output with DSD
const html = renderToString(App);
// Output:
// <template shadowrootmode="open">
//   <div>...</div>
// </template>

// Resumability: serialize state to HTML
function serializeSignalGraph(root: any): string {
  const state: Record<string, any> = {};
  // Walk signal graph and serialize
  return JSON.stringify(state);
}

// In SSR template
const ssrOutput = `
  <my-component data-signal-id="comp-1">
    <template shadowrootmode="open">
      <div>Initial content</div>
    </template>
  </my-component>
  <script type="application/json" data-signal-graph>
    ${serializeSignalGraph(rootSignal)}
  </script>
`;

// Client-side hydration (lazy, on interaction)
document.body.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('[data-signal-id]');
  if (target) {
    const signalId = target.dataset.signalId;
    hydrateComponent(signalId);
  }
}, { once: true });
```

### 5.4 View Transition API

```typescript
function useViewTransition(signal: Signal<any>, callback: (value: any) => void) {
  effect(() => {
    const value = signal();
    if (document.startViewTransition) {
      document.startViewTransition(() => callback(value));
    } else {
      callback(value);
    }
  });
}

// Usage
const theme = signal('light');
useViewTransition(theme, (value) => {
  document.body.className = value;
});

// In template
const transition = viewTransition(() => {
  this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
});
await transition.finished;
```

---

## Part 6: Comprehensive FAQ

### Q1: Why do we need decorators?

Decorators provide **Declarative Metaprogramming** to reduce boilerplate:

```typescript
// WITH decorators (clean)
@customElement('my-el')
class MyEl extends LitElement {
  @property({ type: Number, reflect: true }) count = 0;
  @Listen('click') handleClick() { }
}

// WITHOUT decorators (verbose)
class MyEl extends LitElement {
  static get properties() {
    return { count: { type: Number, reflect: true } };
  }
  constructor() { super(); this.count = 0; }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.handleClick);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
  }
}
customElements.define('my-el', MyEl);
```

### Q2: What if we build without decorators?

**Class-based (static properties):**
```javascript
class MyCounter extends LitElement {
  static get properties() { return { count: { type: Number } }; }
  constructor() { super(); this.count = 0; }
  render() { return html`<div>${this.count}</div>`; }
}
customElements.define('my-counter', MyCounter);
```

**Functional (signal-based, no classes):**
```javascript
const MyCounter = defineComponent(() => {
  const count = signal(0);
  return () => html`<div>${count()}</div>`;
});
```

### Q3: What is the TC39 Decorator status?

Stage 3 (stable). Chrome 115+, Edge 115+, Safari 16.4+, TS 5.0+.

Key difference: TC39 decorators don't access `this` — they return descriptor objects.

### Q4: How do decorators work under the hood?

```typescript
// BEFORE (with decorator)
@customElement('my-el')
class MyEl extends HTMLElement {
  @property({ type: Number }) count = 0;
}

// AFTER (compiled output)
class MyEl extends HTMLElement {
  constructor() { super(); this.count = 0; }
}
customElements.define('my-el', MyEl);
Object.defineProperty(MyEl.prototype, 'count', {
  get() { return this._count; },
  set(value) {
    this._count = value;
    this.requestUpdate('count', value);
  }
});
```

### Q5: Trade-offs: decorators vs static vs functional?

| Aspect | Decorators | Static | Functional |
|--------|------------|--------|------------|
| Readability | ✅ Clean | ⚠️ Verbose | ✅ Concise |
| Bundle size | ⚠️ +100-200B | ✅ +0B | ✅ -100-300B |
| IDE support | ✅ Autocomplete | ✅ Full | ⚠️ Limited |
| Tree-shaking | ✅ Excellent | ⚠️ Good | ✅ Excellent |

### Q6: How do I handle property↔attribute synchronization?

```typescript
class MyEl extends SignalElement {
  static get observedAttributes() { return ['count']; }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (name === 'count') {
      this.count = Number(newVal); // Coerce string to number
    }
  }

  // Or with decorator
  @attr({ type: Number, reflect: true })
  count = 0;
}
```

### Q7: How do I implement SSR with signals?

Challenges: Signals are runtime-only, Shadow DOM requires JS.

Solutions:
1. **Static extraction**: Render templates to HTML, skip signal hydration
2. **DSD output**: `<template shadowrootmode="open">` for browser-native rendering
3. **Resumability**: Serialize signal subscriptions into HTML, lazy-load JS on interaction

### Q8: How do I make my framework tree-shakeable?

- Use ES modules exclusively
- Avoid side effects at module level
- Export individual primitives, not bundled objects
- Use `import()` for optional features

### Q9: How do I integrate with React/Vue/Angular?

```typescript
// React wrapper
function createComponent(MyEl: CustomElementConstructor) {
  return React.forwardRef((props: any, ref: any) => {
    const elRef = React.useRef<HTMLElement>(null);
    React.useImperativeHandle(ref, () => elRef.current);

    React.useEffect(() => {
      const el = elRef.current;
      if (!el) return;

      Object.entries(props).forEach(([key, val]) => {
        if (key.startsWith('on')) {
          el.addEventListener(key.slice(2).toLowerCase(), val as EventListener);
        } else {
          (el as any)[key] = val;
        }
      });
    }, [props]);

    return React.createElement(MyEl.tagName, { ref: elRef });
  });
}
```

### Q10: How do I implement design tokens?

```typescript
import { DesignToken } from './tokens';

const primaryColor = DesignToken.create('primary-color').withDefault('#3b82f6');
const spacing = DesignToken.create('spacing').withDefault('8px');

// In component
html`<div style="color: ${primaryColor}; padding: ${spacing}">...</div>`

// Theme switching
primaryColor.withDefault('#ef4444'); // Changes all usages
```

### Q11: What testing primitives do I need?

```typescript
// Render + query
const { container, getByText, unmount } = render(MyComponent, {
  props: { name: 'World' }
});

// Events
await fireEvent.click(getByText('Click me'));
await waitFor(() => expect(getByText('Updated')).toBeTruthy());

// Assertions
expect(getByText('Hello')).toHaveAttribute('data-id', '1');
expect(getByText('Hello')).toHaveClass('active');
expect(container.innerHTML).toMatchSnapshot();
```

### Q12: How do I structure a framework monorepo?

```
packages/
├── signals/          # Core signal primitives
├── element/          # Base class (extends HTMLElement)
├── template/         # Tagged template engine
├── styles/           # CSS/styles system
├── context/          # DI and context API
├── router/           # Client-side routing (optional)
├── ssr/              # Server-side rendering (optional)
├── react/            # React wrapper (optional)
└── devtools/         # Browser devtools (optional)
```

### Q13: How do I implement error boundaries?

```typescript
html`<${ErrorBoundary}
  fallback=${(err, retry) => html`
    <div class="error">
      <p>Error: ${err.message}</p>
      <button @click=${retry}>Retry</button>
    </div>
  `}
>
  <${RiskyComponent} />
<//>`

reportError(error, { component: 'MyComponent', props: { id: 123 } });
```

### Q14: How do I implement routing?

```typescript
const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/user/:id', component: UserProfile },
  ]
});

router.beforeEach((to, from) => {
  if (to.path === '/admin' && !isLoggedIn()) return '/login';
});

// In template
html`<a href=${router.url('/user/123')}>User</a>`
```

---

## Part 7: Summary

| Choose | When |
|--------|------|
| **Lit** | Simplest, lightest, standards-aligned. Standalone components, minimal bundles. |
| **Stencil** | Enterprise design systems needing React/Angular/Vue interop. |
| **FAST** | Complex adaptive theming, white-labeling, Microsoft ecosystem. |
| **Build your own** | Need fine-grained signal reactivity, no VDOM overhead, full control over primitives. |
