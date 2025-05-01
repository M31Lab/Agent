import * as vscode from 'vscode';
import * as path from 'path';
import { CheckpointService } from '../services/checkpoint/checkpointService';
import { CheckpointRestoreOptions } from '../models/checkpoint';

export function registerCheckpointCommands(
    context: vscode.ExtensionContext,
    checkpointService: CheckpointService
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.checkpoint.create', async () => {
            try {
                const name = await vscode.window.showInputBox({
                    prompt: 'Enter a name for the checkpoint',
                    placeHolder: 'Checkpoint name'
                });
                
                if (!name) {
                    return;
                }
                
                const description = await vscode.window.showInputBox({
                    prompt: 'Enter an optional description',
                    placeHolder: 'Checkpoint description (optional)'
                });
                
                const checkpointId = await checkpointService.createCheckpoint(
                    name,
                    description
                );
                
                vscode.window.showInformationMessage(`Checkpoint created: ${name}`);
                
                return checkpointId;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create checkpoint: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.checkpoint.restore', async () => {
            try {
                const checkpoints = checkpointService.getAllCheckpoints()
                    .map(cp => ({
                        label: cp.name,
                        description: cp.description,
                        detail: `Created: ${new Date(cp.timestamp).toLocaleString()}`,
                        id: cp.id
                    }));
                
                if (checkpoints.length === 0) {
                    vscode.window.showInformationMessage('No checkpoints found.');
                    return;
                }
                
                const checkpoint = await vscode.window.showQuickPick(checkpoints, {
                    placeHolder: 'Select a checkpoint to restore'
                });
                
                if (!checkpoint) {
                    return;
                }
                
                const options = await vscode.window.showQuickPick([
                    {
                        label: 'Restore Workspace Only',
                        description: 'Restore files without task state',
                        restoreTaskState: false,
                        restoreTerminalState: false,
                        restoreEditorState: true
                    },
                    {
                        label: 'Restore Task and Workspace',
                        description: 'Restore files and task state',
                        restoreTaskState: true,
                        restoreTerminalState: false,
                        restoreEditorState: true
                    },
                    {
                        label: 'Full Restore',
                        description: 'Restore everything (files, task, terminal)',
                        restoreTaskState: true,
                        restoreTerminalState: true,
                        restoreEditorState: true
                    }
                ], {
                    placeHolder: 'Select restore options'
                });
                
                if (!options) {
                    return;
                }
                
                const restoreOptions: CheckpointRestoreOptions = {
                    restoreTaskState: options.restoreTaskState,
                    restoreTerminalState: options.restoreTerminalState,
                    restoreEditorState: options.restoreEditorState
                };
                
                const success = await checkpointService.restoreCheckpoint(checkpoint.id, restoreOptions);
                
                if (success) {
                    vscode.window.showInformationMessage(`Checkpoint restored: ${checkpoint.label}`);
                } else {
                    vscode.window.showWarningMessage('Checkpoint restore was cancelled');
                }
                
                return success;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to restore checkpoint: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.checkpoint.compare', async () => {
            try {
                const checkpoints = checkpointService.getAllCheckpoints()
                    .map(cp => ({
                        label: cp.name,
                        description: cp.description,
                        detail: `Created: ${new Date(cp.timestamp).toLocaleString()}`,
                        id: cp.id
                    }));
                
                if (checkpoints.length === 0) {
                    vscode.window.showInformationMessage('No checkpoints found.');
                    return;
                }
                
                const fromCheckpoint = await vscode.window.showQuickPick([
                    { label: 'Current Workspace', id: 'current' },
                    ...checkpoints
                ], {
                    placeHolder: 'Compare from (source)'
                });
                
                if (!fromCheckpoint) {
                    return;
                }
                
                const toCheckpoints = fromCheckpoint.id === 'current'
                    ? checkpoints
                    : [{ label: 'Current Workspace', id: 'current' }, ...checkpoints.filter(cp => cp.id !== fromCheckpoint.id)];
                
                const toCheckpoint = await vscode.window.showQuickPick(toCheckpoints, {
                    placeHolder: 'Compare to (target)'
                });
                
                if (!toCheckpoint) {
                    return;
                }
                
                let diff;
                
                if (fromCheckpoint.id === 'current' && toCheckpoint.id !== 'current') {
                    diff = await checkpointService.compareWithCurrent(toCheckpoint.id);
                } else if (fromCheckpoint.id !== 'current' && toCheckpoint.id === 'current') {
                    diff = await checkpointService.compareWithCurrent(fromCheckpoint.id);
                } else if (fromCheckpoint.id !== 'current' && toCheckpoint.id !== 'current') {
                    diff = await checkpointService.compareCheckpoints(fromCheckpoint.id, toCheckpoint.id);
                } else {
                    vscode.window.showInformationMessage('Cannot compare current workspace to itself.');
                    return;
                }
                
                if (diff.fileChanges.length === 0) {
                    vscode.window.showInformationMessage('No differences found between the selected checkpoints.');
                    return;
                }
                
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                
                if (!workspaceRoot) {
                    vscode.window.showErrorMessage('No workspace folder is open');
                    return;
                }
                
                // Create a temporary folder for diff files
                const tempFolder = path.join(workspaceRoot, '.m31-agent-diff');
                const fs = require('fs');
                
                if (!fs.existsSync(tempFolder)) {
                    fs.mkdirSync(tempFolder, { recursive: true });
                }
                
                // Create before/after files for each changed file
                for (const change of diff.fileChanges) {
                    const relativePath = change.path;
                    const fileName = path.basename(relativePath);
                    const fileExt = path.extname(relativePath);
                    const fileNameWithoutExt = fileName.substring(0, fileName.length - fileExt.length);
                    
                    // Create "before" file
                    if (change.oldContent !== undefined) {
                        const beforePath = path.join(tempFolder, `${fileNameWithoutExt}.before${fileExt}`);
                        fs.writeFileSync(beforePath, change.oldContent);
                    }
                    
                    // Create "after" file
                    if (change.newContent !== undefined) {
                        const afterPath = path.join(tempFolder, `${fileNameWithoutExt}.after${fileExt}`);
                        fs.writeFileSync(afterPath, change.newContent);
                    }
                    
                    // Open diff view
                    if (change.oldContent !== undefined && change.newContent !== undefined) {
                        const beforeUri = vscode.Uri.file(path.join(tempFolder, `${fileNameWithoutExt}.before${fileExt}`));
                        const afterUri = vscode.Uri.file(path.join(tempFolder, `${fileNameWithoutExt}.after${fileExt}`));
                        
                        await vscode.commands.executeCommand('vscode.diff',
                            beforeUri,
                            afterUri,
                            `${relativePath} (${fromCheckpoint.label} → ${toCheckpoint.label})`
                        );
                    } else if (change.oldContent !== undefined) {
                        // File was deleted
                        const beforeUri = vscode.Uri.file(path.join(tempFolder, `${fileNameWithoutExt}.before${fileExt}`));
                        await vscode.window.showTextDocument(beforeUri);
                    } else if (change.newContent !== undefined) {
                        // File was created
                        const afterUri = vscode.Uri.file(path.join(tempFolder, `${fileNameWithoutExt}.after${fileExt}`));
                        await vscode.window.showTextDocument(afterUri);
                    }
                }
                
                // Create a summary document
                const summaryContent = formatDiffSummary(diff, fromCheckpoint.label, toCheckpoint.label);
                const summaryDocument = await vscode.workspace.openTextDocument({
                    content: summaryContent,
                    language: 'markdown'
                });
                
                await vscode.window.showTextDocument(summaryDocument, vscode.ViewColumn.One);
                
                return diff;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to compare checkpoints: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.checkpoint.delete', async () => {
            try {
                const checkpoints = checkpointService.getAllCheckpoints()
                    .map(cp => ({
                        label: cp.name,
                        description: cp.description,
                        detail: `Created: ${new Date(cp.timestamp).toLocaleString()}`,
                        id: cp.id
                    }));
                
                if (checkpoints.length === 0) {
                    vscode.window.showInformationMessage('No checkpoints found.');
                    return;
                }
                
                const checkpoint = await vscode.window.showQuickPick(checkpoints, {
                    placeHolder: 'Select a checkpoint to delete'
                });
                
                if (!checkpoint) {
                    return;
                }
                
                const confirm = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete the checkpoint "${checkpoint.label}"?`,
                    { modal: true },
                    'Delete',
                    'Cancel'
                );
                
                if (confirm !== 'Delete') {
                    return;
                }
                
                const success = checkpointService.deleteCheckpoint(checkpoint.id);
                
                if (success) {
                    vscode.window.showInformationMessage(`Checkpoint deleted: ${checkpoint.label}`);
                } else {
                    vscode.window.showErrorMessage('Failed to delete checkpoint');
                }
                
                return success;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to delete checkpoint: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.checkpoint.list', async () => {
            try {
                const checkpoints = checkpointService.getAllCheckpoints();
                
                if (checkpoints.length === 0) {
                    vscode.window.showInformationMessage('No checkpoints found.');
                    return;
                }
                
                const content = formatCheckpointsList(checkpoints);
                
                const document = await vscode.workspace.openTextDocument({
                    content,
                    language: 'markdown'
                });
                
                await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
                
                return checkpoints;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to list checkpoints: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    return disposables;
}

function formatDiffSummary(diff: any, fromLabel: string, toLabel: string): string {
    let content = `# Checkpoint Comparison: ${fromLabel} → ${toLabel}\n\n`;
    
    content += `Comparison created: ${new Date().toLocaleString()}\n\n`;
    
    // Summary statistics
    let added = 0;
    let modified = 0;
    let deleted = 0;
    
    for (const change of diff.fileChanges) {
        if (change.changeType === 'create') {
            added++;
        } else if (change.changeType === 'modify') {
            modified++;
        } else if (change.changeType === 'delete') {
            deleted++;
        }
    }
    
    content += '## Summary\n\n';
    content += `- ${diff.fileChanges.length} files changed\n`;
    content += `- ${added} files added\n`;
    content += `- ${modified} files modified\n`;
    content += `- ${deleted} files deleted\n\n`;
    
    // List of changed files
    content += '## Changed Files\n\n';
    
    for (const change of diff.fileChanges) {
        let changeType = '';
        
        if (change.changeType === 'create') {
            changeType = '➕ Added';
        } else if (change.changeType === 'modify') {
            changeType = '✏️ Modified';
        } else if (change.changeType === 'delete') {
            changeType = '❌ Deleted';
        }
        
        content += `### ${changeType}: ${change.path}\n\n`;
    }
    
    return content;
}

function formatCheckpointsList(checkpoints: any[]): string {
    let content = `# Checkpoints (${checkpoints.length})\n\n`;
    
    for (const cp of checkpoints) {
        content += `## ${cp.name}\n\n`;
        
        if (cp.description) {
            content += `${cp.description}\n\n`;
        }
        
        content += `- Created: ${new Date(cp.timestamp).toLocaleString()}\n`;
        
        const metrics = getCheckpointMetricsData(cp);
        
        content += `- Files changed: ${metrics.filesChanged}\n`;
        content += `- Files created: ${metrics.filesCreated}\n`;
        content += `- Files modified: ${metrics.filesModified}\n`;
        content += `- Files deleted: ${metrics.filesDeleted}\n`;
        
        if (cp.taskId) {
            content += `- Task ID: ${cp.taskId}\n`;
            if (cp.taskStep !== undefined) {
                content += `- Task Step: ${cp.taskStep}\n`;
            }
        }
        
        content += '\n';
    }
    
    return content;
}

function getCheckpointMetricsData(checkpoint: any): any {
    let filesCreated = 0;
    let filesDeleted = 0;
    let filesModified = 0;
    
    for (const change of checkpoint.changes) {
        if (change.changeType === 'create' || (change.oldContent === undefined && change.newContent !== undefined)) {
            filesCreated++;
        } else if (change.changeType === 'delete' || (change.oldContent !== undefined && change.newContent === undefined)) {
            filesDeleted++;
        } else if (change.changeType === 'modify' || (change.oldContent !== undefined && change.newContent !== undefined)) {
            filesModified++;
        }
    }
    
    return {
        filesChanged: filesCreated + filesDeleted + filesModified,
        filesCreated,
        filesDeleted,
        filesModified
    };
} 