#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const fixAnyTypes = () => {
    try {
        console.log('Running ESLint to find explicit any types...');
        const lintResult = execSync('npx eslint . --ext .ts,.tsx --format json', { encoding: 'utf8' });
        const issues = JSON.parse(lintResult);

        const fileChanges = {};

        issues.forEach(file => {
            const filePath = file.filePath;
            const anyTypeMessages = file.messages.filter(
                msg => msg.ruleId === '@typescript-eslint/no-explicit-any' && 
                      msg.message.includes('Unexpected any. Specify a different type')
            );

            if (anyTypeMessages.length > 0) {
                if (!fileChanges[filePath]) {
                    fileChanges[filePath] = {
                        content: fs.readFileSync(filePath, 'utf8'),
                        changes: []
                    };
                }

                anyTypeMessages.forEach(msg => {
                    fileChanges[filePath].changes.push({
                        line: msg.line,
                        column: msg.column,
                        endLine: msg.endLine,
                        endColumn: msg.endColumn
                    });
                });
            }
        });

        Object.keys(fileChanges).forEach(filePath => {
            let content = fileChanges[filePath].content;
            const changes = fileChanges[filePath].changes;

            changes.sort((a, b) => {
                if (a.line !== b.line) return b.line - a.line;
                return b.column - a.column;
            });

            const lines = content.split('\n');
            changes.forEach(change => {
                const line = lines[change.line - 1];
                
                // Determine the appropriate replacement based on context
                let replacementType = 'unknown';
                
                // Check for specific contexts to assign better types
                if (line.includes('Record<string, any>')) {
                    replacementType = 'unknown';
                } else if (line.includes('[]') || line.includes('Array')) {
                    replacementType = 'unknown[]';
                } else if (line.includes('Promise<any>')) {
                    replacementType = 'Promise<unknown>';
                } else if (line.includes('Map<') || line.includes('Set<')) {
                    replacementType = 'unknown';
                } else if (line.includes('(') && line.includes(')')) {
                    // Function parameters or return types
                    if (line.includes('=>')) {
                        replacementType = 'unknown';
                    }
                }
                
                // Replace 'any' with the determined type
                const newLine = line.replace(/\bany\b/, replacementType);
                lines[change.line - 1] = newLine;
            });

            fs.writeFileSync(filePath, lines.join('\n'));
            console.log(`Fixed any types in: ${filePath}`);
        });

        console.log('Any types fixed successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
};

fixAnyTypes(); 