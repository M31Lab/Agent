#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

function exec(command) {
  console.log(`> ${command}`);
  return execSync(command, { stdio: 'inherit', cwd: rootDir });
}

function checkCleanWorkingDirectory() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8', cwd: rootDir });
    if (status.trim()) {
      console.error('Working directory is not clean. Please commit or stash changes first.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to check git status:', error.message);
    process.exit(1);
  }
}

function updateVersion() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;

  console.log(`Current version: ${currentVersion}`);

  // Get the next version
  const nextPatch = semver.inc(currentVersion, 'patch');
  const nextMinor = semver.inc(currentVersion, 'minor');
  const nextMajor = semver.inc(currentVersion, 'major');

  console.log(`Available versions:
  1) Patch: ${nextPatch} (bug fixes)
  2) Minor: ${nextMinor} (new features)
  3) Major: ${nextMajor} (breaking changes)
  4) Custom version`);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question('Select version (1-4): ', (answer) => {
    let newVersion;

    switch (answer.trim()) {
      case '1':
        newVersion = nextPatch;
        break;
      case '2':
        newVersion = nextMinor;
        break;
      case '3':
        newVersion = nextMajor;
        break;
      case '4':
        readline.question('Enter custom version: ', (custom) => {
          if (!semver.valid(custom)) {
            console.error('Invalid version format');
            process.exit(1);
          }
          updatePackageJson(custom);
          readline.close();
        });
        return;
      default:
        console.error('Invalid selection');
        process.exit(1);
    }

    updatePackageJson(newVersion);
    readline.close();
  });
}

function updatePackageJson(newVersion) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Updated version to ${newVersion}`);

    // Run tests and build
    exec('npm run lint');
    exec('npm run test');
    exec('npm run build');

    // Update changelog
    updateChangelog(newVersion);

    // Commit changes
    exec(`git add package.json CHANGELOG.md`);
    exec(`git commit -m "chore: prepare release v${newVersion}"`);
    console.log(`\nRelease v${newVersion} prepared successfully!`);
    console.log('To publish, run: npm run release');
  } catch (error) {
    console.error('Failed to update version:', error.message);
    process.exit(1);
  }
}

function updateChangelog(version) {
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];

  try {
    let changelog = fs.readFileSync(changelogPath, 'utf8');
    const versionHeader = `## [${version}] - ${date}`;

    if (changelog.includes(versionHeader)) {
      console.log('Changelog already contains this version. Skipping update.');
      return;
    }

    // Get git log since last tag
    let lastTag;
    try {
      lastTag = execSync('git describe --tags --abbrev=0', {
        encoding: 'utf8',
        cwd: rootDir,
      }).trim();
    } catch (e) {
      // No previous tags
      lastTag = '';
    }

    const gitLogCommand = lastTag
      ? `git log ${lastTag}..HEAD --pretty=format:"- %s (%h)"`
      : 'git log --pretty=format:"- %s (%h)"';

    const changes = execSync(gitLogCommand, { encoding: 'utf8', cwd: rootDir })
      .split('\n')
      .filter((line) => !line.startsWith('- chore:') && line.trim())
      .join('\n');

    const newEntry = `## [${version}] - ${date}\n\n${changes || '- No significant changes'}\n\n`;

    // Insert after the first line
    const lines = changelog.split('\n');
    lines.splice(1, 0, '', newEntry);

    fs.writeFileSync(changelogPath, lines.join('\n'));
    console.log('Updated CHANGELOG.md');
  } catch (error) {
    console.error('Failed to update changelog:', error.message);
    process.exit(1);
  }
}

// Main execution
console.log('Running prerelease checks...');
checkCleanWorkingDirectory();
updateVersion();
