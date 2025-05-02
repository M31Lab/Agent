#!/usr/bin/env node

const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue('Checking for outdated dependencies...'));

try {
  const outdated = execSync('npm outdated --json', { encoding: 'utf8' });

  if (outdated.trim()) {
    const outdatedDeps = JSON.parse(outdated);
    const depCount = Object.keys(outdatedDeps).length;

    console.log(chalk.yellow(`${depCount} outdated packages found:`));

    for (const [name, info] of Object.entries(outdatedDeps)) {
      console.log(
        `${chalk.cyan(name)}: ${chalk.red(info.current)} → ${chalk.green(info.latest)}` +
          (info.type === 'devDependencies' ? chalk.gray(' (dev)') : '')
      );
    }

    console.log('\nTo update all packages, run:');
    console.log(chalk.blue('npm update'));
    console.log('\nTo update to latest versions (potentially breaking), run:');
    console.log(chalk.blue('npx npm-check-updates -u && npm install'));
  } else {
    console.log(chalk.green('All dependencies are up to date!'));
  }
} catch (error) {
  console.error(chalk.red('Error checking dependencies:'), error.message);
  process.exit(1);
}
