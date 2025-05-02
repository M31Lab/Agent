#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const findFiles = (dir, extensions) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory() && !fullPath.includes('node_modules')) {
            results = results.concat(findFiles(fullPath, extensions));
        } else if (extensions.includes(path.extname(fullPath))) {
            results.push(fullPath);
        }
    });
    return results;
};

const fixUnusedVars = () => {
    try {
        console.log('Running ESLint to find unused variables...');
        const lintResult = execSync('npx eslint . --ext .ts,.tsx --format json', { encoding: 'utf8' });
        const issues = JSON.parse(lintResult);

        const fileChanges = {};

        issues.forEach(file => {
            const filePath = file.filePath;
            const unusedVarMessages = file.messages.filter(
                msg => msg.ruleId === '@typescript-eslint/no-unused-vars' && 
                       msg.message.includes('is defined but never used') &&
                       !msg.message.includes('must match /^_/u')
            );

            if (unusedVarMessages.length > 0) {
                if (!fileChanges[filePath]) {
                    fileChanges[filePath] = {
                        content: fs.readFileSync(filePath, 'utf8'),
                        changes: []
                    };
                }

                unusedVarMessages.forEach(msg => {
                    const varName = msg.message.match(/['']([^'']+)[''] is defined but never used/)[1];
                    fileChanges[filePath].changes.push({
                        line: msg.line,
                        column: msg.column,
                        varName
                    });
                });
            }
        });

        // Apply changes to files
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
                const newLine = line.substring(0, change.column - 1) + '_' + line.substring(change.column - 1);
                lines[change.line - 1] = newLine;
            });

            fs.writeFileSync(filePath, lines.join('\n'));
            console.log(`Fixed unused variables in: ${filePath}`);
        });

        console.log('Unused variables fixed successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    }
};

fixUnusedVars(); 