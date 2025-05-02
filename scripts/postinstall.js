#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if running in CI environment
const isCI = process.env.CI === 'true';

// Get root directory of the project
const rootDir = path.resolve(__dirname, '..');

// Log with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Execute command and handle errors
function exec(command, ignoreError = false) {
  log(`Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    return true;
  } catch (error) {
    if (!ignoreError) {
      log(`Error executing command: ${error.message}`);
      return false;
    }
    log(`Command failed, but continuing: ${error.message}`);
    return false;
  }
}

// Main installation steps
async function main() {
  log('Running postinstall script...');

  // Create necessary directories if they don't exist
  const dirsToCreate = ['.benchmark-results', '.changes/unreleased', 'docs/api'];

  dirsToCreate.forEach((dir) => {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) {
      log(`Creating directory: ${dir}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  // Skip husky install in CI environment
  if (!isCI) {
    try {
      // Check if .git directory exists
      if (fs.existsSync(path.join(rootDir, '.git'))) {
        log('Setting up git hooks with husky...');
        exec('npx husky install', true);

        // Make sure the hook scripts are executable
        const huskyHooksDir = path.join(rootDir, '.husky');
        if (fs.existsSync(huskyHooksDir)) {
          exec('chmod +x .husky/*', true);
          log('Made husky hooks executable');
        }
      } else {
        log('No .git directory found, skipping husky setup');
      }
    } catch (error) {
      log(`Husky setup failed, but continuing: ${error.message}`);
    }
  } else {
    log('Running in CI environment, skipping husky setup');
  }

  // Install additional dev dependencies if needed
  const additionalDevDeps = [
    '@changesets/cli',
    'typedoc',
    'rimraf',
    'codespell',
    'husky',
    'semver',
    'chalk',
  ];

  // Check if dependencies are already installed
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const devDeps = packageJson.devDependencies || {};

  const missingDeps = additionalDevDeps.filter((dep) => !devDeps[dep]);

  if (missingDeps.length > 0) {
    log(`Installing missing dev dependencies: ${missingDeps.join(', ')}`);
    exec(`npm install --save-dev ${missingDeps.join(' ')}`, true);
  }

  log('Postinstall completed successfully!');
}

// Run the main function
main().catch((error) => {
  log(`Postinstall failed: ${error.message}`);
  // Don't exit with error code, as we want npm install to succeed
});
