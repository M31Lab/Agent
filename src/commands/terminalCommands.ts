import * as vscode from 'vscode';
import { TerminalService } from '../services/terminal/terminalService';
import { TerminalOptions, TerminalCommand, TerminalSession } from '../models/terminalExecution';

export function registerTerminalCommands(
    context: vscode.ExtensionContext,
    terminalService: TerminalService
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.terminal.createSession', async () => {
            try {
                const defaultShell = vscode.env.shell;
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                
                const options: TerminalOptions = {
                    shellPath: defaultShell,
                    cwd: workspaceFolder
                };
                
                const sessionId = terminalService.createSession(options);
                
                vscode.window.showInformationMessage(`Terminal session created: ${sessionId}`);
                
                return sessionId;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create terminal session: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.terminal.executeCommand', async () => {
            try {
                const sessions = terminalService.getAllSessions()
                    .map(s => ({
                        label: s.id,
                        description: s.status === 'running' 
                            ? `Running: ${s.currentCommand?.command}` 
                            : 'Idle',
                        detail: `Created at ${new Date(s.createdAt).toLocaleTimeString()}`
                    }));
                
                if (sessions.length === 0) {
                    const createNew = await vscode.window.showInformationMessage(
                        'No terminal sessions found. Do you want to create a new one?',
                        'Yes', 'No'
                    );
                    
                    if (createNew === 'Yes') {
                        return vscode.commands.executeCommand('m31-agent.terminal.createSession');
                    }
                    
                    return;
                }
                
                const sessionPick = await vscode.window.showQuickPick(sessions, {
                    placeHolder: 'Select a terminal session'
                });
                
                if (!sessionPick) {
                    return;
                }
                
                const command = await vscode.window.showInputBox({
                    prompt: 'Enter terminal command to execute',
                    placeHolder: 'ls -la'
                });
                
                if (!command) {
                    return;
                }
                
                const isBackground = await vscode.window.showQuickPick(
                    ['Foreground (wait for completion)', 'Background (continue while running)'],
                    { placeHolder: 'Select command execution mode' }
                );
                
                if (!isBackground) {
                    return;
                }
                
                const requireConfirmation = await vscode.window.showQuickPick(
                    ['Yes', 'No'],
                    { placeHolder: 'Require confirmation before executing?' }
                );
                
                if (!requireConfirmation) {
                    return;
                }
                
                const result = await terminalService.executeCommand(sessionPick.label, command, {
                    isBackground: isBackground === 'Background (continue while running)',
                    requireConfirmation: requireConfirmation === 'Yes',
                    description: 'Command executed via VS Code command'
                });
                
                if (result.exitCode === 0) {
                    vscode.window.showInformationMessage(`Command executed successfully: ${command}`);
                } else if (result.exitCode !== null) {
                    vscode.window.showWarningMessage(`Command failed with exit code ${result.exitCode}: ${command}`);
                } else {
                    vscode.window.showInformationMessage(`Command running in background: ${command}`);
                }
                
                return result;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to execute command: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.terminal.cancelCommand', async () => {
            try {
                const sessions = terminalService.getAllSessions()
                    .filter(s => s.status === 'running' && s.currentCommand)
                    .map(s => ({
                        label: s.id,
                        description: `Running: ${s.currentCommand?.command}`,
                        detail: `Started at ${new Date(s.currentCommand!.createdAt).toLocaleTimeString()}`
                    }));
                
                if (sessions.length === 0) {
                    vscode.window.showInformationMessage('No running commands found.');
                    return;
                }
                
                const sessionPick = await vscode.window.showQuickPick(sessions, {
                    placeHolder: 'Select a command to cancel'
                });
                
                if (!sessionPick) {
                    return;
                }
                
                const success = terminalService.cancelCommand(sessionPick.label);
                
                if (success) {
                    vscode.window.showInformationMessage('Command cancelled');
                } else {
                    vscode.window.showErrorMessage('Failed to cancel command');
                }
                
                return success;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to cancel command: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.terminal.closeSession', async () => {
            try {
                const sessions = terminalService.getAllSessions()
                    .map(s => ({
                        label: s.id,
                        description: s.status === 'running' 
                            ? `Running: ${s.currentCommand?.command}` 
                            : 'Idle',
                        detail: `Created at ${new Date(s.createdAt).toLocaleTimeString()}`
                    }));
                
                if (sessions.length === 0) {
                    vscode.window.showInformationMessage('No terminal sessions found.');
                    return;
                }
                
                const sessionPick = await vscode.window.showQuickPick(sessions, {
                    placeHolder: 'Select a terminal session to close'
                });
                
                if (!sessionPick) {
                    return;
                }
                
                const success = terminalService.closeSession(sessionPick.label);
                
                if (success) {
                    vscode.window.showInformationMessage(`Terminal session closed: ${sessionPick.label}`);
                } else {
                    vscode.window.showErrorMessage('Failed to close terminal session');
                }
                
                return success;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to close terminal session: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.terminal.viewOutput', async () => {
            try {
                const sessions = terminalService.getAllSessions()
                    .map(s => ({
                        label: s.id,
                        description: s.status === 'running' 
                            ? `Running: ${s.currentCommand?.command}` 
                            : 'Idle',
                        detail: `Created at ${new Date(s.createdAt).toLocaleTimeString()}`
                    }));
                
                if (sessions.length === 0) {
                    vscode.window.showInformationMessage('No terminal sessions found.');
                    return;
                }
                
                const sessionPick = await vscode.window.showQuickPick(sessions, {
                    placeHolder: 'Select a terminal session to view output'
                });
                
                if (!sessionPick) {
                    return;
                }
                
                const session = terminalService.getSession(sessionPick.label);
                
                if (!session) {
                    vscode.window.showErrorMessage('Session not found');
                    return;
                }
                
                // Create a new document with terminal output
                const document = await vscode.workspace.openTextDocument({
                    content: formatTerminalOutput(session),
                    language: 'plaintext'
                });
                
                await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to view terminal output: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    return disposables;
}

// Helper function to format terminal output for display
function formatTerminalOutput(session: TerminalSession): string {
    let output = `# Terminal Session: ${session.id}\n\n`;
    output += `Status: ${session.status}\n`;
    output += `Created: ${new Date(session.createdAt).toLocaleString()}\n`;
    output += `Last Activity: ${new Date(session.lastActivity).toLocaleString()}\n\n`;
    
    output += '## Command History\n\n';
    
    if (session.history.length === 0) {
        output += 'No commands executed yet.\n\n';
    } else {
        session.history.forEach((cmd: TerminalCommand, index: number) => {
            output += `### ${index + 1}. \`${cmd.command}\`\n\n`;
            output += `- Executed at: ${new Date(cmd.createdAt).toLocaleString()}\n`;
            output += `- Background: ${cmd.isBackground ? 'Yes' : 'No'}\n`;
            
            // We don't have direct access to terminalService here, so we'll use the command outputs
            // stored in the session instead
            const commandOutputs = session.outputs.filter(output => output.commandId === cmd.id);
            const stdout = commandOutputs
                .filter(output => output.type === 'stdout')
                .map(output => output.text)
                .join('\n');
            
            const stderr = commandOutputs
                .filter(output => output.type === 'stderr' || output.type === 'error')
                .map(output => output.text)
                .join('\n');
            
            // Check if command is still running
            const isRunning = session.currentCommand?.id === cmd.id;
            
            output += `- Status: ${isRunning ? 'Still running' : 'Completed'}\n`;
            
            if (stdout) {
                output += `\n**Output:**\n\`\`\`\n${stdout}\n\`\`\`\n\n`;
            }
            
            if (stderr) {
                output += `\n**Error Output:**\n\`\`\`\n${stderr}\n\`\`\`\n\n`;
            }
            
            output += '\n';
        });
    }
    
    return output;
} 