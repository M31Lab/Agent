#!/usr/bin/env node

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// Get the root directory of the project
const rootDir = path.resolve(__dirname, '../../..');

// Create a logger for this scenario
function log(message) {
  console.log(`[Basic Completion] ${message}`);
}

// Define expected results
const EXPECTED_RESULT = {
  containsImport: true,
  hasMainFunction: true,
  returnsCorrectly: true
};

async function runScenario() {
  log('Starting basic completion scenario test');
  
  let extensionApi = null;
  
  try {
    // Get extension API
    const extension = vscode.extensions.getExtension('m31-ai.m31-agent');
    if (!extension) {
      throw new Error('Extension not found');
    }
    
    if (!extension.isActive) {
      log('Activating extension...');
      extensionApi = await extension.activate();
    } else {
      extensionApi = extension.exports;
    }
    
    log('Extension activated successfully');
    
    // Set up a test file
    const testDir = path.join(rootDir, '.eval-results/scenarios/basic-completion');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, 'test-file.js');
    fs.writeFileSync(testFilePath, '// Generate a function that returns the factorial of a number\n');
    log(`Created test file at ${testFilePath}`);
    
    // Open the test file
    const document = await vscode.workspace.openTextDocument(testFilePath);
    await vscode.window.showTextDocument(document);
    log('Opened test file in editor');
    
    // Request code completion
    log('Requesting code completion...');
    const result = await extensionApi.generateCode('Write a function that calculates the factorial of a number');
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Read the updated file
    const updatedContent = fs.readFileSync(testFilePath, 'utf8');
    log('Code completion finished');
    
    // Analyze the result
    const analysis = {
      containsImport: false,
      hasMainFunction: false,
      returnsCorrectly: false
    };
    
    // Check results
    analysis.hasMainFunction = /function\s+factorial/.test(updatedContent);
    analysis.returnsCorrectly = /return\s+n\s*\*\s*factorial\s*\(\s*n\s*-\s*1\s*\)/.test(updatedContent);
    
    // Log analysis
    log('Analysis of generated code:');
    for (const [key, value] of Object.entries(analysis)) {
      log(`- ${key}: ${value ? '✅' : '❌'}`);
    }
    
    // Check if the scenario passed
    const passed = Object.entries(EXPECTED_RESULT).every(([key, expected]) => {
      return analysis[key] === expected;
    });
    
    if (passed) {
      log('Scenario passed!');
    } else {
      throw new Error('Generated code did not meet expectations');
    }
    
    // Clean up
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    fs.unlinkSync(testFilePath);
    log('Cleanup completed');
    
  } catch (error) {
    log(`Error: ${error.message}`);
    throw error;
  }
}

// Run the scenario
runScenario().catch(error => {
  log(`Scenario failed: ${error.message}`);
  process.exit(1);
}); 