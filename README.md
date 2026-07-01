# Architecting Browser-Native Web Components: From Frameworks to Custom Abstractions

A comprehensive study of **Lit**, **Stencil**, and **FAST** — and an architectural guide for building your own modern, signal-based Web Component framework.

---

## 🚀 Getting Started

This repository is a living lab. You can validate every architectural claim made in this document by running the provided simulation suite.

```bash
# Run all architectural proofs and component demos
bun run examples/run-all.js
```

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
*   **Pros:** Tiny bundle, standards-aligned, massive adoption.
*   **Cons:** No built-in SSG/routing, less "magic" than full frameworks.

**Stencil (by Ionic)**
*   **Approach:** A build-time compiler. Developers write TypeScript + JSX, which compiles to optimized vanilla Custom Elements.
*   **Pros:** Familiar DX (JSX), framework-agnostic output, built-in tooling.
*   **Cons:** Compiler dependency, VDOM overhead, not drop-in via `<script>`.

**FAST (by Microsoft)**
*   **Approach:** A runtime library heavily focused on performance and **Adaptive UI**.
*   **Pros:** Adaptive theming, fastest raw performance, enterprise-grade tokens.
*   **Cons:** Smaller ecosystem, steeper learning curve.

---

## Part 2: Framework Deep Dive (Lit, Stencil, FAST)

### 2.1 Architecture Overview

| | **Lit** | **Stencil** | **FAST** |
|---|---------|-------------|----------|
| **Core Philosophy** | Thin runtime, close to metal | Compiler-first, framework-agnostic | Performance + Adaptive UI |
| **Base Class** | `LitElement` extends `HTMLElement` | None (compiler transforms) | `FASTElement` extends `HTMLElement` |
| **Registration** | `@customElement('name')` or manual | Auto via `@Component` | `MyEl.define({name, template, styles})` |
| **Rendering** | Tagged templates $\rightarrow$ Part-based DOM | JSX $\rightarrow$ Virtual DOM $\rightarrow$ DOM diff | Tagged templates $\rightarrow$ Observable bindings |
| **Reactivity** | Getter/setter + microtask batch | Proxies + rAF | Observable pub/sub + task queue |
| **Styling** | `css` tag + constructible stylesheets | External CSS files + scoped fallback | `css` tag + Design Tokens |
| **DI/Context** | `@lit/context` (event-based) | None (use mixins) | Built-in DI container |

### 2.2 Reactivity & Performance Analysis

We measured the efficiency of these designs in `examples/lab/rendering-efficiency.js`.

**The "Granularity" Test:** Changing a single variable in a component with 3 bindings.
- **Lit**: 1 Render $\rightarrow$ 3 Binding Updates (Coarse)
- **Stencil**: 1 Render $\rightarrow$ 1 Binding Update (Hybrid/VDOM)
- **FAST**: 0 Renders $\rightarrow$ 1 Binding Update (Fine-grained)
- **Custom Signals**: 0 Renders $\rightarrow$ 1 Binding Update (Fine-grained)

**The "Batching" Test:** 3 rapid updates to state in one tick.
- **Lit/Stencil**: Batch to 1 Render (Native Microtask)
- **FAST**: 3-9 separate updates (Immediate)
- **Custom Signals**: Batch to 1 update via `batch()` (Manual Control)

### 2.3 Template Rendering Deep Dive

**Lit — Part-based (No VDOM):**
Parses templates into `<template>` with comment markers. On update, it only mutates the Part's node (e.g., `node.textContent = value`). No diffing, no virtual tree.

**Stencil — Virtual DOM:**
Familiar React-like mental model. Uses a virtual tree and diffs it with the previous tree to patch the real DOM. Overhead comes from creating virtual nodes.

**FAST — Direct Observable Binding:**
Arrow functions capture property access. The observable system tracks which bindings depend on which properties. On change, only the affected DOM node is updated.

### 2.4 Styling Deep Dive

**Lit:** Uses **Constructible Stylesheets** (`adoptedStyleSheets`). Shared across all instances, avoiding `<style>` injection.
**Stencil:** **Scoped CSS**. Compiler adds unique data attributes for scoping, allowing encapsulation without Shadow DOM.
**FAST:** **Design Tokens**. Reactive signals mapped to CSS custom properties (`--var`). Theme switching happens without component re-renders.

### 2.5 The "Outer Loop": Systems Integration

Beyond the internal update cycle, we compare system-level integration in `examples/lab/`:

| Feature | **Lit / Stencil / FAST** | **Custom Signal Framework** | **Proof (Lab File)** |
| :--- | :--- | :--- | :--- |
| **Cross-Component State** | Context Providers / DI Containers | Global Signal Stores | `state-orbit.js` |
| **Browser Form Integration** | Hidden inputs / Manual sync | `ElementInternals` / `setFormValue` | `form-bridge.js` |
| **Async Data Flow** | Manual `loading/error` flags | Declarative `createResource` | `async-boundary.js` |
| **Memory Management** | Manual `unsubscribe` / Hooks | Auto-dependency tracking | `memory-leak-test.js` |

---

## Part 3: Architecting a Custom Signal-Based Framework

The ideal "next-gen" framework is built on **Signals**, entirely bypassing component-level re-renders.

### 3.1 Core Architecture
**The Engine:** `examples/core/signal.js` implements a dependency-tracking system where `effect` automatically discovers which `signal` it depends on.

### 3.2 Base Class (`SignalElement`)
Extends `HTMLElement` and manages Shadow DOM. In a full implementation, this class would coordinate the mapping between signals and the DOM.

### 3.3 Top API Primitives
1. **`ElementInternals`**: Lets components act as native `<input>` elements.
2. **`untrack()`**: Pauses dependency tracking to prevent infinite loops.
3. **`batch()`**: Groups multiple signal updates into one DOM update.
4. **`createResource()`**: Turns async fetch states into reactive signals.

---

## Part 4: Reference Implementations (Gallery)

These examples demonstrate the "Custom Framework" concepts in action.

### 🖼️ Framework Comparisons (`examples/gallery/frameworks/`)
- **`counter-all.js`**: Same component in 4 frameworks.
- **`reactivity-deep-dive.js`**: Proxy vs. Observable vs. Signal.
- **`template-rendering.js`**: VDOM vs. Parts.

### 🧩 Complex Components (`examples/gallery/components/`)
- **`todo-lit.js`**: Standard Lit implementation.
- **`signal-element.js`**: Showcases the signal engine's power.
- **`datatable-lit.js`**: Complex state management.
- **`user-profile-lit.js`**: Async data patterns.

---

## Part 5: Future Outlook (Architectural Targets)

To surpass current frameworks, the next evolution includes:

1. **View Transition API**: Intercept signal updates to trigger `document.startViewTransition()` for 60FPS native animations.
2. **Declarative Shadow DOM (DSD)**: Server-side rendered Shadow DOM for instant first paint.
3. **Resumability**: Serializing signal subscriptions into HTML to avoid "hydration" (downloading JS only when an event occurs).

---

## Part 6: FAQ

**Q: Why not just use Lit?**
Lit is fantastic for most cases. However, if you are building a massive enterprise app with thousands of updates per second, a fine-grained signal system (like the one in `/core`) eliminates the "component re-render" overhead entirely.

**Q: Do I need a compiler (like Stencil)?**
Compilers provide great DX (JSX), but they add a build step. A runtime-only signal framework provides the same performance without the build-time complexity.

**Q: Virtual DOM vs. Signals?**
VDOMs diff trees. Signals bind to nodes. For most web components, binding to nodes is significantly more efficient in both memory and CPU.
