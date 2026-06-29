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
*   **Templating:** Uses `lit-html` tagged template literals. Updates are part-based, avoiding Virtual DOM overhead.
*   **Reactivity:** `@property()` decorators trigger `requestUpdate()`, batching changes in microtasks.

**Stencil (by Ionic)**
*   **Approach:** A build-time compiler. Developers write TypeScript + JSX, which compiles to optimized vanilla Custom Elements.
*   **Templating:** Uses JSX and an asynchronous Virtual DOM for rendering and diffing.
*   **Superpower:** Auto-generates framework wrappers for React, Vue, and Angular natively.

**FAST (by Microsoft)**
*   **Approach:** A runtime library heavily focused on performance and **Adaptive UI**.
*   **Templating:** Tagged templates mapped directly to observables, bypassing VDOM entirely.
*   **Superpower:** First-class Design Token API for dynamic, context-aware styling.

---

## Part 2: Internal API Primitives Deep Dive

Understanding how these frameworks implement core primitives is crucial for building your own abstraction.

### 2.1 Reactivity & State
*   **Lit:** Relies on getter/setter interception on the class prototype. Changes queue a microtask, ensuring multiple synchronous state changes result in a single render.
*   **Stencil:** Wraps state in ES6 Proxies (or deep getters) and queues updates via `requestAnimationFrame`.
*   **FAST:** Uses a publish-subscribe `Observable` system (`@observable`). Updates are extremely granular, notifying exact DOM bindings directly.

### 2.2 Template Rendering Engine
*   **Stencil (VDOM):** `render()` returns a Virtual DOM tree. It diffs this tree against the previous one and patches the real DOM. Great for complex structural changes.
*   **Lit & FAST (Direct-to-DOM):** Both parse tagged template literals once into a `<template>` tag. They map dynamic expressions to specific memory references (Parts/Bindings). On update, they only mutate those exact nodes/attributes.

### 2.3 Styling & Encapsulation
*   **All Frameworks:** Default to **Shadow DOM** for strict CSS encapsulation.
*   **Lit/FAST:** Natively leverage `Constructable Stylesheets` (`new CSSStyleSheet()`) and `adoptedStyleSheets` for high-performance, shared styling across component instances.
*   **Stencil:** Provides robust fallback scoping mechanisms for environments where Shadow DOM isn't desired.

---

## Part 3: Architecting a Custom Signal-Based Framework

If you extract the best features from Lit, Stencil, and FAST, the ideal "next-gen" framework is built on **Signals** (like SolidJS or modern Angular), entirely bypassing component-level re-renders.

### 3.1 The Core Architecture
A modern abstraction requires four pillars:
1.  **Signals Engine (`signal`, `computed`, `effect`)**: Provides granular, node-level reactivity without decorators.
2.  **Base Class (`SignalElement`)**: Extends `HTMLElement`, manages Shadow DOM creation, and synchronizes signal lifecycles with the DOM (cleaning up effects on disconnect).
3.  **Template Compiler**: Clones native `<template>` tags and binds signal `Effects` directly to specific text/attribute nodes during the initial parse.
4.  **Styling System**: Utilizes `adoptedStyleSheets` bound to CSS Custom Properties (Tokens) for blazingly fast theming.

### 3.2 Fulfilling the Gaps (Missing Primitives)
To elevate a homemade framework from a "toy" to a production tool, you must implement missing primitives across key categories:

*   **Template Engine**: Need `Show`, `Choose`, and `For` (keyed diffing) control flow wrappers to prevent massive DOM thrashing on array updates.
*   **Advanced Signals**: Need `batch()` (grouping multiple signal sets into one render) and `untrack()` (reading state without subscribing).
*   **Component Primitives**: Auto-reflection of props to HTML attributes, and declarative `ref()` bindings to access internal DOM elements.
*   **Event System**: Declarative event delegation (`@click`) and namespaced custom event emitters.
*   **Performance**: `lazy()` component loading and idle-time scheduling.

---

## Part 4: Enterprise-Grade Advanced Primitives (Cutting-Edge)

To truly surpass current giants, your custom framework should integrate the absolute latest W3C specifications:

### 4.1 ElementInternals & Form Participation API
Web Components traditionally fail to integrate natively with HTML `<form>` tags.
*   **Feature:** Abstract `attachInternals()` via a `@formAssociated` decorator.
*   **Capability:** Allow custom elements to report validity, set form values natively, and utilize advanced CSS like `:state(invalid)`.

### 4.2 Suspense & Async Boundaries
*   **Feature:** A declarative `<Suspense>` wrapper and `@defer` async signals.
*   **Capability:** Handle asynchronous data fetching internally without blocking the main UI thread, automatically exposing `.pending` and `.error` fallback states.

### 4.3 Declarative Shadow DOM (DSD) & Resumability
*   **Feature:** SSR that outputs `<template shadowrootmode="open">`.
*   **Capability:** The browser renders the Shadow DOM before JS loads. By serializing signal subscriptions into HTML attributes, you achieve **Resumability** (Qwik-style)—loading JS only when the user interacts.

### 4.4 View Transition API Integration
*   **Feature:** A `useViewTransition()` hook.
*   **Capability:** Intercepts a signal update microtask, pauses it, calls `document.startViewTransition()`, and applies the DOM mutation, resulting in seamless, native 60FPS animations.

---

## Part 5: Comprehensive FAQ

### Q1: Why do we need decorators?
Decorators provide **Declarative Metaprogramming**. They reduce massive boilerplate:
1. `@customElement('my-el')` handles auto-registration.
2. `@property({reflect: true})` handles getters/setters, `observedAttributes`, type coercion, and reactivity triggers.
3. `@listen('click')` auto-binds/unbinds events during component lifecycle.

### Q2: What if we build without decorators?
It is absolutely viable. 
*   **Class-based (Lit style):** You must use static `properties` configuration blocks and manual constructor initialization. It is more verbose.
*   **Functional (Solid style):** By using function closures and explicit Signal primitives (e.g., `const count = signal(0)`), you bypass classes and decorators entirely.

### Q3: What is the TC39 Decorator status?
Stage 3 (stable). Shipping in Chrome 115+, Edge 115+, Safari 16.4+, and native to TS 5.0+. Modern decorators don't access `this` in the same way legacy ones did.

### Q4: How do I handle property ↔ attribute synchronization?
Your base class must implement `static get observedAttributes()` and `attributeChangedCallback()`. When an attribute changes from the outside, you must coerce the string into the correct type (Number, Boolean) and update the internal Signal or Property.

### Q5: How do I integrate my custom Web Components with React?
React currently requires a wrapper to handle custom events and properties correctly (unlike Vue or Angular which support Custom Elements natively). You should build a utility like `createComponent(MyEl, React)` that translates React props into DOM properties and events.

### Q6: How do I structure a custom framework monorepo?
Isolate concerns into tree-shakeable packages:
*   `@my-fw/signals` (Core reactivity)
*   `@my-fw/element` (Base class)
*   `@my-fw/template` (Tagged template engine)
*   `@my-fw/context` (Dependency Injection)

### Q7: How do I handle DOM Parts and Template Instantiation without Lit-html?
*(New)* You can parse a tagged template string, locate dynamic `${}` insertions, and replace them with HTML comments (`<!--?-->`). When cloning the template, use a `TreeWalker` to find these comments and bind your Signal Effects to those exact nodes. In the future, you can swap this out for the native W3C **DOM Parts API**.

### Q8: Should my framework use a Virtual DOM (VDOM) or Fine-Grained Signals?
*(New)* Fine-grained Signals are universally replacing VDOM architectures in modern JS. VDOMs (like Stencil or React) require re-evaluating the whole component tree and diffing it. Signals bind directly to the exact DOM node, bypassing diffing overhead entirely. For Web Components, direct DOM manipulation via Signals is much faster and requires less memory.

### Q9: How do I manage Dependency Injection (DI) and Context across closed Shadow Boundaries?
*(New)* Because Shadow DOM encapsulates events, you should implement the **Context Community Protocol**. A child component dispatches a custom `context-request` event that bubbles up. A parent Provider listens for this event, catches it, and passes its data back down via a callback provided in the event detail. This bypasses prop-drilling entirely.

### Q10: How do we handle ElementInternals and native Form Participation?
*(New)* Your `SignalElement` base class should check if `static formAssociated = true` is defined. If so, it calls `this._internals = this.attachInternals()` in the constructor. You can then expose helper methods like `this.setFormValue()` that update the internal state, allowing your custom element to work natively inside standard HTML `<form>` submissions.

### Q11: How do I achieve Qwik-like "Resumability" in my custom framework?
*(New)* True resumability requires a compiler. During SSR, your compiler must serialize the internal state into a `<script type="application/json">` block, and inject a tiny global event listener onto the `<body>`. When a user clicks a component, the global listener intercepts the event, lazily downloads the specific component's JS chunk, hydrates the state from JSON, and executes the click handler—all without running hydration on load.

---

## Part 6: Summary

*   **Choose Lit if**: You want the simplest, lightest, standards-aligned library.
*   **Choose Stencil if**: You need to compile enterprise design systems to React/Angular/Vue natively.
*   **Choose FAST if**: You require complex adaptive theming and design-token-driven UIs.
*   **Build your own if**: You want to leverage modern **Signals**, eliminate VDOM overhead, and integrate cutting-edge primitives like ElementInternals, DSD, and the View Transition API exactly to your architectural specifications.
