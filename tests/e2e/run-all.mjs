// tests/e2e/run-all.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { API_BASE_URL, waitForApi } from './helpers/env.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArgs(argv) {
  const options = {
    tier: null,
    bail: false,
    verbose: false,
    filter: null,
    skipHealth: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--bail' || arg === '-b') options.bail = true;
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
    else if (arg === '--skip-health') options.skipHealth = true;
    else if (arg.startsWith('--tier=')) options.tier = parseInt(arg.split('=')[1], 10);
    else if (arg === '--tier' || arg === '-t') options.tier = parseInt(argv[++i], 10);
    else if (arg.startsWith('--filter=')) options.filter = arg.split('=')[1];
    else if (arg === '--filter' || arg === '-f') options.filter = argv[++i];
  }
  return options;
}

function printHelp() {
  console.log(`
Educational Ecommerce App - E2E Test Runner

Usage:
  node tests/e2e/run-all.mjs [options]
  npm run test:e2e [-- options]

Options:
  -t, --tier=<1-4>      Run only specified tier (1: Features, 2: Boundaries, 3: Interactions, 4: Scenarios)
  -b, --bail            Stop on first test failure
  -v, --verbose         Print each test case as it executes
  -f, --filter=<string> Run tests matching name filter
      --skip-health     Skip pre-flight backend health check
  -h, --help            Show this help message
`);
}

function formatDuration(ms) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function printSummaryTable(results) {
  const colSuite = 44;
  const colPass = 8;
  const colFail = 8;
  const colTotal = 7;
  const colDur = 10;

  const lineTop = `┌${'─'.repeat(colSuite + 2)}┬${'─'.repeat(colPass + 2)}┬${'─'.repeat(colFail + 2)}┬${'─'.repeat(colTotal + 2)}┬${'─'.repeat(colDur + 2)}┐`;
  const lineMid = `├${'─'.repeat(colSuite + 2)}┼${'─'.repeat(colPass + 2)}┼${'─'.repeat(colFail + 2)}┼${'─'.repeat(colTotal + 2)}┼${'─'.repeat(colDur + 2)}┤`;
  const lineBot = `└${'─'.repeat(colSuite + 2)}┴${'─'.repeat(colPass + 2)}┴${'─'.repeat(colFail + 2)}┴${'─'.repeat(colTotal + 2)}┴${'─'.repeat(colDur + 2)}┘`;

  const formatRow = (name, p, f, t, d) =>
    `│ ${name.padEnd(colSuite)} │ ${String(p).padStart(colPass)} │ ${String(f).padStart(colFail)} │ ${String(t).padStart(colTotal)} │ ${d.padStart(colDur)} │`;

  console.log('\n' + lineTop);
  console.log(formatRow('Test Suite Tier', 'Passed', 'Failed', 'Total', 'Duration'));
  console.log(lineMid);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;
  let totalDuration = 0;

  for (const r of results) {
    totalPassed += r.passed;
    totalFailed += r.failed;
    totalTests += r.total;
    totalDuration += r.durationMs;
    console.log(formatRow(r.name, r.passed, r.failed, r.total, formatDuration(r.durationMs)));
  }

  console.log(lineMid);
  console.log(formatRow('TOTAL', totalPassed, totalFailed, totalTests, formatDuration(totalDuration)));
  console.log(lineBot + '\n');
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log('================================================================');
  console.log(' Educational Ecommerce Application - E2E Verification Suite');
  console.log(` Target API: ${API_BASE_URL}`);
  console.log('================================================================');

  // Pre-flight health check
  if (!options.skipHealth) {
    process.stdout.write('Checking backend API health... ');
    const isAlive = await waitForApi(5, 500);
    if (!isAlive) {
      console.log('❌ NOT REACHABLE');
      console.error(`\n[ERROR] Backend at ${API_BASE_URL} is not responding.`);
      console.error('Please ensure the database and backend server are running:');
      console.error('  npm run db:up');
      console.error('  npm run backend:dev');
      console.error('\n(Use --skip-health to run without pre-flight check)\n');
      process.exit(1);
    }
    console.log('✓ OK');
  }

  const tierFiles = [
    { tier: 1, name: 'Tier 1: Feature Coverage', file: './tier1-feature-coverage.test.mjs' },
    { tier: 2, name: 'Tier 2: Boundary & Corner Cases', file: './tier2-boundary-corner.test.mjs' },
    { tier: 3, name: 'Tier 3: Cross-Feature Interactions', file: './tier3-cross-feature.test.mjs' },
    { tier: 4, name: 'Tier 4: Real-World Scenarios', file: './tier4-real-world-scenarios.test.mjs' },
  ];

  const suitesToRun = options.tier
    ? tierFiles.filter((t) => t.tier === options.tier)
    : tierFiles;

  if (suitesToRun.length === 0) {
    console.error(`Unknown tier: ${options.tier}. Must be 1, 2, 3, or 4.`);
    process.exit(1);
  }

  const results = [];
  const allFailures = [];

  for (const item of suitesToRun) {
    console.log(`\n▶ Running ${item.name}...`);
    try {
      const modulePath = join(__dirname, item.file);
      const mod = await import(modulePath);
      const suiteResult = await mod.suite.run({
        bail: options.bail,
        verbose: options.verbose,
        filter: options.filter,
      });
      results.push(suiteResult);
      if (suiteResult.failures.length > 0) {
        allFailures.push(...suiteResult.failures.map((f) => ({ ...f, tier: item.name })));
      }
      if (options.bail && suiteResult.failed > 0) {
        console.log(`[BAIL] Halting execution due to failures in ${item.name}.`);
        break;
      }
    } catch (err) {
      console.error(`Failed to load or execute ${item.file}:`, err);
      results.push({
        name: item.name,
        passed: 0,
        failed: 1,
        total: 1,
        durationMs: 0,
        failures: [{ test: `${item.name} Execution`, error: err.message, stack: err.stack }],
      });
      allFailures.push({ tier: item.name, test: 'Suite Load', error: err.message });
      if (options.bail) break;
    }
  }

  // Summary Table Output
  printSummaryTable(results);

  // Detailed Failure Logging
  if (allFailures.length > 0) {
    console.log('================================================================');
    console.log(' FAILURE DETAILS');
    console.log('================================================================');
    allFailures.forEach((f, idx) => {
      console.log(`\n${idx + 1}) [${f.tier}] ${f.test}`);
      console.log(`   Error: ${f.error}`);
      if (f.stack) {
        const relevantStack = f.stack.split('\n').slice(1, 4).join('\n');
        console.log(relevantStack);
      }
    });
    console.log('\n================================================================');
    console.log(`❌ FAILED: ${allFailures.length} test(s) failed.`);
    process.exit(1);
  } else {
    const totalPassed = results.reduce((acc, r) => acc + r.passed, 0);
    console.log(`✅ SUCCESS: All ${totalPassed} tests passed successfully.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
