// Comparison: Styling Systems
// Lit Constructible Sheets vs Stencil Scoped CSS vs FAST Design Tokens vs Custom
// Run: bun run examples/comparisons/04-styling-systems.js

import { signal, computed, effect } from '../../core/signal.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Styling Systems: 4 Approaches Compared            ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════
// README §2.4 Styling Deep Dive
// ═══════════════════════════════════════════════════════════════

// ─── 1. Lit: Constructible Stylesheets ──────────────────────

console.log('--- 1. Lit: Constructible Stylesheets ---');
console.log('');
console.log('Pattern:');
console.log('  static styles = css`');
console.log('    :host { display: block; }');
console.log('    .container { padding: 16px; }');
console.log('  `;');
console.log('');
console.log('How it works:');
console.log('  1. css`...` tag creates CSSStyleSheet');
console.log('  2. Component constructor calls:');
console.log('     this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]');
console.log('  3. Styles shared across all instances (no duplication)');
console.log('');
console.log('Benefits:');
console.log('  - No <style> injection into DOM');
console.log('  - Native browser feature');
console.log('  - Composable: static styles = [base, theme, specific]');

// Simulate Lit constructible stylesheet
class LitStyleSheet {
  constructor(cssText) {
    this.cssText = cssText;
    this.rules = this.parseRules(cssText);
  }

  parseRules(cssText) {
    return cssText.split('}').filter(r => r.trim()).map(r => ({
      selector: r.split('{')[0].trim(),
      properties: r.split('{')[1]?.trim() || '',
    }));
  }

  replaceSync(cssText) {
    this.cssText = cssText;
    this.rules = this.parseRules(cssText);
  }
}

const litSheet = new LitStyleSheet(`
  :host { display: block; }
  .container { padding: 16px; }
  .count { font-size: 2rem; }
`);

console.log(`  StyleSheet created: ${litSheet.rules.length} rules`);

console.log('');

// ─── 2. Stencil: Scoped CSS ─────────────────────────────────

console.log('--- 2. Stencil: Scoped CSS ---');
console.log('');
console.log('Pattern:');
console.log('  @Component({');
console.log('    styleUrl: "counter.css",');
console.log('    styleUrls: ["base.css", "theme.css"],');
console.log('    styles: css`...`,  // inline');
console.log('    scoped: true,       // data attribute scoping');
console.log('    shadow: false,      // fallback to scoped');
console.log('  })');
console.log('');
console.log('How it works:');
console.log('  1. Compiler processes CSS files');
console.log('  2. Adds unique data attributes for scoping');
console.log('  3. Generates scoped CSS:');
console.log('     .sc-counter-abc123 .btn { color: red; }');
console.log('');
console.log('Benefits:');
console.log('  - Works without Shadow DOM');
console.log('  - CSS encapsulation via scoping');
console.log('  - Supports external CSS files');

// Simulate Stencil scoped CSS
function stencilScope(componentName, cssText) {
  const scopeId = `sc-${componentName}-${Math.random().toString(36).slice(2, 8)}`;
  const scoped = cssText.replace(/:host/g, `.${scopeId}`).replace(/\.(\w+)/g, `.${scopeId} .$1`);
  return { scopeId, cssText: scoped };
}

const stencilScoped = stencilScope('counter', ':host { display: block; } .btn { color: red; }');
console.log(`  Scope ID: ${stencilScoped.scopeId}`);
console.log(`  Scoped CSS: ${stencilScoped.cssText}`);

console.log('');

// ─── 3. FAST: Design Tokens ─────────────────────────────────

console.log('--- 3. FAST: Design Tokens ---');
console.log('');
console.log('Pattern:');
console.log('  const bgColor = DesignToken.create("bg-color").withDefault("#ffffff");');
console.log('  const textColor = DesignToken.create("text-color").withDefault("#000000");');
console.log('');
console.log('Usage in CSS:');
console.log('  css`:host { background: var(--bg-color); color: var(--text-color); }`');
console.log('');
console.log('How it works:');
console.log('  1. Token created with name and default value');
console.log('  2. Token maps to CSS custom property: --bg-color');
console.log('  3. Token.update() triggers Observable.notify()');
console.log('  4. All CSS usages update automatically');
console.log('');
console.log('Benefits:');
console.log('  - Reactive CSS custom properties');
console.log('  - Theme switching without re-render');
console.log('  - Complex calculations (derived colors)');

// Simulate FAST Design Tokens
class DesignToken {
  constructor(name, defaultValue) {
    this.name = name;
    this.cssVar = `--${name}`;
    this._signal = signal(defaultValue);
    this._subscribers = new Set();
  }

  static create(name) {
    return {
      withDefault: (value) => new DesignToken(name, value),
    };
  }

  get() { return this._signal(); }
  set(value) { this._signal.set(value); this._notify(); }

  _notify() {
    for (const sub of this._subscribers) sub(this._signal());
  }

  observe(callback) {
    this._subscribers.add(callback);
    callback(this._signal());
    return () => this._subscribers.delete(callback);
  }
}

const bgColor = DesignToken.create('bg-color').withDefault('#ffffff');
const textColor = DesignToken.create('text-color').withDefault('#000000');

const stops = [
  bgColor.observe((v) => console.log(`  [Token] bg-color: ${v}`)),
  textColor.observe((v) => console.log(`  [Token] text-color: ${v}`)),
];

bgColor.set('#f0f0f0');
bgColor.set('#1a1a1a');
textColor.set('#ffffff');

for (const stop of stops) stop();

console.log('');

// ─── 4. Custom: Signal-based Styling ────────────────────────

console.log('--- 4. Custom: Signal-based Styling ---');
console.log('');
console.log('Pattern:');
console.log('  const theme = signal("light");');
console.log('  const bgColor = computed(() =>');
console.log('    theme() === "light" ? "#fff" : "#000"');
console.log('  );');
console.log('');
console.log('Usage:');
console.log('  effect(() => {');
console.log('    element.style.background = bgColor();');
console.log('  });');
console.log('');
console.log('Benefits:');
console.log('  - Simple, no extra API');
console.log('  - Leverages existing signal system');
console.log('  - Works with any DOM property');

const theme = signal('light');
const customBg = computed(() => theme() === 'light' ? '#ffffff' : '#1a1a1a');
const customText = computed(() => theme() === 'light' ? '#000000' : '#ffffff');

const styleUpdates = [];
effect(() => {
  const style = `background: ${customBg()}; color: ${customText()}`;
  styleUpdates.push(style);
  console.log(`  [Custom] Style applied: ${style}`);
});

theme.set('dark');
theme.set('light');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('Styling Comparison Summary');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('  Lit:      Constructible stylesheets, shared across instances');
console.log('  Stencil:  Scoped CSS via compiler, works without Shadow DOM');
console.log('  FAST:     Design Tokens → reactive CSS custom properties');
console.log('  Custom:   Signals → computed styles → DOM application');
console.log('');
console.log('  Best for theming: FAST Design Tokens');
console.log('  Best for encapsulation: Lit Constructible Sheets');
console.log('  Best for simplicity: Custom Signal-based');
console.log('  Best for multi-framework: Stencil Scoped CSS');

console.log('\n✅ All styling systems compared');
