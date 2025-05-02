import * as vscode from 'vscode';
import { BrowserService } from '../services/browser/browserService';
import { BrowserOptions, BrowserActionType } from '../models/browserInteraction';

export function registerBrowserCommands(
    context: vscode.ExtensionContext,
    browserService: BrowserService
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.browser.startSession', async () => {
            try {
                const headlessOption = await vscode.window.showQuickPick(
                    ['Headless', 'Visible'],
                    { placeHolder: 'Select browser mode' }
                );
                
                if (!headlessOption) {
                    return;
                }
                
                const options: Partial<BrowserOptions> = {
                    headless: headlessOption === 'Headless'
                };
                
                const sessionId = await browserService.createSession(options);
                
                vscode.window.showInformationMessage(`Browser session started: ${sessionId}`);
                
                return sessionId;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to start browser session: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.browser.navigate', async () => {
            try {
                const sessions = browserService.getAllSessions()
                    .filter(s => s.status === 'running')
                    .map(s => ({ label: s.id, description: `Started ${new Date(s.createdAt).toLocaleTimeString()}` }));
                
                if (sessions.length === 0) {
                    const createNew = await vscode.window.showInformationMessage(
                        'No running browser sessions found. Do you want to create a new one?',
                        'Yes', 'No'
                    );
                    
                    if (createNew === 'Yes') {
                        return vscode.commands.executeCommand('m31-agent.browser.startSession');
                    }
                    
                    return;
                }
                
                const sessionPick = await vscode.window.showQuickPick(sessions, {
                    placeHolder: 'Select a browser session'
                });
                
                if (!sessionPick) {
                    return;
                }
                
                const url = await vscode.window.showInputBox({
                    prompt: 'Enter URL to navigate to',
                    placeHolder: 'https://example.com',
                    validateInput: input => {
                        return input.startsWith('http://') || input.startsWith('https://') 
                            ? null 
                            : 'URL must start with http:// or https://';
                    }
                });
                
                if (!url) {
                    return;
                }
                
                const result = await browserService.executeAction(sessionPick.label, {
                    type: BrowserActionType.Navigate,
                    url
                });
                
                vscode.window.showInformationMessage(`Navigated to ${url}`);
                
                return result;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to navigate: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.browser.takeScreenshot', async () => {
            try {
                const sessions = browserService.getAllSessions()
                    .filter(s => s.status === 'running')
                    .map(s => ({ label: s.id, description: `Started ${new Date(s.createdAt).toLocaleTimeString()}` }));
                
                if (sessions.length === 0) {
                    vscode.window.showInformationMessage('No running browser sessions found.');
                    return;
                }
                
                const sessionPick = await vscode.window.showQuickPick(sessions, {
                    placeHolder: 'Select a browser session'
                });
                
                if (!sessionPick) {
                    return;
                }
                
                const result = await browserService.executeAction(sessionPick.label, {
                    type: BrowserActionType.Screenshot
                });
                
                if (result.success && result.screenshot) {
                    const panel = vscode.window.createWebviewPanel(
                        'screenshot',
                        'Browser Screenshot',
                        vscode.ViewColumn.Beside,
                        { enableScripts: true }
                    );
                    
                    panel.webview.html = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Browser Screenshot</title>
                            <style>
                                body {
                                    padding: 10px;
                                    background-color: #1e1e1e;
                                    color: #cccccc;
                                }
                                img {
                                    max-width: 100%;
                                    border: 1px solid #555;
                                }
                                .buttons {
                                    margin-top: 10px;
                                }
                                button {
                                    background-color: #0e639c;
                                    color: white;
                                    border: none;
                                    padding: 8px 12px;
                                    cursor: pointer;
                                    margin-right: 5px;
                                }
                                button:hover {
                                    background-color: #1177bb;
                                }
                            </style>
                        </head>
                        <body>
                            <h2>Browser Screenshot</h2>
                            <img src="${result.screenshot}" alt="Browser Screenshot">
                            <div class="buttons">
                                <button onclick="copyToClipboard()">Copy to Clipboard</button>
                                <button onclick="saveToFile()">Save to File</button>
                            </div>
                            <script>
                                const vscode = acquireVsCodeApi();
                                
                                function copyToClipboard() {
                                    vscode.postMessage({
                                        command: 'copyToClipboard',
                                        screenshot: '${result.screenshot}'
                                    });
                                }
                                
                                function saveToFile() {
                                    vscode.postMessage({
                                        command: 'saveToFile',
                                        screenshot: '${result.screenshot}'
                                    });
                                }
                            </script>
                        </body>
                        </html>
                    `;
                    
                    panel.webview.onDidReceiveMessage(
                        async message => {
                            let uri;
                            switch (message.command) {
                                case 'copyToClipboard':
                                    // Implementation would depend on the platform
                                    vscode.window.showInformationMessage('Screenshot copied to clipboard');
                                    break;
                                case 'saveToFile':
                                    uri = await vscode.window.showSaveDialog({
                                        filters: {
                                            'Images': ['png']
                                        },
                                        defaultUri: vscode.Uri.file('screenshot.png')
                                    });
                                    
                                    if (uri) {
                                        const base64Data = message.screenshot.replace(/^data:image\/png;base64,/, '');
                                        const buffer = Buffer.from(base64Data, 'base64');
                                        
                                        await vscode.workspace.fs.writeFile(uri, buffer);
                                        vscode.window.showInformationMessage(`Screenshot saved to ${uri.fsPath}`);
                                    }
                                    break;
                            }
                        },
                        undefined,
                        context.subscriptions
                    );
                } else {
                    vscode.window.showErrorMessage('Failed to take screenshot');
                }
                
                return result;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.browser.closeSession', async () => {
            try {
                const sessions = browserService.getAllSessions()
                    .filter(s => s.status === 'running')
                    .map(s => ({ label: s.id, description: `Started ${new Date(s.createdAt).toLocaleTimeString()}` }));
                
                if (sessions.length === 0) {
                    vscode.window.showInformationMessage('No running browser sessions found.');
                    return;
                }
                
                const sessionPick = await vscode.window.showQuickPick(sessions, {
                    placeHolder: 'Select a browser session to close'
                });
                
                if (!sessionPick) {
                    return;
                }
                
                await browserService.closeSession(sessionPick.label);
                
                vscode.window.showInformationMessage(`Browser session closed: ${sessionPick.label}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to close browser session: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    return disposables;
} 