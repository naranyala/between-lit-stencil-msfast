// Master Runner: Validates all examples with real libraries
// Run: bun run examples/run-all.js

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const examples = [
  // Basics
  'basics/lit-basic.js',
  'basics/lit-directives.js',
  'basics/lit-lifecycle.js',
  'basics/lit-events.js',

  // Gallery - Frameworks
  'gallery/frameworks/counter-all.js',
  'gallery/frameworks/reactivity-deep-dive.js',
  'gallery/frameworks/template-rendering.js',
  'gallery/frameworks/styling-systems.js',
  'gallery/frameworks/lifecycle-events.js',

  // Gallery - Components
  'gallery/components/todo-lit.js',
  'gallery/components/user-profile-lit.js',
  'gallery/components/toggle-lit.js',
  'gallery/components/datatable-lit.js',
  'gallery/components/remaining-lit.js',
  'gallery/components/signal-element.js',

  // Lab - Architectural Proofs
  'lab/rendering-efficiency.js',
  'lab/design-assertions.js',
  'lab/state-orbit.js',
  'lab/form-bridge.js',
  'lab/async-boundary.js',
  'lab/memory-leak-test.js',
];

// Browser-only examples
const browserExamples = [
  'basics/fast-basic.html',
  'basics/fast-tokens.html',
  'basics/stencil-basic.js',
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
