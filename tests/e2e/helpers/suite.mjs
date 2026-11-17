// tests/e2e/helpers/suite.mjs
export function createSuite(suiteName, suiteOptions = {}) {
  const tests = [];

  function test(name, fn) {
    tests.push({ name, fn });
  }

  async function run(options = {}) {
    const bail = options.bail ?? suiteOptions.bail ?? false;
    const verbose = options.verbose ?? suiteOptions.verbose ?? false;
    const filter = options.filter ?? null;

    const results = {
      name: suiteName,
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      durationMs: 0,
      failures: [],
    };

    const suiteStart = Date.now();

    for (const t of tests) {
      if (filter && !t.name.toLowerCase().includes(filter.toLowerCase())) {
        results.skipped++;
        continue;
      }

      results.total++;
      const testStart = Date.now();
      try {
        await t.fn();
        results.passed++;
        if (verbose) {
          console.log(`  ✓ ${t.name} (${Date.now() - testStart}ms)`);
        }
      } catch (err) {
        results.failed++;
        results.failures.push({ test: t.name, error: err.message, stack: err.stack });
        console.error(`  ✗ ${t.name}\n    Error: ${err.message}`);
        if (bail) {
          console.error(`  [BAIL] Halting suite on first failure.`);
          break;
        }
      }
    }

    results.durationMs = Date.now() - suiteStart;
    return results;
  }

  return { name: suiteName, test, run, get testCount() { return tests.length; } };
}
