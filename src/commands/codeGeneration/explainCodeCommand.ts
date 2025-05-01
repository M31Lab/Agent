import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { LanguageSupportService } from '../../services/languageSupport/languageSupportService';
import { IOpenRouterCompletionRequest, IOpenRouterMessage } from '../../api/interfaces/requests/completionRequest';

export function RegisterExplainCodeCommand(
    context: ExtensionContext,
    dependencies: CommandDependencies
): void {
    const command = vscode.commands.registerCommand('m31-agent.explainCode', async () => {
        try {
            // Get current editor
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor found');
                return;
            }
            
            // Get selected text
            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showInformationMessage('Please select code to explain');
                return;
            }
            
            // Show status bar as busy
            dependencies.statusBarManager.showBusy('Analyzing code');
            
            // Get selected code
            const selectedCode = editor.document.getText(selection);
            
            // Get language info
            const languageService = LanguageSupportService.getInstance();
            const language = languageService.getLanguageDefinitionForDocument(editor.document);
            const languageName = language?.name || editor.document.languageId;
            
            // Open chat panel
            dependencies.chatPanelProvider.createOrShowPanel();
            
            // Create system message with additional context
            const systemMessage: IOpenRouterMessage = {
                role: 'system',
                content: `You are a coding assistant tasked with explaining code. 
The user will provide code in ${languageName}. 
Analyze it and provide a clear, concise explanation covering:
1. What the code does at a high level
2. Key functions, classes, or components and their purpose
3. Important algorithms or patterns used
4. Any potential issues, edge cases, or improvements
Be thorough but concise in your explanation.`
            };
            
            // Create user message with code
            const userMessage: IOpenRouterMessage = {
                role: 'user',
                content: `Please explain this ${languageName} code:\n\`\`\`${languageName}\n${selectedCode}\n\`\`\``
            };
            
            // Create request
            const apiClient = OpenRouterApiClient.getInstance();
            
            const request: IOpenRouterCompletionRequest = {
                model: context.configurationService.getModelId(),
                messages: [
                    systemMessage,
                    userMessage
                ],
                temperature: context.configurationService.getTemperature(),
                max_tokens: context.configurationService.getMaxTokens()
            };
            
            // Add user code to chat
            vscode.commands.executeCommand('m31-agent.showChatPanel');
            
            // Send request as streaming to provide better user experience
            let explanation = '';
            
            await new Promise<void>((resolve, reject) => {
                apiClient.createStreamingCompletion(
                    request,
                    (data) => {
                        const content = data.choices[0]?.delta?.content || '';
                        if (content) {
                            explanation += content;
                            // Use the chat panel to show streaming response
                            // This will be handled by the chat panel's message handler
                        }
                    },
                    (error) => {
                        reject(error);
                    },
                    () => {
                        resolve();
                    }
                );
            });
            
            // Track successful code explanation
            context.telemetryService.trackEvent('code_explained', {
                languageId: editor.document.languageId,
                codeLength: selectedCode.length.toString(),
                explanationLength: explanation.length.toString()
            });
            
            // Show success
            dependencies.statusBarManager.showReady();
        } catch (error) {
            context.loggingService.error('Failed to explain code', error);
            vscode.window.showErrorMessage(`Failed to explain code: ${error instanceof Error ? error.message : String(error)}`);
            dependencies.statusBarManager.showError('Failed');
        }
    });
    
    context.registerDisposable(command);
} 