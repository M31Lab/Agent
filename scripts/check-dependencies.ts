import { execSync } from 'child_process';
import chalk from 'chalk';

interface DependencyInfo {
  current: string;
  latest: string;
  type?: string;
}

interface OutdatedDependencies {
  [key: string]: DependencyInfo;
}

console.log(chalk.blue('Checking for outdated dependencies...'));

try {
  const out = execSync('npm outdated --json', { encoding: 'utf8' });
  
  if (out.trim()) {
    const outdatedDeps: OutdatedDependencies = JSON.parse(out);
    const depCount = Object.keys(outdatedDeps).length;
    
    console.log(chalk.yellow(`${depCount} outdated packages found:`));
    
    for (const [name, info] of Object.entries<DependencyInfo>(outdatedDeps)) {
      console.log(
        `${chalk.cyan(name)}: ${chalk.red(info.current)} → ${chalk.green(info.latest)}` +
        (info.type === 'devDependencies' ? chalk.gray(' (dev)') : '')
      );
    }
    
    console.log('\nTo update all packages, run:');
    console.log(chalk.blue('npm update'));
    console.log('\nTo update to latest version (potentially breaking), run:');
    console.log(chalk.blue('npx npm-check-update -u && npm install'));
  } else {
    console.log(chalk.green('All dependencies are up to date!'));
  }
} catch (error) {
  console.error(chalk.red('Error checking dependencies:'), (error as Error).message);
  process.exit(1);
}
