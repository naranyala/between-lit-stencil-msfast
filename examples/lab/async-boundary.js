// Comparison: Async Boundary (Data Orchestration)
// Manual State vs. Signal Resources
// Run: bun run examples/comparisons/10-async-boundary.js

import { signal, effect, createResource } from '../core/signal.js';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Async Boundary: Manual State vs. Resources          ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

const mockFetch = async (id) => {
  await new Promise(r => setTimeout(r, 100));
  if (id === 'error') throw new Error('Network Failure!');
  return { id, name: `User ${id}` };
};

// ─── 1. The "Standard Way" (Manual State Management) ───
console.log('--- 1. Manual State Management ---');
async function fetchUserManual(id) {
  const loading = signal(false);
  const data = signal(null);
  const error = signal(null);

  effect(() => {
    console.log(`  [Manual UI] Status: ${loading() ? 'Loading...' : data() ? 'Success' : 'Idle'} ${error() ? 'Error: ' + error() : ''}`);
  });

  loading.set(true);
  try {
    const res = await mockFetch(id);
    data.set(res);
  } catch (e) {
    error.set(e.message);
  } finally {
    loading.set(false);
  }
}

await fetchUserManual('1');
console.log('');

// ─── 2. The "Next-Gen Way" (Signal Resources) ───
console.log('--- 2. Signal Resources (Declarative) ---');
const userId = signal('2');
const userResource = createResource(userId, mockFetch);

effect(() => {
  const state = userResource.pending() ? 'Loading...' : 
                userResource.error() ? `Error: ${userResource.error()}` : 
                `Success: ${userResource.data()?.name}`;
  console.log(`  [Resource UI] Status: ${state}`);
});

console.log('Action: changing userId to "error"');
userId.set('error');
await new Promise(r => setTimeout(r, 200));

console.log('\nComparison Summary:');
console.log('Manual State: Imperative "try/catch/finally" in every function. High boilerplate.');
console.log('Signal Resource: Declarative binding. The UI simply reacts to the resource state.');
console.log('Verdict: Resources turn async data into a first-class reactive value.');
