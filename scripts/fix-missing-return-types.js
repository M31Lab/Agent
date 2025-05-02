#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ts = require('typescript');

const fixReturnTypes = () => {
    try {
        console.log('Running ESLint to find missing return types...');
        const lintResult = execSync('npx eslint . --ext .ts,.tsx --format json', { encoding: 'utf8' });
        const issues = JSON.parse(lintResult);

        const fileChanges = {};

        issues.forEach(file => {
            const filePath = file.filePath;
            const missingReturnTypeMessages = file.messages.filter(
                msg => msg.ruleId === '@typescript-eslint/explicit-function-return-type' && 
                      msg.message.includes('Missing return type on function')
            );

            if (missingReturnTypeMessages.length > 0) {
                if (!fileChanges[filePath]) {
                    fileChanges[filePath] = {
                        content: fs.readFileSync(filePath, 'utf8'),
                        changes: []
                    };
                }

                missingReturnTypeMessages.forEach(msg => {
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
            const sourceFile = ts.createSourceFile(
                filePath,
                fileChanges[filePath].content,
                ts.ScriptTarget.Latest,
                true
            );

            let content = fileChanges[filePath].content;
            const changes = fileChanges[filePath].changes;

            changes.sort((a, b) => {
                if (a.line !== b.line) return b.line - a.line;
                return b.column - a.column;
            });

            const typeChecker = inferReturnTypes(filePath, content);

            const lines = content.split('\n');
            changes.forEach(change => {
                const line = lines[change.line - 1];
                const functionMatch = line.match(/function\s+\w+\s*\(.*?\)(\s*\{)?/) || 
                                      line.match(/\w+\s*=\s*(\(.*?\)|async\s*\(.*?\))(\s*=>)?/);
                
                if (functionMatch) {
                    let returnType = 'void';
                    // Attempt to use TypeScript's type checker if available
                    if (typeChecker) {
                        returnType = typeChecker;
                    } else {
                        // Simple heuristic for common return types
                        if (content.includes('return') && content.includes('Promise')) {
                            returnType = 'Promise<void>';
                        } else if (content.includes('return true') || content.includes('return false')) {
                            returnType = 'boolean';
                        } else if (content.includes('return {')) {
                            returnType = 'Record<string, unknown>';
                        } else if (content.includes('return [')) {
                            returnType = 'unknown[]';
                        } else if (content.match(/return\s+\d+/)) {
                            returnType = 'number';
                        } else if (content.match(/return\s+['"`]/)) {
                            returnType = 'string';
                        }
                    }

                    // Insert return type
                    let newLine;
                    if (line.includes('=>')) {
                        // Arrow function
                        const arrowIndex = line.indexOf('=>');
                        const closingParenIndex = line.lastIndexOf(')', arrowIndex);
                        newLine = line.substring(0, closingParenIndex + 1) + ': ' + returnType + ' ' + line.substring(closingParenIndex + 1);
                    } else if (line.includes('function')) {
                        // Named function
                        const openingParenIndex = line.indexOf('(');
                        const closingParenIndex = line.lastIndexOf(')');
                        newLine = line.substring(0, closingParenIndex + 1) + ': ' + returnType + line.substring(closingParenIndex + 1);
                    } else {
                        // Method or other function type
                        const closingParenIndex = line.lastIndexOf(')');
                        newLine = line.substring(0, closingParenIndex + 1) + ': ' + returnType + line.substring(closingParenIndex + 1);
                    }
                    
                    lines[change.line - 1] = newLine;
                }
            });

            fs.writeFileSync(filePath, lines.join('\n'));
            console.log(`Fixed missing return types in: ${filePath}`);
        });

        console.log('Missing return types fixed successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
};

function inferReturnTypes(filePath, content) {
    // This is a simplified approach - would need a full TypeScript program
    // with type checking for accurate inference
    return null;
}

fixReturnTypes(); 