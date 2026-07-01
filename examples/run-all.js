// Master Runner: Validates all examples with real libraries
// Run: bun run examples/run-all.js

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const examples = [
  // Lit examples (runnable in Bun)
  'lit/01-basic-component.js',
  'lit/02-directives.js',
  'lit/03-lifecycle.js',
  'lit/04-events.js',

  // Comparisons (runnable in Bun)
  'comparisons/01-counter-all-frameworks.js',
  'comparisons/02-reactivity-deep-dive.js',
  'comparisons/03-template-rendering.js',
  'comparisons/04-styling-systems.js',
  'comparisons/05-lifecycle-events.js',

  // Demos (runnable in Bun - use Lit implementations)
  'demos/01-todo-lit.js',
  'demos/02-user-profile-lit.js',
  'demos/03-toggle-lit.js',
  'demos/04-datatable-lit.js',
  'demos/05-09-remaining-lit.js',

  // Custom framework (runnable in Bun)
  'custom/01-signal-element.js',
];

// FAST and Stencil examples require browser - skip in Bun runner
const browserExamples = [
  'fast/01-basic-component.html',
  'fast/02-design-tokens.html',
  'stencil/01-component-patterns.js',
];

let passed = 0;
let failed = 0;
const results = [];

console.log('══════════════════════════════════════════════════════════════');
console.log('  README.md Validation Suite');
console.log('  Architecting Browser-Native Web Components');
console.log('  Real Libraries: lit, @stencil/core, @microsoft/fast-element');
console.log('══════════════════════════════════════════════════════════════\n');

for (const example of examples) {
  const fullPath = join(__dirname, example);
  const label = example.replace('.js', '').replace(/\//g, ' → ');

  try {
    const proc = Bun.spawnSync(['bun', 'run', fullPath], {
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 10000,
    });

    if (proc.exitCode === 0) {
      passed++;
      results.push({ example, status: 'PASS' });
      console.log(`  ✅ ${label}`);
    } else {
      failed++;
      const stderr = proc.stderr.toString().slice(0, 300);
      results.push({ example, status: 'FAIL', error: stderr });
      console.log(`  ❌ ${label}`);
      console.log(`     Error: ${stderr.split('\n')[0]}`);
    }
  } catch (err) {
    failed++;
    results.push({ example, status: 'ERROR', error: err.message });
    console.log(`  💥 ${label}`);
    console.log(`     ${err.message}`);
  }
}

console.log('\n────────────────────────────────────────────────────────────');
console.log('Browser-only examples (open in browser):');
console.log('────────────────────────────────────────────────────────────');
for (const example of browserExamples) {
  console.log(`  🌐 ${example}`);
}

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed, ${examples.length} total`);
console.log('══════════════════════════════════════════════════════════════');

if (failed > 0) {
  console.log('\nFailed examples:');
  for (const r of results.filter((r) => r.status !== 'PASS')) {
    console.log(`  - ${r.example}`);
  }
  process.exit(1);
}

console.log('\n🎉 All examples validated successfully!');
