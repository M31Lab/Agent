import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { LanguageSupportService } from '../../services/languageSupport/languageSupportService';
import { IOpenRouterCompletionRequest, IOpenRouterMessage } from '../../api/interfaces/requests/completionRequest';
import { AIRequestType } from '../../models/ai/aiRequestType';
import { FileSystemService } from '../../services/fileSystem/fileSystemService';

export function RegisterGenerateCodeCommand(
    context: ExtensionContext,
    dependencies: CommandDependencies
): void {
    const command = vscode.commands.registerCommand('m31-agent.generateCode', async () => {
        try {
            // Get service instances
            const apiClient = OpenRouterApiClient.getInstance();
            const languageService = LanguageSupportService.getInstance();
            const fileSystemService = FileSystemService.getInstance();
            
            if (!languageService || !fileSystemService) {
                throw new Error('Required services are not initialized');
            }
            
            // Get currently active editor to determine language
            const editor = vscode.window.activeTextEditor;
            let languageId = editor?.document.languageId || '';
            let languageName = '';
            
            if (editor) {
                const langDef = languageService.getLanguageDefinitionForDocument(editor.document);
                languageName = langDef?.name || editor.document.languageId;
            }
            
            // Get prompt from user
            const promptResult = await vscode.window.showInputBox({
                prompt: 'Describe what code you want to generate',
                placeHolder: 'E.g., A function that sorts an array using quicksort algorithm',
                ignoreFocusOut: true
            });
            
            if (!promptResult) {
                return;
            }
            
            const prompt = promptResult;
            
            // If no language is detected from editor, ask user for language preference
            if (!languageId) {
                const supportedLanguages = languageService.getSupportedLanguages();
                const languageItems = supportedLanguages.map(lang => ({
                    label: lang.name,
                    description: lang.extensions.join(', '),
                    language: lang
                }));
                
                const selectedLanguage = await vscode.window.showQuickPick(languageItems, {
                    placeHolder: 'Select a language for the generated code',
                    ignoreFocusOut: true
                });
                
                if (!selectedLanguage) {
                    return;
                }
                
                languageId = selectedLanguage.language.id;
                languageName = selectedLanguage.language.name;
            }
            
            // Ask user where to put the generated code
            const outputOptions = ['Insert at cursor position', 'Create new file'];
            
            const outputOption = await vscode.window.showQuickPick(outputOptions, {
                placeHolder: 'What would you like to do with the generated code?',
                ignoreFocusOut: true
            });
            
            if (!outputOption) {
                return;
            }
            
            // Show status bar as busy
            dependencies.statusBarManager.showBusy('Generating code');
            
            // Create system message with additional context about language and preferences
            const systemMessage: IOpenRouterMessage = {
                role: 'system',
                content: `You are a coding assistant tasked with generating high-quality ${languageName} code.
Generate clean, efficient, and well-structured code based on the user's requirements.
Include explanatory comments only where necessary for complex logic.
Do not include any explanations outside of the code block.
Ensure the code follows best practices for ${languageName}.
Only respond with valid, runnable code in a single code block.`
            };
            
            // Create user message with the prompt
            const userMessage: IOpenRouterMessage = {
                role: 'user',
                content: `Generate ${languageName} code for: ${prompt}`
            };
            
            // Create request
            const request: IOpenRouterCompletionRequest = {
                model: context.configurationService.getModelId(),
                messages: [
                    systemMessage,
                    userMessage
                ],
                temperature: context.configurationService.getTemperature(),
                max_tokens: context.configurationService.getMaxTokens()
            };
            
            // Send request
            const response = await apiClient.createCompletion(request);
            
            if (!response.choices || response.choices.length === 0) {
                throw new Error('No response received from the AI service');
            }
            
            // Extract the generated code from the response
            const generatedContent = response.choices[0].message.content;
            
            // Extract code blocks from the markdown response
            const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
            let match;
            let generatedCode = '';
            
            if ((match = codeBlockRegex.exec(generatedContent)) !== null) {
                generatedCode = match[1];
            } else {
                // If no code block found, use the entire content
                generatedCode = generatedContent;
            }
            
            // Process output based on user selection
            if (outputOption === 'Insert at cursor position') {
                if (!editor) {
                    vscode.window.showErrorMessage('No active editor to insert code');
                    return;
                }
                
                // Insert the code at current cursor position
                await editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, generatedCode);
                });
                
                vscode.window.showInformationMessage('Code inserted at cursor position');
            } else if (outputOption === 'Create new file') {
                // Ask for filename
                const fileExtension = languageService.getFileExtensionForLanguage(languageId) || '.txt';
                const defaultFilename = `generated${fileExtension}`;
                
                const filenameResult = await vscode.window.showInputBox({
                    prompt: 'Enter filename for the generated code',
                    value: defaultFilename,
                    ignoreFocusOut: true
                });
                
                if (!filenameResult) {
                    return;
                }
                
                const filename = filenameResult;
                
                // Create the file in the workspace
                let filePath: string;
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    filePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, filename);
                } else {
                    // If no workspace is open, ask the user where to save the file
                    const fileUri = await vscode.window.showSaveDialog({
                        defaultUri: vscode.Uri.file(filename),
                        filters: {
                            'All Files': ['*']
                        }
                    });
                    
                    if (!fileUri) {
                        return;
                    }
                    
                    filePath = fileUri.fsPath;
                }
                
                // Write to file
                await fileSystemService.writeFile(filePath, generatedCode);
                
                // Open the file
                const document = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(document);
                
                vscode.window.showInformationMessage(`Created new file: ${filename}`);
            }
            
            // Track successful code generation
            context.telemetryService.trackEvent('code_generated', {
                languageId: languageId,
                promptLength: prompt.length.toString(),
                codeLength: generatedCode.length.toString(),
                outputOption
            });
            
            // Show success
            dependencies.statusBarManager.showReady();
        } catch (error) {
            context.loggingService.error('Failed to generate code', error);
            vscode.window.showErrorMessage(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
            dependencies.statusBarManager.showError('Failed');
        }
    });
    
    context.registerDisposable(command);
} 