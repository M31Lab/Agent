#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Get all TypeScript files in src directory
const files = glob.sync(path.join('src', '**', '*.ts'));

// Regex to match the ESLint explicit any type warnings
const anyTypeRegex = /Unexpected any. Specify a different type/;

// Run ESLint on each file and process the output
files.forEach(file => {
  const { execSync } = require('child_process');
  
  try {
    // Run ESLint on the file
    execSync(`npx eslint --no-eslintrc --config .eslintrc.js --rule '@typescript-eslint/no-explicit-any:["warn"]' ${file}`, { stdio: 'pipe' });
  } catch (error) {
    // ESLint will exit with code 1 if there are warnings
    const output = error.stdout.toString();
    
    // Extract line numbers from the warnings
    const lines = output.split('\n');
    const anyTypeLines = [];
    
    lines.forEach(line => {
      const match = line.match(/(\d+):\d+\s+warning\s+Unexpected any/);
      if (match && match[1]) {
        anyTypeLines.push(parseInt(match[1], 10));
      }
    });
    
    if (anyTypeLines.length > 0) {
      // Read the file content
      const content = fs.readFileSync(file, 'utf8');
      const fileLines = content.split('\n');
      
      // Process each line with explicit any type
      anyTypeLines.forEach(lineNum => {
        const line = fileLines[lineNum - 1];
        
        // Replace explicit 'any' types with more specific types based on context
        if (line.includes('any[]')) {
          // Array of any - replace with unknown[]
          fileLines[lineNum - 1] = line.replace(/any\[\]/g, 'unknown[]');
        } else if (line.includes(': any')) {
          // Simple any type - replace with unknown
          fileLines[lineNum - 1] = line.replace(/: any\b/g, ': unknown');
        } else if (line.includes('<any>') || line.includes('<any,')) {
          // Generic parameter - replace with unknown
          fileLines[lineNum - 1] = line.replace(/<any>/g, '<unknown>').replace(/<any,/g, '<unknown,');
        } else if (line.includes('Record<string, any>')) {
          // Record with any values - replace with Record<string, unknown>
          fileLines[lineNum - 1] = line.replace(/Record<string, any>/g, 'Record<string, unknown>');
        } else if (line.includes('Promise<any>')) {
          // Promise of any - replace with Promise<unknown>
          fileLines[lineNum - 1] = line.replace(/Promise<any>/g, 'Promise<unknown>');
        } else if (line.includes('as any')) {
          // Type assertion - replace with as unknown
          fileLines[lineNum - 1] = line.replace(/as any\b/g, 'as unknown');
        }
      });
      
      // Write the modified content back to the file
      fs.writeFileSync(file, fileLines.join('\n'), 'utf8');
      
      console.log(`Fixed ${anyTypeLines.length} explicit any types in ${file}`);
    }
  }
});

console.log('Finished fixing explicit any types.'); 