#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the directory where this script is located
const scenariosDir = __dirname;
const rootDir = path.resolve(scenariosDir, '../..');

// Create results directory if it doesn't exist
const resultsDir = path.join(rootDir, '.eval-results/scenarios');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Get the current timestamp for the results filename
const timestamp = new Date().toISOString().replace(/:/g, '-');
const resultsFile = path.join(resultsDir, `scenarios-results-${timestamp}.json`);

// Track all results
const results = {
  timestamp,
  scenarios: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

// Run all scenario tests
async function main() {
  console.log('Running scenario tests...');
  
  // Get all scenario directories
  const scenarioDirs = fs.readdirSync(scenariosDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'common')
    .map(dirent => dirent.name);
  
  if (scenarioDirs.length === 0) {
    console.log('No scenario directories found');
    return;
  }
  
  results.summary.total = scenarioDirs.length;
  
  // Run each scenario
  for (const scenarioDir of scenarioDirs) {
    const fullPath = path.join(scenariosDir, scenarioDir);
    const mainScriptPath = path.join(fullPath, 'index.js');
    
    // Skip if there's no index.js file
    if (!fs.existsSync(mainScriptPath)) {
      console.log(`⚠️ Scenario ${scenarioDir} has no index.js, skipping`);
      results.scenarios[scenarioDir] = { status: 'skipped', reason: 'No index.js file' };
      results.summary.skipped++;
      continue;
    }
    
    console.log(`\nRunning scenario: ${scenarioDir}`);
    
    try {
      execSync(`node "${mainScriptPath}"`, { 
        stdio: 'inherit',
        cwd: rootDir,
        timeout: 600000 // 10-minute timeout for scenarios
      });
      
      console.log(`✅ Scenario ${scenarioDir} passed`);
      results.scenarios[scenarioDir] = { status: 'passed' };
      results.summary.passed++;
    } catch (error) {
      console.error(`❌ Scenario ${scenarioDir} failed: ${error.message}`);
      results.scenarios[scenarioDir] = { 
        status: 'failed',
        error: error.message
      };
      results.summary.failed++;
    }
  }
  
  // Calculate success rate
  const successRate = (results.summary.total - results.summary.skipped) > 0
    ? (results.summary.passed / (results.summary.total - results.summary.skipped)) * 100
    : 0;
  
  // Print summary
  console.log('\n===== Scenarios Summary =====');
  console.log(`Total: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Skipped: ${results.summary.skipped}`);
  console.log(`Success rate: ${successRate.toFixed(2)}%`);
  
  // Save results to file
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${resultsFile}`);
  
  // Exit with error code if any scenarios failed
  if (results.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Scenario test run failed:', error);
  process.exit(1);
}); 