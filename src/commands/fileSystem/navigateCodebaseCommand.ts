import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { FileSystemService } from '../../services/fileSystem/fileSystemService';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { AIRequestType } from '../../models/ai/aiRequestType';

export function RegisterNavigateCodebaseCommand(
    context: ExtensionContext,
    dependencies: CommandDependencies
): void {
    const command = vscode.commands.registerCommand('m31-agent.navigateCodebase', async () => {
        try {
            // Get file system service
            const fileSystemService = FileSystemService.getInstance();
            if (!fileSystemService) {
                throw new Error('File system service is not initialized');
            }
            
            // Show status bar as busy
            dependencies.statusBarManager.showBusy('Preparing navigation options');
            
            // Check if we have a workspace open
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open');
                dependencies.statusBarManager.showReady();
                return;
            }
            
            // Ask user what they want to do
            const options = [
                'Find files by name pattern',
                'Find files by content (text search)',
                'Navigate to recently opened files',
                'Show project structure',
                'AI-powered file search'
            ];
            
            const selectedOption = await vscode.window.showQuickPick(options, {
                placeHolder: 'How would you like to navigate the codebase?'
            });
            
            if (!selectedOption) {
                dependencies.statusBarManager.showReady();
                return;
            }
            
            switch (selectedOption) {
                case 'Find files by name pattern':
                    await findFilesByPattern(context);
                    break;
                    
                case 'Find files by content (text search)':
                    await findFilesByContent(context);
                    break;
                    
                case 'Navigate to recently opened files':
                    await navigateRecentFiles();
                    break;
                    
                case 'Show project structure':
                    await showProjectStructure(context, fileSystemService);
                    break;
                    
                case 'AI-powered file search':
                    await aiPoweredFileSearch(context, dependencies);
                    break;
            }
            
            dependencies.statusBarManager.showReady();
            
            // Track command usage
            context.telemetryService.trackEvent('navigate_codebase_used', {
                option: selectedOption
            });
        } catch (error) {
            context.loggingService.error('Failed to navigate codebase', error);
            vscode.window.showErrorMessage(`Failed to navigate codebase: ${error instanceof Error ? error.message : String(error)}`);
            dependencies.statusBarManager.showError('Failed');
        }
    });
    
    context.registerDisposable(command);
}

async function findFilesByPattern(context: ExtensionContext): Promise<void> {
    try {
        // Get pattern from user
        const pattern = await vscode.window.showInputBox({
            prompt: 'Enter a file name pattern (e.g., *.ts, src/*.js)',
            placeHolder: '*.{ts,js,json}',
            value: '*.*'
        });
        
        if (!pattern) {
            return;
        }
        
        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Finding files matching "${pattern}"`,
            cancellable: true
        }, async (progress, token) => {
            // Find files
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1000);
            
            if (files.length === 0) {
                vscode.window.showInformationMessage(`No files found matching "${pattern}"`);
                return;
            }
            
            // Create items for quick pick
            const items = files.map(file => ({
                label: path.basename(file.fsPath),
                description: vscode.workspace.asRelativePath(file),
                uri: file
            }));
            
            // Show quick pick
            const selectedItem = await vscode.window.showQuickPick(items, {
                placeHolder: `Found ${files.length} files matching "${pattern}"`,
                matchOnDescription: true
            });
            
            if (selectedItem) {
                const document = await vscode.workspace.openTextDocument(selectedItem.uri);
                await vscode.window.showTextDocument(document);
            }
        });
    } catch (error) {
        context.loggingService.error('Error finding files by pattern', error);
        vscode.window.showErrorMessage(`Error finding files: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function findFilesByContent(context: ExtensionContext): Promise<void> {
    try {
        // Get search text from user
        const searchText = await vscode.window.showInputBox({
            prompt: 'Enter text to search for in files',
            placeHolder: 'function example'
        });
        
        if (!searchText) {
            return;
        }
        
        // Execute the built-in search command
        await vscode.commands.executeCommand('workbench.action.findInFiles', {
            query: searchText,
            triggerSearch: true,
            matchWholeWord: false,
            isCaseSensitive: false
        });
    } catch (error) {
        context.loggingService.error('Error searching files by content', error);
        vscode.window.showErrorMessage(`Error searching files: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function navigateRecentFiles(): Promise<void> {
    // Execute the built-in recently opened files command
    await vscode.commands.executeCommand('workbench.action.openRecent');
}

async function showProjectStructure(context: ExtensionContext, fileSystemService: FileSystemService): Promise<void> {
    try {
        // Use the explorer view in VS Code
        await vscode.commands.executeCommand('workbench.view.explorer');
        
        // Optionally, show a tree view of the project structure
        const rootPath = fileSystemService.getWorkspaceRootPath();
        if (!rootPath) {
            vscode.window.showErrorMessage('No workspace root path found');
            return;
        }
        
        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing project structure',
            cancellable: true
        }, async (progress, token) => {
            // Get project structure
            const structure = await fileSystemService.getFileStructure(rootPath, 2);
            
            // Create a temporary markdown file with the structure
            const content = generateStructureMarkdown(structure);
            
            // Create a new untitled document
            const document = await vscode.workspace.openTextDocument({
                language: 'markdown',
                content: content
            });
            
            // Show the document
            await vscode.window.showTextDocument(document);
        });
    } catch (error) {
        context.loggingService.error('Error showing project structure', error);
        vscode.window.showErrorMessage(`Error showing project structure: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function generateStructureMarkdown(structure: { [key: string]: any }, level: number = 0): string {
    let result = level === 0 ? '# Project Structure\n\n' : '';
    
    for (const [name, info] of Object.entries(structure)) {
        const indent = '  '.repeat(level);
        const isDirectory = info.type === 'directory';
        
        result += `${indent}- ${isDirectory ? '📂' : '📄'} ${name}\n`;
        
        if (isDirectory && info.children) {
            result += generateStructureMarkdown(info.children, level + 1);
        }
    }
    
    return result;
}

async function aiPoweredFileSearch(context: ExtensionContext, dependencies: CommandDependencies): Promise<void> {
    try {
        // Get the API client
        const apiClient = OpenRouterApiClient.getInstance();
        
        // Get search description from user
        const description = await vscode.window.showInputBox({
            prompt: 'Describe what kind of file you are looking for',
            placeHolder: 'E.g., "authentication service", "user interface components", "database models"'
        });
        
        if (!description) {
            return;
        }
        
        // Show busy status
        dependencies.statusBarManager.showBusy('Analyzing codebase');
        
        // Get workspace info
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        
        // Get list of all files in the workspace (up to a limit)
        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 1000);
        
        // Convert to relative paths
        const relativePaths = files.map(file => 
            vscode.workspace.asRelativePath(file)
        );
        
        // Filter out very large files and binary files
        const fileList = relativePaths.filter(file => {
            const ext = path.extname(file).toLowerCase();
            // Filter out binary files and very large files
            return !['.exe', '.dll', '.obj', '.bin', '.jpg', '.png', '.gif'].includes(ext);
        });
        
        // Create the prompt for the AI
        const prompt = `I'm working on a codebase with the following files (showing up to 1000 files):
${fileList.join('\n')}

Given the file structure above, which files would be most relevant for "${description}"?
Return a JSON array with the top 5-10 most relevant files, with each entry having a "path" and a "reason" explaining why it's relevant.
Only include files that are clearly related to the query.`;
        
        // Call the API
        const response = await apiClient.sendRequest({
            requestType: AIRequestType.Search,
            messages: [
                {
                    role: 'system',
                    content: `You are a code search assistant that helps developers find relevant files in a codebase.
When given a file structure and a search query, analyze the paths and names to identify the most relevant files.
Only return a JSON array in the format [{"path": "path/to/file", "reason": "Reason this file is relevant"}].
Do not include any other text in your response, only valid JSON.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });
        
        // Parse the response
        try {
            let relevantFiles: {path: string, reason: string}[] = [];
            
            // Try to extract JSON if it's wrapped in a code block
            const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            const jsonContent = jsonMatch ? jsonMatch[1] : response.content;
            
            relevantFiles = JSON.parse(jsonContent);
            
            if (!Array.isArray(relevantFiles)) {
                throw new Error('Invalid response format');
            }
            
            // Show results to user for selection
            const items = relevantFiles.map(file => ({
                label: path.basename(file.path),
                description: file.path,
                detail: file.reason
            }));
            
            const selectedItem = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a file to open',
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selectedItem) {
                // Find the file URI
                const fileUri = files.find(f => 
                    vscode.workspace.asRelativePath(f) === selectedItem.description
                );
                
                if (fileUri) {
                    const document = await vscode.workspace.openTextDocument(fileUri);
                    await vscode.window.showTextDocument(document);
                } else {
                    vscode.window.showErrorMessage(`File not found: ${selectedItem.description}`);
                }
            }
        } catch (error) {
            context.loggingService.error('Error parsing AI response', error);
            vscode.window.showErrorMessage(`Error processing AI response. Please try again.`);
        }
    } catch (error) {
        context.loggingService.error('Error in AI-powered file search', error);
        vscode.window.showErrorMessage(`Error in AI search: ${error instanceof Error ? error.message : String(error)}`);
    }
} 