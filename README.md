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

## Part 2: Internal API Primitives & Code Examples

Understanding how these frameworks implement core primitives is crucial for building your own abstraction.

### 2.1 Component Base Class Architecture

**Lit (`ReactiveElement`)**: Uses runtime inheritance.
```typescript
export abstract class ReactiveElement extends HTMLElement implements ReactiveControllerHost {
  static elementProperties: PropertyDeclarationMap;
  static elementStyles: Array<CSSResultOrNative>;
  
  isUpdatePending = false;
  hasUpdated = false;
}
```

**Stencil (Compiler Output)**: Uses build-time transformations.
```typescript
@Component({ tag: 'my-component', shadow: true })
export class MyComponent {
  @Prop() first: string;
  render() { return <div>Hello</div>; }
}
// Compiler generates: customElements.define('my-component', CompiledClass)
```

**FAST (`FASTElement`)**:
```typescript
class HelloWorld extends FASTElement {
  @attr name: string;
}

HelloWorld.define({
  name: "hello-world",
  template: html`<span>Hello ${x => x.name}!</span>`,
  styles: css`span { color: red; }`
});
```

### 2.2 Property Declaration & Reactivity

**Lit Property System**: Uses getter/setter interception and queues microtasks.
```typescript
static getPropertyDescriptor(name, key, options) {
  return {
    get,
    set(value) {
      const oldValue = get?.call(this);
      set?.call(this, value);
      this.requestUpdate(name, oldValue, options);
    }
  };
}
```

**Stencil Property System**: Uses Proxies.
```typescript
@Prop({ reflect: true, mutable: true }) color: string = 'blue';
@State() internalCount: number = 0;

@Watch('color')
colorChanged(newValue: string, oldValue: string) {
  console.log(`Changed from ${oldValue} to ${newValue}`);
}
```

**FAST Property System**: Uses a highly granular Observable system.
```typescript
@attr({ attribute: 'foo-bar', mode: 'boolean' }) foo: boolean;
@observable items: Item[] = [];
```

### 2.3 Template Rendering Engine

**Lit Template System (No VDOM)**:
```typescript
const template = html`
  <div class="${ifDefined(this.className)}">
    ${this.items.map(item => html`<li>${item.name}</li>`)}
  </div>
`;
```

**Stencil JSX System (VDOM)**:
```typescript
render() {
  return (
    <div class="container">
      {this.items.map(item => <my-item name={item.name} />)}
    </div>
  );
}
```

**FAST Template System (Direct Binding)**:
```typescript
const template = html<NameTag>`
  <h3>${x => x.greeting}</h3>
  <button @click="${(x, c) => x.handleClick(c.event)}">Click</button>
  <input :value="${x => x.value}" />
`;
```

### 2.4 Styling System

**Lit Styles**: Constructible stylesheets via `css`.
```typescript
static styles = css`
  :host { display: block; }
  .container { padding: 16px; }
`;
```

**Stencil Styles**: External or inline parsed by compiler.
```typescript
@Component({
  tag: 'my-component',
  styleUrl: 'my-component.css',
  scoped: true,
  shadow: true
})
```

**FAST Styles**: Built-in Design Tokens.
```typescript
import { DesignToken } from "@microsoft/fast-foundation";
const accentColor = DesignToken.create("accent-color").withDefault("#0078d4");
```

### 2.5 Event System

**Lit Events**: Manual `CustomEvent` dispatch.
```typescript
this.dispatchEvent(new CustomEvent('value-change', { detail: this.value }));
html`<button @click="${this.handleClick}">Click</button>`
```

**Stencil Events**: Auto-generated via decorators.
```typescript
@Event({ eventName: 'valueChange' }) valueChange: EventEmitter<string>;
this.valueChange.emit('new value');
@Listen('click') handleClick() { ... }
```

**FAST Events**: Automatic `CustomEvent` bubbling.
```typescript
this.$emit('change', this.value);
html`<button @click="${(x, c) => x.handleClick(c.event)}">Click</button>`
```

### 2.6 Dependency Injection & Context

**Lit Context**: Based on DOM Events (`@lit/context`).
```typescript
class Parent extends LitElement {
  @provide({ context: themeContext }) theme = 'light';
}
class Child extends LitElement {
  @consume({ context: themeContext }) theme: string;
}
```

**FAST DI**: Built-in Container.
```typescript
const container = DI.createContainer();
const service = container.get(MyService);
```

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
├─────────────────────────────────────┤
│  Styling System                     │
│  - Constructible styles, tokens     │
├─────────────────────────────────────┤
│  Composition Layer                  │
│  - Slots, Events, Context, DI       │
└─────────────────────────────────────┘
```

### 3.2 The Base Class (`SignalElement`)

Must handle Shadow DOM creation and coordinate Signal updates.
```typescript
class SignalElement extends HTMLElement {
  private _updateScheduled = false;
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
}
```

### 3.3 Property ↔ Attribute Synchronization

Must handle type coercion, attribute reflection, and signal linking.
```typescript
class MyElement extends SignalElement {
  @attr({ mode: 'reflect' }) count: number;
  
  // Under the hood, the decorator does this:
  get count() { return this._count(); }
  set count(v) { this._count.set(v); }
  
  static get observedAttributes() { return ['count']; }
  attributeChangedCallback(name, old, val) {
    if (name === 'count') this.count = Number(val);
  }
}
```

### 3.4 Lifecycle and Effect Cleanup

Signal `Effects` must be tied to the native component lifecycles to prevent memory leaks.
```typescript
connectedCallback() {
  super.connectedCallback();
  this._effectCleanup = effect(() => {
    this.render(); // Or bind directly to DOM
  });
}

disconnectedCallback() {
  super.disconnectedCallback();
  this._effectCleanup(); // Destroy subscriptions
}
```

### 3.5 Signal-Based Context (Prop-drilling avoidance)

```typescript
import { createContext, useContext } from './signals';
const ThemeContext = createContext('light');

class Child extends SignalElement {
  theme = useContext(ThemeContext);
}
```

---

## Part 4: Missing Primitives Reference (Fulfilling the Gaps)

To build a complete framework, you must implement the following primitives:

### Template Engine
| Primitive | Description |
|-----------|-------------|
| `Show`/`Choose`/`When`/`Otherwise` | Conditional rendering |
| `For` with keyed diffing | List rendering |
| Slot management | Named/default/conditional slots |
| Template fragments | Composable template pieces |
| `Lazy` | Lazy template loading |

### Advanced Signals
| Primitive | Description |
|-----------|-------------|
| `batch()` | Group multiple updates into one render |
| `untrack()` / `peek()` | Read without subscribing |
| `computed()` with custom equality | Derived state with memoization |
| `onCleanup()` / `onDispose()` | Cleanup hooks for effects |
| `createRoot()` | Owned signal graph (auto-dispose) |
| `produce()` | Immer-style mutations |

### Component Primitives
| Primitive | Description |
|-----------|-------------|
| `@prop()` with attribute reflection | Auto property↔attribute sync |
| `:model` directive | Two-way binding |
| `ref()` | Element references |
| `forceUpdate()` | Manual re-render |
| `ErrorBoundary` | Catch child errors |
| `Portal` | Render to different DOM node |

### Lifecycle Primitives
| Primitive | Description |
|-----------|-------------|
| `onMount()` / `onUnmount()` | DOM connect/disconnect |
| `onRender()` / `onUpdate()` | Pre/post render callbacks |
| `useResizeObserver()` | Size tracking |
| `useIntersectionObserver()` | Visibility tracking |
| `useMutationObserver()` | DOM mutation tracking |

### Event & Composition Systems
| Primitive | Description |
|-----------|-------------|
| `delegate()` | Event delegation |
| `prevent()`/`stop()`/`once()` | Event modifiers |
| `createBus(name)` | Namespaced event bus |
| `mixin()` / Higher-order components | Class-based composition |
| `provide()`/`inject()` | DI across Shadow DOM |

### Styling & Performance
| Primitive | Description |
|-----------|-------------|
| Dynamic CSS with signals | `css\`${() => theme()}\`` |
| `createTheme()`/`useTheme()` | Design token system |
| CSS layers | `@layer` support |
| `memo()` / `lazy()` | Memoization and lazy component loading |
| `virtualScroll` | Virtual scrolling |

### Testing
| Primitive | Description |
|-----------|-------------|
| `render()`/`fireEvent()`/`waitFor()` | Component testing utilities |
| `mockSignal()`/`mockComponent()` | Mock utilities |
| DOM assertions | `toHaveAttribute`, `toHaveClass` |

---

## Part 5: Enterprise-Grade Advanced Primitives (Cutting-Edge)

To truly surpass current giants, your custom framework should integrate the absolute latest W3C specifications:

### 5.1 ElementInternals & Form Participation API
*   **Feature:** Abstract `attachInternals()` via a `@formAssociated` decorator.
*   **Capability:** Allow custom elements to act like native inputs (`this.internals.setFormValue()`), report validity natively, and utilize advanced CSS like `:state(invalid)` or `:state(loading)`.

### 5.2 Suspense & Async Boundaries
*   **Feature:** A declarative `<Suspense>` wrapper and `@defer` async signals.
*   **Capability:** Handle asynchronous data fetching internally without blocking the main UI thread. Intercepts child render promises before committing them to the DOM.

### 5.3 Declarative Shadow DOM (DSD) & Resumability
*   **Feature:** SSR that outputs `<template shadowrootmode="open">`.
*   **Capability:** The browser renders the Shadow DOM before JS loads. By serializing signal subscriptions into HTML attributes, you achieve **Resumability** (Qwik-style)—lazily downloading JS only when an event (like a click) actually occurs.

### 5.4 View Transition API Integration
*   **Feature:** A `useViewTransition()` hook.
*   **Capability:** Intercepts a signal update microtask, pauses it, calls `document.startViewTransition()`, and applies the DOM mutation inside the callback, resulting in seamless, native 60FPS cross-DOM animations.

---

## Part 6: Comprehensive FAQ

### Q1: Why do we need decorators?
Decorators provide **Declarative Metaprogramming** to reduce boilerplate:
1. **Auto-registration**: `@customElement('my-el')` replaces `customElements.define()`.
2. **Property reflection**: `@property({reflect: true})` creates getters/setters, handles type coercion, and triggers reactivity.
3. **Event binding**: `@Listen('click')` auto-binds/unbinds during lifecycle.

### Q2: What if we build without decorators?
**With decorators (Lit):**
```typescript
@customElement('my-counter')
class MyCounter extends LitElement {
  @property({ type: Number }) count = 0;
}
```
**Without decorators (Static properties):**
```javascript
class MyCounter extends LitElement {
  static get properties() { return { count: { type: Number } }; }
  constructor() { super(); this.count = 0; }
}
customElements.define('my-counter', MyCounter);
```
**Without decorators (Functional/Signal-based):**
```javascript
const MyCounter = defineComponent(() => {
  const count = signal(0);
  return () => html`<div>${count()}</div>`;
});
```
**Verdict:** Class-based architectures require static blocks without decorators. Functional architectures don't need decorators at all.

### Q3: What is the TC39 Decorator status?
Stage 3 (stable, shipping in browsers: Chrome 115+, Safari 16.4+, native in TS 5.0+). The key difference from legacy decorators is that TC39 decorators do not access `this` in the same way.

### Q4: Do decorators affect performance/bundle size?
*   **Runtime overhead:** Zero (compile-time transform).
*   **Bundle size:** Adds +100-200 bytes per decorator code (tree-shakeable).

### Q5: Can we mix decorators and non-decorator approaches?
Yes. Lit supports mixing `@property()` with `static get properties()`. 

### Q6: How do I handle DOM Parts and Template Instantiation without Lit-html?
You parse a tagged template string, locate dynamic `${}` insertions, and replace them with HTML comments (`<!--?-->`). When cloning the template, use a `TreeWalker` to find these comments and bind your Signal Effects to those exact nodes. In the future, you can swap this for the W3C **DOM Parts API** (`document.getPartRoot()`).

### Q7: Should my framework use a Virtual DOM (VDOM) or Fine-Grained Signals?
Fine-grained Signals are universally replacing VDOM architectures. VDOMs (Stencil) require re-evaluating the whole component tree and diffing it. Signals bind directly to the exact DOM node, bypassing diffing overhead entirely, saving massive memory and CPU cycles.

### Q8: How do I implement SSR with signals?
Solutions:
1. **Static extraction**: Render templates to HTML strings, skip signal hydration.
2. **DSD output**: Use `<template shadowrootmode="open">` for browser-native rendering before JS load.
3. **Resumability**: Serialize signal subscriptions into HTML, lazy-load JS only on interaction.

### Q9: How do I structure a framework monorepo?
```text
packages/
├── signals/          # Core signal primitives
├── element/          # Base class (extends HTMLElement)
├── template/         # Tagged template engine
├── styles/           # CSS/styles system
├── context/          # DI and context API
└── ssr/              # Server-side rendering
```

### Q10: How do I handle error boundaries in Web Components?
```typescript
html`<${ErrorBoundary} 
  fallback=${(err, retry) => html`<div>Error: ${err.message} <button @click=${retry}>Retry</button></div>`}
>
  <${RiskyComponent} />
<//>`
```
Must catch errors from child components, show fallback UI, provide retry mechanism, and clean up resources on error.

### Q11: How do I implement design tokens natively?
```typescript
import { DesignToken } from './tokens';
const primaryColor = DesignToken.create('primary-color').withDefault('#3b82f6');
const spacing = DesignToken.create('spacing').withDefault('8px');

// In component
html`<div style="color: ${primaryColor}; padding: ${spacing}">...</div>`

// Theme switching
primaryColor.withDefault('#ef4444'); // Changes all usages automatically
```

---

## Part 7: Summary

*   **Choose Lit if**: You want the simplest, lightest, standards-aligned library.
*   **Choose Stencil if**: You need to compile enterprise design systems to React/Angular/Vue natively.
*   **Choose FAST if**: You require complex adaptive theming and design-token-driven UIs.
*   **Build your own if**: You want to leverage modern **Signals**, eliminate VDOM overhead, and integrate cutting-edge primitives like ElementInternals, DSD, and the View Transition API exactly to your architectural specifications.
