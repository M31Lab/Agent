#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the directory where this script is located
const integrationDir = __dirname;
const rootDir = path.resolve(integrationDir, '../..');

// Create results directory if it doesn't exist
const resultsDir = path.join(rootDir, '.eval-results/integration');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Get the current timestamp for the results filename
const timestamp = new Date().toISOString().replace(/:/g, '-');
const resultsFile = path.join(resultsDir, `integration-results-${timestamp}.json`);

// Track all results
const results = {
  timestamp,
  tests: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

// Run all integration tests
async function main() {
  console.log('Running integration tests...');
  
  // Get all .js files in the integration directory
  const files = fs.readdirSync(integrationDir)
    .filter(file => file.endsWith('.js') && file !== 'run.js');
  
  if (files.length === 0) {
    console.log('No integration test files found');
    return;
  }
  
  results.summary.total = files.length;
  
  // Run each test file
  for (const file of files) {
    const fullPath = path.join(integrationDir, file);
    const testName = path.basename(file, '.js');
    
    console.log(`\nRunning integration test: ${testName}`);
    
    try {
      execSync(`node "${fullPath}"`, { 
        stdio: 'inherit',
        cwd: rootDir,
        timeout: 300000 // 5-minute timeout
      });
      
      console.log(`✅ ${testName} passed`);
      results.tests[testName] = { status: 'passed' };
      results.summary.passed++;
    } catch (error) {
      console.error(`❌ ${testName} failed: ${error.message}`);
      results.tests[testName] = { 
        status: 'failed',
        error: error.message
      };
      results.summary.failed++;
    }
  }
  
  // Calculate success rate
  const successRate = results.summary.total > 0
    ? (results.summary.passed / results.summary.total) * 100
    : 0;
  
  // Print summary
  console.log('\n===== Integration Tests Summary =====');
  console.log(`Total: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Skipped: ${results.summary.skipped}`);
  console.log(`Success rate: ${successRate.toFixed(2)}%`);
  
  // Save results to file
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${resultsFile}`);
  
  // Exit with error code if any tests failed
  if (results.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Integration test run failed:', error);
  process.exit(1);
}); 