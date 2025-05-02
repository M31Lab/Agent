import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CodeShareService } from '../../services/code/codeShareService';

export class ShareCodeCommand {
    private codeShareService: CodeShareService;
    
    constructor(private context: ExtensionContext) {
        this.codeShareService = CodeShareService.getInstance(context);
    }
    
    public register(): vscode.Disposable {
        return vscode.commands.registerCommand('m31-agent.code.shareCode', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No active editor found.');
                    return;
                }
                
                // Get selection or entire file content
                let code: string;
                const selection = editor.selection;
                
                if (selection.isEmpty) {
                    // No selection, ask if user wants to share the entire file
                    const response = await vscode.window.showInformationMessage(
                        'No text is selected. Do you want to share the entire file?',
                        'Yes', 'No'
                    );
                    
                    if (response !== 'Yes') {
                        return;
                    }
                    
                    code = editor.document.getText();
                } else {
                    code = editor.document.getText(selection);
                }
                
                if (!code || code.trim().length === 0) {
                    vscode.window.showWarningMessage('No code to share.');
                    return;
                }
                
                // Get the language ID for syntax highlighting
                const languageId = editor.document.languageId;
                
                // Optionally ask for a title
                const title = await vscode.window.showInputBox({
                    prompt: 'Enter a title for your code share (optional)',
                    placeHolder: 'My Awesome Code'
                });
                
                // Show progress indicator
                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Sharing code...',
                        cancellable: false
                    },
                    async () => {
                        // Share code and get link
                        const shareUrl = await this.codeShareService.shareCode(code, languageId, title || undefined);
                        
                        // Show the link
                        const openAction = 'Open in Browser';
                        const copyAction = 'Copy to Clipboard';
                        
                        const action = await vscode.window.showInformationMessage(
                            `Code shared successfully! ${shareUrl}`,
                            openAction,
                            copyAction
                        );
                        
                        if (action === openAction) {
                            // Open in browser
                            vscode.env.openExternal(vscode.Uri.parse(shareUrl));
                        } else if (action === copyAction) {
                            // Copy to clipboard
                            await vscode.env.clipboard.writeText(shareUrl);
                            vscode.window.showInformationMessage('Share link copied to clipboard.');
                        }
                    }
                );
            } catch (error) {
                this.context.loggingService.error('Failed to share code', error);
                vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
} 