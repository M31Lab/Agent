#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get the directory where this script is located
const scriptsDir = __dirname;
const rootDir = path.resolve(scriptsDir, '..');

// Create results directory if it doesn't exist
const resultsDir = path.join(rootDir, '.eval-results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Get the current timestamp for the results filename
const timestamp = new Date().toISOString().replace(/:/g, '-');
const resultsFile = path.join(resultsDir, `eval-results-${timestamp}.json`);

// Track all results
const allResults = {
  timestamp,
  categories: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

// Function to run a specific evaluation category
async function runCategory(category) {
  console.log(`\n\n===== Running ${category} evaluations =====\n`);
  
  const categoryDir = path.join(scriptsDir, category);
  if (!fs.existsSync(categoryDir)) {
    console.error(`Category directory ${categoryDir} does not exist.`);
    return { passed: 0, failed: 0, skipped: 0, total: 0 };
  }
  
  // Get all .js files in the category directory
  const files = fs.readdirSync(categoryDir)
    .filter(file => file.endsWith('.js') && file !== 'run.js');
  
  if (files.length === 0) {
    console.log(`No evaluation files found in ${category}`);
    return { passed: 0, failed: 0, skipped: 0, total: 0 };
  }
  
  // Initialize results for this category
  const categoryResults = {
    tests: {},
    summary: {
      total: files.length,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  };
  
  // Run each evaluation file
  for (const file of files) {
    const fullPath = path.join(categoryDir, file);
    const testName = path.basename(file, '.js');
    
    console.log(`\nRunning ${testName}...`);
    
    try {
      execSync(`node "${fullPath}"`, { 
        stdio: 'inherit',
        cwd: rootDir,
        timeout: 300000 // 5-minute timeout
      });
      
      console.log(`✅ ${testName} passed`);
      categoryResults.tests[testName] = { status: 'passed' };
      categoryResults.summary.passed++;
    } catch (error) {
      console.error(`❌ ${testName} failed: ${error.message}`);
      categoryResults.tests[testName] = { 
        status: 'failed',
        error: error.message
      };
      categoryResults.summary.failed++;
    }
  }
  
  // Update the overall results
  allResults.categories[category] = categoryResults;
  allResults.summary.total += categoryResults.summary.total;
  allResults.summary.passed += categoryResults.summary.passed;
  allResults.summary.failed += categoryResults.summary.failed;
  allResults.summary.skipped += categoryResults.summary.skipped;
  
  return categoryResults.summary;
}

// Main function to run all evaluation categories
async function main() {
  console.log('Starting evaluation run...');
  
  const categories = [
    'benchmarks',
    'integration',
    'scenarios'
  ];
  
  for (const category of categories) {
    await runCategory(category);
  }
  
  // Calculate success rate
  const successRate = allResults.summary.total > 0
    ? (allResults.summary.passed / allResults.summary.total) * 100
    : 0;
  
  // Print summary
  console.log('\n\n===== Evaluation Summary =====');
  console.log(`Total: ${allResults.summary.total}`);
  console.log(`Passed: ${allResults.summary.passed}`);
  console.log(`Failed: ${allResults.summary.failed}`);
  console.log(`Skipped: ${allResults.summary.skipped}`);
  console.log(`Success rate: ${successRate.toFixed(2)}%`);
  
  // Save results to file
  fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
  console.log(`\nResults saved to ${resultsFile}`);
  
  // Exit with error code if any tests failed
  if (allResults.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Evaluation run failed:', error);
  process.exit(1);
}); 