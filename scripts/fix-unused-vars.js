#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all TypeScript files in src directory
const files = glob.sync(path.join('src', '**', '*.ts'));

// Regex to match the ESLint unused variable warnings
const unusedVarRegex = /'([a-zA-Z0-9]+)' is (?:defined|assigned a value) but never used/;

// Run ESLint on each file and process the output
files.forEach((file) => {
  const { execSync } = require('child_process');

  try {
    // Run ESLint on the file
    execSync(
      `npx eslint --no-eslintrc --config .eslintrc.js --rule '@typescript-eslint/no-unused-vars:["warn"]' ${file}`,
      { stdio: 'pipe' }
    );
  } catch (error) {
    // ESLint will exit with code 1 if there are warnings
    const output = error.stdout.toString();

    // Extract variable names from the warnings
    const lines = output.split('\n');
    const unusedVars = [];

    lines.forEach((line) => {
      const match = line.match(unusedVarRegex);
      if (match && match[1]) {
        const varName = match[1];
        if (!varName.startsWith('_')) {
          unusedVars.push(varName);
        }
      }
    });

    if (unusedVars.length > 0) {
      // Read the file content
      let content = fs.readFileSync(file, 'utf8');

      // Replace each unused variable with a prefixed version
      unusedVars.forEach((varName) => {
        // Use regex to replace the variable name with _variableName
        // Be careful to only replace variable declarations, not all occurrences
        const varDeclarationRegex = new RegExp(
          `(\\b(?:const|let|var|function|class|interface|type|enum|parameter)\\s+)(${varName}\\b)`,
          'g'
        );
        content = content.replace(varDeclarationRegex, `$1_${varName}`);

        // Also handle function parameters and destructuring
        const paramRegex = new RegExp(`(\\(|,\\s*)(${varName})(:|\\s*=|\\)|,)`, 'g');
        content = content.replace(paramRegex, `$1_${varName}$3`);

        // Handle object destructuring
        const destructuringRegex = new RegExp(`({\\s*.*?\\s*)(${varName})(\\s*}|\\s*,|\\s*:)`, 'g');
        content = content.replace(destructuringRegex, `$1_${varName}$3`);
      });

      // Write the modified content back to the file
      fs.writeFileSync(file, content, 'utf8');

      console.log(`Fixed ${unusedVars.length} unused variables in ${file}`);
    }
  }
});

console.log('Finished fixing unused variables.');
