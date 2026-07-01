// Comparison: State Orbit (Cross-Component Communication)
// Lit Context vs. Signal Global Store
// Run: bun run examples/comparisons/08-state-orbit.js

import { signal, effect } from '../core/signal.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  State Orbit: Global Store vs. Context               ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ─── 1. Lit Context Pattern (The "Down-Tree" Flow) ───
console.log('--- 1. Lit Context ---');
console.log('Pattern: Provider Component → Context Key → Consumer Component');
console.log('Flow: Provider updates value → All consumers in subtree re-render');
console.log('Trade-off: High architectural overhead, but localized to component trees.');
console.log('Example: UserSessionContext.consume(this)');
console.log('');

// ─── 2. Signal Global Store (The "Direct" Flow) ───
console.log('--- 2. Signal Store ---');
const userSession = {
  name: signal('Guest'),
  isLoggedIn: signal(false),
  setSession(name) {
    this.name.set(name);
    this.isLoggedIn.set(true);
  }
};

// Imagine these as different components in the app
const Navbar = () => {
  effect(() => {
    console.log(`  [Navbar] Render: Hello, ${userSession.name()} ${userSession.isLoggedIn() ? '✅' : '❌'}`);
  });
};

const ProfilePage = () => {
  effect(() => {
    console.log(`  [ProfilePage] Render: User is ${userSession.name()}`);
  });
};

const Footer = () => {
  effect(() => {
    console.log(`  [Footer] Render: Logged in as ${userSession.name()}`);
  });
};

// Initialize "components"
Navbar();
ProfilePage();
Footer();

console.log('Action: userSession.setSession("Alice")');
userSession.setSession('Alice');

console.log('\nComparison Summary:');
console.log('Lit Context: Hierarchical, scoped, requires "Provider" and "Consumer" boilerplate.');
console.log('Signal Store: Flat, global, direct binding. Any component anywhere can subscribe.');
console.log('Verdict: Signals eliminate the "Context Provider" wrapper hell.');
