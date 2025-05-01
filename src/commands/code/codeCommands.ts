import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { StatusBarManager } from '../../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../../components/chat/chatPanelProvider';
import { registerCommand } from '../commandRegistry';

export function registerCodeCommands(
    context: ExtensionContext,
    chatPanelProvider: ChatPanelProvider,
    statusBarManager: StatusBarManager
): void {
    context.loggingService.debug('Registering code commands');

    // Explain selected code
    registerCommand(
        context,
        'm31-agent.explainCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor found. Please open a file and select code to explain.');
                return;
            }

            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showInformationMessage('Please select some code to explain.');
                return;
            }

            const selectedText = editor.document.getText(selection);
            const fileName = editor.document.fileName.split('/').pop() || 'Unknown';
            const fileExtension = fileName.split('.').pop() || '';
            const languageId = editor.document.languageId;

            statusBarManager.setLoadingState('Explaining code');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Explain the following ${languageId} code from ${fileName}:\n\`\`\`${languageId}\n${selectedText}\n\`\`\``
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('explain_code', {
                    language: languageId,
                    fileExtension,
                    charCount: selectedText.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to explain code');
                vscode.window.showErrorMessage(`Failed to explain code: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // Generate code based on prompt
    registerCommand(
        context,
        'm31-agent.generateCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor found. Please open a file first.');
                return;
            }

            const languageId = editor.document.languageId;
            const fileName = editor.document.fileName.split('/').pop() || 'Unknown';
            
            const prompt = await vscode.window.showInputBox({
                prompt: 'What code would you like me to generate?',
                placeHolder: 'Generate a function that...'
            });

            if (!prompt) {
                return;
            }

            statusBarManager.setLoadingState('Generating code');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Generate ${languageId} code for ${fileName} that does the following:\n${prompt}\n\nPlease provide only the code without explanations.`
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('generate_code', {
                    language: languageId,
                    promptLength: prompt.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to generate code');
                vscode.window.showErrorMessage(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // Refactor selected code
    registerCommand(
        context,
        'm31-agent.refactorCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor found. Please open a file and select code to refactor.');
                return;
            }

            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showInformationMessage('Please select some code to refactor.');
                return;
            }

            const selectedText = editor.document.getText(selection);
            const fileName = editor.document.fileName.split('/').pop() || 'Unknown';
            const languageId = editor.document.languageId;

            // Prompt for refactoring goal
            const options = [
                'Improve performance',
                'Enhance readability',
                'Add type safety',
                'Fix potential bugs',
                'Follow best practices',
                'Custom goal'
            ];
            
            const refactoringGoal = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select refactoring goal',
                title: 'Refactor Code'
            });

            if (!refactoringGoal) {
                return;
            }

            let goal = refactoringGoal;
            if (refactoringGoal === 'Custom goal') {
                const customGoal = await vscode.window.showInputBox({
                    prompt: 'Describe the refactoring goal',
                    placeHolder: 'e.g., Make this code more modular'
                });
                
                if (!customGoal) {
                    return;
                }
                
                goal = customGoal;
            }

            statusBarManager.setLoadingState('Refactoring code');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Refactor the following ${languageId} code from ${fileName} to ${goal}:\n\`\`\`${languageId}\n${selectedText}\n\`\`\`\n\nPlease explain what you changed and why.`
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('refactor_code', {
                    language: languageId,
                    goal,
                    charCount: selectedText.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to refactor code');
                vscode.window.showErrorMessage(`Failed to refactor code: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // Fix selected code issues
    registerCommand(
        context,
        'm31-agent.fixCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor found. Please open a file and select code to fix.');
                return;
            }

            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showInformationMessage('Please select some code to fix.');
                return;
            }

            const selectedText = editor.document.getText(selection);
            const fileName = editor.document.fileName.split('/').pop() || 'Unknown';
            const languageId = editor.document.languageId;

            statusBarManager.setLoadingState('Fixing code issues');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Fix issues in the following ${languageId} code from ${fileName}:\n\`\`\`${languageId}\n${selectedText}\n\`\`\`\n\nPlease explain what issues you found and how you fixed them.`
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('fix_code', {
                    language: languageId,
                    charCount: selectedText.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to fix code');
                vscode.window.showErrorMessage(`Failed to fix code: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );
} 