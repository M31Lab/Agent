import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { StatusBarManager } from '../../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../../components/chat/chatPanelProvider';
import { registerCommand } from '../commandRegistry';

export function registerTerminalCommands(
    context: ExtensionContext,
    chatPanelProvider: ChatPanelProvider,
    statusBarManager: StatusBarManager
): void {
    context.loggingService.debug('Registering terminal commands');

    // Run command with AI assistance
    registerCommand(
        context,
        'm31-agent.runCommand',
        async () => {
            const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('M31 Agent Terminal');
            terminal.show();

            const commandPrompt = await vscode.window.showInputBox({
                prompt: 'What terminal command would you like to run?',
                placeHolder: 'Describe the command you need...'
            });

            if (!commandPrompt) {
                return;
            }

            statusBarManager.setLoadingState('Processing command request');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `I need to run a terminal command that does the following: ${commandPrompt}\n\nPlease suggest the exact command I should use. Just provide the command without explanation.`
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('terminal_command_request', {
                    promptLength: commandPrompt.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to process command request');
                vscode.window.showErrorMessage(`Failed to process command request: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // Execute a terminal command directly (requires user confirmation)
    registerCommand(
        context,
        'm31-agent.executeCommand',
        async (commandToExecute?: string) => {
            if (!commandToExecute) {
                commandToExecute = await vscode.window.showInputBox({
                    prompt: 'Enter the terminal command to execute',
                    placeHolder: 'command'
                });
            }

            if (!commandToExecute) {
                return;
            }

            // Require user confirmation for safety
            if (context.configurationService.isRequireConfirmation()) {
                const confirmation = await vscode.window.showWarningMessage(
                    `Are you sure you want to execute the following command?\n\n${commandToExecute}`,
                    { modal: true },
                    'Execute'
                );
                
                if (confirmation !== 'Execute') {
                    return;
                }
            }

            const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('M31 Agent Terminal');
            terminal.show();
            
            statusBarManager.setLoadingState(`Executing: ${commandToExecute}`);
            
            try {
                terminal.sendText(commandToExecute);
                statusBarManager.setDefaultState();
                
                context.telemetryService.trackEvent('terminal_command_executed', {
                    commandLength: commandToExecute.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to execute command');
                vscode.window.showErrorMessage(`Failed to execute command: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // Create a new terminal
    registerCommand(
        context,
        'm31-agent.createTerminal',
        async () => {
            const terminalName = await vscode.window.showInputBox({
                prompt: 'Enter a name for the new terminal',
                placeHolder: 'Terminal Name',
                value: 'M31 Agent Terminal'
            });

            if (!terminalName) {
                return;
            }

            try {
                const terminal = vscode.window.createTerminal(terminalName);
                terminal.show();
                
                context.telemetryService.trackEvent('terminal_created', {
                    name: terminalName
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create terminal: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // Explain terminal output
    registerCommand(
        context,
        'm31-agent.explainTerminalOutput',
        async () => {
            const outputText = await vscode.window.showInputBox({
                prompt: 'Paste the terminal output you want explained',
                placeHolder: 'Terminal output...',
                multiline: true
            });

            if (!outputText) {
                return;
            }

            statusBarManager.setLoadingState('Explaining terminal output');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Explain the following terminal output:\n\`\`\`\n${outputText}\n\`\`\``
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('terminal_output_explain', {
                    outputLength: outputText.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to explain terminal output');
                vscode.window.showErrorMessage(`Failed to explain terminal output: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );
} 