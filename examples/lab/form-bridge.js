// Comparison: Form Bridge (Browser Integration)
// Manual Sync vs. ElementInternals
// Run: bun run examples/comparisons/09-form-bridge.js

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Form Bridge: ElementInternals vs. Manual Sync       ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ─── 1. The "Old Way" (Manual Sync) ───
console.log('--- 1. Manual Synchronization ---');
console.log('Pattern:');
console.log('  - Create a hidden <input type="hidden" name="myValue">');
console.log('  - On every state change, manually update hiddenInput.value = newState;');
console.log('  - Handle form validation by manually adding "invalid" classes to wrapper.');
console.log('  - Result: DOM bloat, fragile sync logic, poor accessibility.');
console.log('');

// ─── 2. The "New Way" (ElementInternals) ───
console.log('--- 2. ElementInternals (Modern Standard) ---');
console.log('Pattern:');
console.log('  - Call this.attachInternals() in constructor');
console.log('  - Use this.internals.setFormValue(value)');
console.log('  - Use this.internals.setValidity({message: "..."})');
console.log('  - Use this.internals.states.add("checked")');
console.log('');

// Simulation of the API
class ModernToggle {
  constructor() {
    this.internals = {
      setFormValue: (v) => console.log(`  [Internals] Form value set to: ${v}`),
      setValidity: (v) => console.log(`  [Internals] Validity: ${v.message}`),
      states: new Set()
    };
    this.value = false;
  }

  toggle() {
    this.value = !this.value;
    this.internals.setFormValue(this.value ? 'on' : null);
    if (this.value) this.internals.states.add('checked');
    else this.internals.states.delete('checked');
    console.log(`  [State] Value is now ${this.value}. Internals updated.`);
  }
}

const toggle = new ModernToggle();
toggle.toggle();

console.log('\nComparison Summary:');
console.log('Manual Sync: Requires "Shadow DOM" leakage (hidden inputs) to work with HTML forms.');
console.log('ElementInternals: The browser treats the Custom Element AS the input. No hidden DOM nodes.');
console.log('Verdict: ElementInternals is the "Gold Standard" for browser-native integration.');
