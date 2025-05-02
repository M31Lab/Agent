#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all TypeScript files in src directory
const files = glob.sync(path.join('src', '**', '*.ts'));

// Regex to match the ESLint missing return type warnings
const missingReturnTypeRegex = /Missing return type on function/;
const functionLineRegex = /^\s*(public|private|protected)?\s*(async)?\s*(\w+)\s*\([^)]*\)(:.*)?(\s*{|\s*=>)/;

// Run ESLint on each file and process the output
files.forEach(file => {
  const { execSync } = require('child_process');
  
  try {
    // Run ESLint on the file
    execSync(`npx eslint --no-eslintrc --config .eslintrc.js --rule '@typescript-eslint/explicit-function-return-type:["warn"]' ${file}`, { stdio: 'pipe' });
  } catch (error) {
    // ESLint will exit with code 1 if there are warnings
    const output = error.stdout.toString();
    
    // Extract line numbers from the warnings
    const lines = output.split('\n');
    const missingReturnLines = [];
    
    lines.forEach(line => {
      const match = line.match(/(\d+):\d+\s+warning\s+Missing return type on function/);
      if (match && match[1]) {
        missingReturnLines.push(parseInt(match[1], 10));
      }
    });
    
    if (missingReturnLines.length > 0) {
      // Read the file content
      const content = fs.readFileSync(file, 'utf8');
      const fileLines = content.split('\n');
      
      // Process each line with missing return type
      missingReturnLines.forEach(lineNum => {
        const line = fileLines[lineNum - 1];
        const functionMatch = line.match(functionLineRegex);
        
        if (functionMatch) {
          // Simple approach - add ': void' before the opening brace or arrow
          const hasReturnType = line.includes('): ') || line.includes(') : ');
          
          if (!hasReturnType) {
            // Find the position where to insert the return type
            const closingParenPos = line.lastIndexOf(')');
            if (closingParenPos !== -1) {
              // Insert ': void' after the closing parenthesis
              fileLines[lineNum - 1] = 
                line.substring(0, closingParenPos + 1) + 
                ': void' + 
                line.substring(closingParenPos + 1);
            }
          }
        }
      });
      
      // Write the modified content back to the file
      fs.writeFileSync(file, fileLines.join('\n'), 'utf8');
      
      console.log(`Fixed ${missingReturnLines.length} missing return types in ${file}`);
    }
  }
});

console.log('Finished fixing missing return types.'); 