import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { StatusBarManager } from '../../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../../components/chat/chatPanelProvider';
import { registerCommand } from '../commandRegistry';

export function registerChatCommands(
    context: ExtensionContext,
    chatPanelProvider: ChatPanelProvider,
    statusBarManager: StatusBarManager
): void {
    context.loggingService.debug('Registering chat commands');

    // Show main chat panel
    registerCommand(
        context,
        'm31-agent.showChat',
        () => {
            chatPanelProvider.show();
        }
    );

    // Quick chat with input box or selection
    registerCommand(
        context,
        'm31-agent.quickChat',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                chatPanelProvider.show();
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (selectedText) {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Help me with the following code:\n\`\`\`\n${selectedText}\n\`\`\``
                );
            } else {
                const userPrompt = await vscode.window.showInputBox({
                    prompt: 'What can I help you with?',
                    placeHolder: 'Ask a question or request code help...'
                });

                if (userPrompt) {
                    await chatPanelProvider.show();
                    await chatPanelProvider.sendMessage(userPrompt);
                }
            }
        }
    );

    // Create a new chat session
    registerCommand(
        context,
        'm31-agent.newChat',
        async () => {
            await chatPanelProvider.createNewSession();
            chatPanelProvider.show();
        }
    );

    // Clear current chat
    registerCommand(
        context,
        'm31-agent.clearChat',
        async () => {
            const confirmed = await vscode.window.showWarningMessage(
                'Are you sure you want to clear the current chat?',
                { modal: true },
                'Yes'
            );

            if (confirmed === 'Yes') {
                await chatPanelProvider.clearCurrentSession();
            }
        }
    );

    // Export chat history
    registerCommand(
        context,
        'm31-agent.exportChat',
        async () => {
            statusBarManager.setLoadingState('Exporting chat history');
            
            try {
                await chatPanelProvider.exportCurrentSession();
                statusBarManager.setDefaultState();
                vscode.window.showInformationMessage('Chat history exported successfully');
            } catch (error) {
                statusBarManager.setErrorState('Failed to export chat history');
                vscode.window.showErrorMessage(`Failed to export chat history: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );
} 