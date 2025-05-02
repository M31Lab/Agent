import * as vscode from 'vscode';
import { ContextToolsService } from '../services/contextTools/contextToolsService';
import { ContextToolType } from '../models/contextTools';

export function registerContextToolsCommands(
    context: vscode.ExtensionContext,
    contextToolsService: ContextToolsService
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.contextTools.url', async () => {
            try {
                const url = await vscode.window.showInputBox({
                    prompt: 'Enter URL to fetch content from',
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
                
                const maxTokensStr = await vscode.window.showInputBox({
                    prompt: 'Enter max tokens to include (optional)',
                    placeHolder: 'Leave empty for unlimited'
                });
                
                let maxTokens: number | undefined = undefined;
                if (maxTokensStr && !isNaN(parseInt(maxTokensStr))) {
                    maxTokens = parseInt(maxTokensStr);
                }
                
                const includeImages = await vscode.window.showQuickPick(
                    ['Yes', 'No'],
                    { placeHolder: 'Include images in the content?' }
                );
                
                const result = await contextToolsService.executeUrlTool({
                    url,
                    maxTokens,
                    includeImages: includeImages === 'Yes'
                });
                
                const document = await vscode.workspace.openTextDocument({
                    content: result.content,
                    language: 'markdown'
                });
                
                await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
                
                return result;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.contextTools.problems', async () => {
            try {
                const severity = await vscode.window.showQuickPick(
                    ['All', 'Error', 'Warning', 'Info'],
                    { placeHolder: 'Select severity level' }
                );
                
                if (!severity) {
                    return;
                }
                
                const maxProblemsStr = await vscode.window.showInputBox({
                    prompt: 'Maximum number of problems to include (optional)',
                    placeHolder: 'Leave empty for unlimited'
                });
                
                let maxProblems: number | undefined = undefined;
                if (maxProblemsStr && !isNaN(parseInt(maxProblemsStr))) {
                    maxProblems = parseInt(maxProblemsStr);
                }
                
                const result = await contextToolsService.executeProblemsTools({
                    severity: severity === 'All' ? 'all' : severity.toLowerCase() as 'error' | 'warning' | 'info',
                    maxProblems
                });
                
                const document = await vscode.workspace.openTextDocument({
                    content: result.content,
                    language: 'markdown'
                });
                
                await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
                
                return result;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to fetch problems: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.contextTools.file', async () => {
            try {
                const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
                
                if (files.length === 0) {
                    vscode.window.showInformationMessage('No files found in workspace.');
                    return;
                }
                
                const fileItems = files.map(file => {
                    const relativePath = vscode.workspace.asRelativePath(file);
                    return {
                        label: relativePath,
                        description: vscode.workspace.asRelativePath(file.fsPath),
                        file
                    };
                });
                
                const filePick = await vscode.window.showQuickPick(fileItems, {
                    placeHolder: 'Select a file to add to context'
                });
                
                if (!filePick) {
                    return;
                }
                
                const useSelection = await vscode.window.showQuickPick(
                    ['Entire file', 'Specific lines'],
                    { placeHolder: 'What part of the file to include?' }
                );
                
                if (!useSelection) {
                    return;
                }
                
                let selection: { startLine: number, endLine: number } | undefined = undefined;
                
                if (useSelection === 'Specific lines') {
                    const lineRangeStr = await vscode.window.showInputBox({
                        prompt: 'Enter line range (e.g., 10-20)',
                        placeHolder: 'startLine-endLine',
                        validateInput: input => {
                            const rangeRegex = /^(\d+)-(\d+)$/;
                            if (!rangeRegex.test(input)) {
                                return 'Please enter a valid line range (e.g., 10-20)';
                            }
                            return null;
                        }
                    });
                    
                    if (!lineRangeStr) {
                        return;
                    }
                    
                    const match = lineRangeStr.match(/^(\d+)-(\d+)$/);
                    if (match) {
                        selection = {
                            startLine: parseInt(match[1]),
                            endLine: parseInt(match[2])
                        };
                    }
                }
                
                const result = await contextToolsService.executeFileTool({
                    filePath: filePick.file.fsPath,
                    selection
                });
                
                const document = await vscode.workspace.openTextDocument({
                    content: result.content,
                    language: getLanguageFromPath(filePick.label)
                });
                
                await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
                
                return result;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to get file content: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.contextTools.folder', async () => {
            try {
                const folders = await vscode.workspace.findFiles('**/*/');
                
                // Add workspace folders
                const workspaceFolders = vscode.workspace.workspaceFolders || [];
                const folderItems = [
                    ...workspaceFolders.map(folder => ({
                        label: folder.name,
                        description: 'Workspace root',
                        uri: folder.uri
                    })),
                    ...folders.map(uri => ({
                        label: vscode.workspace.asRelativePath(uri),
                        description: '',
                        uri
                    }))
                ];
                
                const folderPick = await vscode.window.showQuickPick(folderItems, {
                    placeHolder: 'Select a folder to add to context'
                });
                
                if (!folderPick) {
                    return;
                }
                
                const includePatterns = await vscode.window.showInputBox({
                    prompt: 'Enter include patterns (comma separated)',
                    placeHolder: '**/*.ts,**/*.tsx',
                    value: '**/*'
                });
                
                if (!includePatterns) {
                    return;
                }
                
                const excludePatterns = await vscode.window.showInputBox({
                    prompt: 'Enter exclude patterns (comma separated)',
                    placeHolder: '**/node_modules/**,**/.git/**',
                    value: '**/node_modules/**,**/.git/**'
                });
                
                const maxFilesStr = await vscode.window.showInputBox({
                    prompt: 'Maximum number of files to include',
                    placeHolder: '10',
                    value: '10'
                });
                
                let maxFiles = 10;
                if (maxFilesStr && !isNaN(parseInt(maxFilesStr))) {
                    maxFiles = parseInt(maxFilesStr);
                }
                
                const maxDepthStr = await vscode.window.showInputBox({
                    prompt: 'Maximum folder depth',
                    placeHolder: '3',
                    value: '3'
                });
                
                let maxDepth = 3;
                if (maxDepthStr && !isNaN(parseInt(maxDepthStr))) {
                    maxDepth = parseInt(maxDepthStr);
                }
                
                const result = await contextToolsService.executeFolderTool({
                    folderPath: folderPick.uri.fsPath,
                    includePatterns: includePatterns.split(',').map(p => p.trim()),
                    excludePatterns: excludePatterns ? excludePatterns.split(',').map(p => p.trim()) : undefined,
                    maxFiles,
                    maxDepth
                });
                
                const document = await vscode.workspace.openTextDocument({
                    content: result.content,
                    language: 'markdown'
                });
                
                await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
                
                return result;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to get folder content: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.contextTools.list', async () => {
            try {
                const tools = contextToolsService.getAllTools();
                
                const toolItems = tools.map(tool => ({
                    label: tool.name,
                    description: tool.description,
                    detail: `Command: ${tool.command}`,
                    tool
                }));
                
                const toolPick = await vscode.window.showQuickPick(toolItems, {
                    placeHolder: 'Select a context tool to use'
                });
                
                if (!toolPick) {
                    return;
                }
                
                const tool = toolPick.tool;
                
                switch (tool.type) {
                    case ContextToolType.Url:
                        await vscode.commands.executeCommand('m31-agent.contextTools.url');
                        break;
                    case ContextToolType.Problems:
                        await vscode.commands.executeCommand('m31-agent.contextTools.problems');
                        break;
                    case ContextToolType.File:
                        await vscode.commands.executeCommand('m31-agent.contextTools.file');
                        break;
                    case ContextToolType.Folder:
                        await vscode.commands.executeCommand('m31-agent.contextTools.folder');
                        break;
                    default:
                        vscode.window.showInformationMessage(`Unknown tool type: ${tool.type}`);
                        break;
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to list context tools: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    return disposables;
}

function getLanguageFromPath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    if (!extension) {
        return 'plaintext';
    }
    
    switch (extension) {
        case 'js':
            return 'javascript';
        case 'ts':
            return 'typescript';
        case 'jsx':
            return 'javascriptreact';
        case 'tsx':
            return 'typescriptreact';
        case 'html':
            return 'html';
        case 'css':
            return 'css';
        case 'json':
            return 'json';
        case 'py':
            return 'python';
        case 'java':
            return 'java';
        case 'c':
            return 'c';
        case 'cpp':
            return 'cpp';
        case 'cs':
            return 'csharp';
        case 'go':
            return 'go';
        case 'rb':
            return 'ruby';
        case 'php':
            return 'php';
        case 'rs':
            return 'rust';
        case 'swift':
            return 'swift';
        case 'sh':
            return 'shellscript';
        case 'md':
            return 'markdown';
        case 'yml':
        case 'yaml':
            return 'yaml';
        case 'xml':
            return 'xml';
        case 'sql':
            return 'sql';
        default:
            return 'plaintext';
    }
} 