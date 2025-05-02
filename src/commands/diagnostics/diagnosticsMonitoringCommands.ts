import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { DiagnosticsMonitoringService, FileWithDiagnostics } from '../../services/diagnostics/diagnosticsMonitoringService';

export function registerDiagnosticsMonitoringCommands(
    context: ExtensionContext
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    // Get or initialize the DiagnosticsMonitoringService
    const diagnosticsService = DiagnosticsMonitoringService.getInstance(context);
    
    // Register command to show all diagnostics
    disposables.push(
        vscode.commands.registerCommand('m31-agent.diagnostics.showAll', async () => {
            try {
                const allDiagnostics = diagnosticsService.getAllDiagnostics();
                
                if (allDiagnostics.length === 0) {
                    vscode.window.showInformationMessage('No diagnostics found in the workspace.');
                    return;
                }
                
                const errorCount = diagnosticsService.getErrorCount();
                
                // Display diagnostics in a WebView
                const panel = vscode.window.createWebviewPanel(
                    'diagnosticsView',
                    'Workspace Diagnostics',
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );
                
                panel.webview.html = generateDiagnosticsHtml(allDiagnostics, errorCount);
                
                // Handle messages from the WebView
                panel.webview.onDidReceiveMessage(
                    async message => {
                        if (message.command === 'openFile') {
                            const filePath = message.filePath;
                            const line = message.line;
                            const character = message.character;
                            
                            const document = await vscode.workspace.openTextDocument(filePath);
                            const editor = await vscode.window.showTextDocument(document);
                            
                            // Position cursor at the diagnostic location
                            const position = new vscode.Position(line, character);
                            editor.selection = new vscode.Selection(position, position);
                            
                            // Scroll to the position
                            editor.revealRange(
                                new vscode.Range(position, position),
                                vscode.TextEditorRevealType.InCenter
                            );
                        }
                    }
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Error showing diagnostics: ${errorMessage}`);
            }
        })
    );
    
    // Register command to show errors only
    disposables.push(
        vscode.commands.registerCommand('m31-agent.diagnostics.showErrors', async () => {
            try {
                const errorDiagnostics = diagnosticsService.getDiagnosticsBySeverity(
                    vscode.DiagnosticSeverity.Error
                );
                
                if (errorDiagnostics.length === 0) {
                    vscode.window.showInformationMessage('No errors found in the workspace.');
                    return;
                }
                
                const errorCount = diagnosticsService.getErrorCount();
                
                // Display diagnostics in a WebView
                const panel = vscode.window.createWebviewPanel(
                    'errorDiagnosticsView',
                    'Workspace Errors',
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );
                
                panel.webview.html = generateDiagnosticsHtml(errorDiagnostics, errorCount, true);
                
                // Handle messages from the WebView
                panel.webview.onDidReceiveMessage(
                    async message => {
                        if (message.command === 'openFile') {
                            const filePath = message.filePath;
                            const line = message.line;
                            const character = message.character;
                            
                            const document = await vscode.workspace.openTextDocument(filePath);
                            const editor = await vscode.window.showTextDocument(document);
                            
                            // Position cursor at the diagnostic location
                            const position = new vscode.Position(line, character);
                            editor.selection = new vscode.Selection(position, position);
                            
                            // Scroll to the position
                            editor.revealRange(
                                new vscode.Range(position, position),
                                vscode.TextEditorRevealType.InCenter
                            );
                        }
                    }
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Error showing error diagnostics: ${errorMessage}`);
            }
        })
    );
    
    // Register command to monitor current file
    disposables.push(
        vscode.commands.registerCommand('m31-agent.diagnostics.monitorCurrentFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                
                if (!editor) {
                    vscode.window.showWarningMessage('No active editor to monitor diagnostics.');
                    return;
                }
                
                const filePath = editor.document.uri.fsPath;
                const fileName = filePath.split(/[/\\]/).pop() || filePath;
                
                // Monitor the file for diagnostics
                const disposable = diagnosticsService.monitorFile(filePath);
                
                // Add a status bar item to show the current file is being monitored
                const statusBarItem = vscode.window.createStatusBarItem(
                    vscode.StatusBarAlignment.Right,
                    100
                );
                
                statusBarItem.text = `$(eye) Monitoring: ${fileName}`;
                statusBarItem.tooltip = `Monitoring diagnostics for ${filePath}`;
                statusBarItem.command = 'm31-agent.diagnostics.showCurrentFileDiagnostics';
                statusBarItem.show();
                
                // Register a command to show diagnostics for the current file
                const showCommand = vscode.commands.registerCommand(
                    'm31-agent.diagnostics.showCurrentFileDiagnostics',
                    () => {
                        const currentDiagnostics = diagnosticsService.getDiagnosticsForFile(filePath);
                        
                        if (currentDiagnostics.length === 0) {
                            vscode.window.showInformationMessage(`No diagnostics found for ${fileName}.`);
                            return;
                        }
                        
                        // Show diagnostics in a quick pick
                        const items = currentDiagnostics.map(d => ({
                            label: getSeverityIcon(d.severity) + ' ' + d.message,
                            description: `Line ${d.range.start.line + 1}, Col ${d.range.start.character + 1}`,
                            detail: d.source,
                            diagnostic: d
                        }));
                        
                        vscode.window.showQuickPick(items, {
                            placeHolder: `Diagnostics for ${fileName}`,
                            matchOnDescription: true,
                            matchOnDetail: true
                        }).then(item => {
                            if (item) {
                                // Navigate to the diagnostic
                                const position = new vscode.Position(
                                    item.diagnostic.range.start.line,
                                    item.diagnostic.range.start.character
                                );
                                
                                editor.selection = new vscode.Selection(position, position);
                                editor.revealRange(
                                    new vscode.Range(position, position),
                                    vscode.TextEditorRevealType.InCenter
                                );
                            }
                        });
                    }
                );
                
                // Add disposables to context
                context.subscriptions.push(disposable, statusBarItem, showCommand);
                
                vscode.window.showInformationMessage(`Monitoring diagnostics for ${fileName}.`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Error monitoring file: ${errorMessage}`);
            }
        })
    );
    
    // Register command to update diagnostics options
    disposables.push(
        vscode.commands.registerCommand('m31-agent.diagnostics.updateOptions', async () => {
            try {
                const options = [
                    {
                        label: 'Include Information Level Diagnostics',
                        picked: false,
                        description: 'Show information level diagnostics in addition to errors and warnings'
                    },
                    {
                        label: 'Include Hint Level Diagnostics',
                        picked: false,
                        description: 'Show hint level diagnostics in addition to errors and warnings'
                    },
                    {
                        label: 'Track Diagnostic History',
                        picked: true,
                        description: 'Keep track of diagnostic history for files'
                    }
                ];
                
                const selectedOptions = await vscode.window.showQuickPick(options, {
                    canPickMany: true,
                    placeHolder: 'Select diagnostic monitoring options'
                });
                
                if (!selectedOptions) {
                    return;
                }
                
                // Update options based on selection
                diagnosticsService.updateOptions({
                    includeInformation: selectedOptions.some(o => 
                        o.label === 'Include Information Level Diagnostics'
                    ),
                    includeHints: selectedOptions.some(o => 
                        o.label === 'Include Hint Level Diagnostics'
                    ),
                    trackHistory: selectedOptions.some(o => 
                        o.label === 'Track Diagnostic History'
                    )
                });
                
                vscode.window.showInformationMessage('Diagnostic monitoring options updated.');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Error updating options: ${errorMessage}`);
            }
        })
    );
    
    return disposables;
}

function getSeverityIcon(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
        case vscode.DiagnosticSeverity.Error:
            return '$(error)';
        case vscode.DiagnosticSeverity.Warning:
            return '$(warning)';
        case vscode.DiagnosticSeverity.Information:
            return '$(info)';
        case vscode.DiagnosticSeverity.Hint:
            return '$(lightbulb)';
        default:
            return '$(question)';
    }
}

function getSeverityClass(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
        case vscode.DiagnosticSeverity.Error:
            return 'error';
        case vscode.DiagnosticSeverity.Warning:
            return 'warning';
        case vscode.DiagnosticSeverity.Information:
            return 'info';
        case vscode.DiagnosticSeverity.Hint:
            return 'hint';
        default:
            return '';
    }
}

function generateDiagnosticsHtml(
    diagnosticsData: FileWithDiagnostics[],
    errorCount: { errors: number; warnings: number; information: number; hints: number },
    errorsOnly: boolean = false
): string {
    const title = errorsOnly ? 'Workspace Errors' : 'Workspace Diagnostics';
    
    // Function to escape HTML
    const escapeHtml = (text: string): string => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
            .stats {
                display: flex;
                margin-bottom: 20px;
            }
            .stat-item {
                margin-right: 20px;
                padding: 8px 12px;
                border-radius: 4px;
            }
            .error {
                color: var(--vscode-editorError-foreground);
            }
            .warning {
                color: var(--vscode-editorWarning-foreground);
            }
            .info {
                color: var(--vscode-editorInfo-foreground);
            }
            .hint {
                color: var(--vscode-editorHint-foreground);
            }
            .file-item {
                margin-bottom: 10px;
            }
            .file-header {
                background-color: var(--vscode-editor-lineHighlightBackground);
                padding: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .file-header:hover {
                background-color: var(--vscode-list-hoverBackground);
            }
            .file-diagnostics {
                margin-left: 20px;
            }
            .diagnostic-item {
                padding: 6px 8px;
                border-left: 3px solid transparent;
                cursor: pointer;
                margin: 4px 0;
            }
            .diagnostic-item:hover {
                background-color: var(--vscode-list-hoverBackground);
            }
            .diagnostic-item.error {
                border-left-color: var(--vscode-editorError-foreground);
            }
            .diagnostic-item.warning {
                border-left-color: var(--vscode-editorWarning-foreground);
            }
            .diagnostic-item.info {
                border-left-color: var(--vscode-editorInfo-foreground);
            }
            .diagnostic-item.hint {
                border-left-color: var(--vscode-editorHint-foreground);
            }
            .message {
                margin-bottom: 3px;
            }
            .location {
                font-size: 0.9em;
                color: var(--vscode-descriptionForeground);
            }
            .source {
                font-size: 0.8em;
                color: var(--vscode-descriptionForeground);
                margin-top: 2px;
            }
            .collapsible {
                display: none;
            }
            .expanded .collapsible {
                display: block;
            }
        </style>
    </head>
    <body>
        <h1>${title}</h1>
        
        <div class="stats">
            <div class="stat-item error">Errors: ${errorCount.errors}</div>
            <div class="stat-item warning">Warnings: ${errorCount.warnings}</div>
            ${!errorsOnly ? `
            <div class="stat-item info">Information: ${errorCount.information}</div>
            <div class="stat-item hint">Hints: ${errorCount.hints}</div>
            ` : ''}
        </div>
        
        <div id="files-container">
            ${diagnosticsData.map(fileData => `
                <div class="file-item">
                    <div class="file-header" onclick="toggleFile(this)">
                        <div class="file-path">${fileData.filePath}</div>
                        <div class="file-count">${fileData.diagnostics.length} issues</div>
                    </div>
                    <div class="file-diagnostics collapsible">
                        ${fileData.diagnostics.map(diagnostic => `
                            <div class="diagnostic-item ${getSeverityClass(diagnostic.severity)}" 
                                onclick="openFile('${fileData.filePath}', ${diagnostic.range.start.line}, ${diagnostic.range.start.character})">
                                <div class="message">${escapeHtml(diagnostic.message)}</div>
                                <div class="location">Line ${diagnostic.range.start.line + 1}, Column ${diagnostic.range.start.character + 1}</div>
                                <div class="source">${diagnostic.source}${diagnostic.code ? ' (' + diagnostic.code + ')' : ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            
            function toggleFile(element) {
                const fileItem = element.parentElement;
                const diagnosticsContainer = fileItem.querySelector('.file-diagnostics');
                
                if (diagnosticsContainer.style.display === 'block') {
                    diagnosticsContainer.style.display = 'none';
                    fileItem.classList.remove('expanded');
                } else {
                    diagnosticsContainer.style.display = 'block';
                    fileItem.classList.add('expanded');
                }
            }
            
            function openFile(filePath, line, character) {
                vscode.postMessage({
                    command: 'openFile',
                    filePath: filePath,
                    line: line,
                    character: character
                });
            }
            
            function escapeHtml(text) {
                return text.replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }
            
            // Expand the first file by default
            const firstFile = document.querySelector('.file-item');
            if (firstFile) {
                firstFile.classList.add('expanded');
                firstFile.querySelector('.file-diagnostics').style.display = 'block';
            }
        </script>
    </body>
    </html>
    `;
} 