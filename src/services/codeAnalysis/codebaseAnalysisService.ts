import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LanguageSupportService } from '../languageSupport/languageSupportService';

export interface CodeAnalysisResult {
    files: { 
        path: string;
        language: string;
        size: number;
        lineCount: number;
    }[];
    languages: Map<string, number>;
    totalSize: number;
    totalLines: number;
    rootFolders: string[];
}

export interface SearchOptions {
    includePattern?: string;
    excludePattern?: string;
    maxResults?: number;
    caseSensitive?: boolean;
}

export interface FileContext {
    content: string;
    languageId: string;
    relativePath: string;
    fullPath: string;
    lineCount: number;
    size: number;
}

export interface CodeSnippet {
    content: string;
    languageId: string;
    filePath: string;
    startLine: number;
    endLine: number;
    context?: string;
}

export class CodebaseAnalysisService implements vscode.Disposable {
    private context: ExtensionContext;
    private subscriptions: vscode.Disposable[] = [];
    private languageSupport: LanguageSupportService;
    private codeAnalysisCache: Map<string, CodeAnalysisResult> = new Map();
    private lastAnalysisTimestamp: number = 0;
    private static readonly CACHE_EXPIRY_MS = 300000; // 5 minutes

    constructor(context: ExtensionContext) {
        this.context = context;
        this.languageSupport = new LanguageSupportService(context);
    }

    public async initialize(): Promise<void> {
        this.context.loggingService.info('Initializing codebase analysis service');
        
        // Initialize language support
        await this.languageSupport.initialize();
        
        // Set up file system watcher to invalidate cache
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        
        fileWatcher.onDidCreate(() => this.invalidateCache());
        fileWatcher.onDidChange(() => this.invalidateCache());
        fileWatcher.onDidDelete(() => this.invalidateCache());
        
        this.subscriptions.push(fileWatcher);
        this.subscriptions.push(this.languageSupport);
        
        this.context.loggingService.info('Codebase analysis service initialized');
    }

    public async analyzeWorkspace(): Promise<CodeAnalysisResult> {
        const currentTimestamp = Date.now();
        const workspaceId = this.getWorkspaceId();
        
        // Use cached results if available and recent
        if (
            this.codeAnalysisCache.has(workspaceId) && 
            currentTimestamp - this.lastAnalysisTimestamp < CodebaseAnalysisService.CACHE_EXPIRY_MS
        ) {
            return this.codeAnalysisCache.get(workspaceId)!;
        }
        
        this.context.loggingService.info('Analyzing workspace codebase');
        
        try {
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                throw new Error('No workspace folder open');
            }
            
            const files: { 
                path: string;
                language: string;
                size: number;
                lineCount: number;
            }[] = [];
            
            const languages = new Map<string, number>();
            let totalSize = 0;
            let totalLines = 0;
            
            // Get all files in the workspace
            const rootFolders = vscode.workspace.workspaceFolders.map(folder => folder.uri.fsPath);
            
            for (const rootFolder of rootFolders) {
                const filesInFolder = await this.findAllFiles(rootFolder);
                
                for (const filePath of filesInFolder) {
                    try {
                        const uri = vscode.Uri.file(filePath);
                        const stat = await vscode.workspace.fs.stat(uri);
                        
                        // Skip directories
                        if (stat.type === vscode.FileType.Directory) {
                            continue;
                        }
                        
                        // Determine language by file extension
                        const ext = path.extname(filePath);
                        const language = this.languageSupport.getLanguageForFileExtension(ext) || 'unknown';
                        
                        // Get file line count
                        const content = await this.readFile(filePath);
                        const lineCount = content.split('\n').length;
                        
                        // Add file info
                        files.push({
                            path: filePath,
                            language,
                            size: stat.size,
                            lineCount
                        });
                        
                        // Update language stats
                        languages.set(
                            language, 
                            (languages.get(language) || 0) + 1
                        );
                        
                        // Update totals
                        totalSize += stat.size;
                        totalLines += lineCount;
                    } catch (error) {
                        this.context.loggingService.error(`Error analyzing file: ${filePath}`, error);
                    }
                }
            }
            
            const result: CodeAnalysisResult = {
                files,
                languages,
                totalSize,
                totalLines,
                rootFolders
            };
            
            // Update cache
            this.codeAnalysisCache.set(workspaceId, result);
            this.lastAnalysisTimestamp = currentTimestamp;
            
            this.context.loggingService.info(`Workspace analysis complete: ${files.length} files, ${totalLines} lines`);
            
            return result;
        } catch (error) {
            this.context.loggingService.error('Failed to analyze workspace', error);
            throw error;
        }
    }

    public async searchCodebase(
        searchTerm: string, 
        options: SearchOptions = {}
    ): Promise<vscode.Location[]> {
        try {
            const defaultOptions: SearchOptions = {
                maxResults: 100,
                caseSensitive: false
            };
            
            const searchOptions = { ...defaultOptions, ...options };
            
            // Use VS Code's built-in search API
            const results = await vscode.workspace.findTextInFiles(
                {
                    pattern: searchTerm,
                    caseSensitive: searchOptions.caseSensitive,
                    includes: searchOptions.includePattern,
                    excludes: searchOptions.excludePattern
                },
                {
                    maxResults: searchOptions.maxResults
                }
            );
            
            const locations: vscode.Location[] = [];
            
            // Convert results to Locations
            results.forEach(result => {
                result.ranges.forEach(range => {
                    locations.push(new vscode.Location(result.uri, range));
                });
            });
            
            this.context.loggingService.info(`Codebase search for "${searchTerm}" found ${locations.length} results`);
            
            return locations;
        } catch (error) {
            this.context.loggingService.error(`Failed to search codebase for: ${searchTerm}`, error);
            throw error;
        }
    }

    public async getFileContext(filePath: string): Promise<FileContext> {
        try {
            const uri = vscode.Uri.file(filePath);
            const stat = await vscode.workspace.fs.stat(uri);
            const content = await this.readFile(filePath);
            const lineCount = content.split('\n').length;
            
            // Get relative path
            let relativePath = filePath;
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                for (const folder of vscode.workspace.workspaceFolders) {
                    const folderPath = folder.uri.fsPath;
                    if (filePath.startsWith(folderPath)) {
                        relativePath = path.relative(folderPath, filePath);
                        break;
                    }
                }
            }
            
            // Determine language
            const ext = path.extname(filePath);
            const languageId = this.languageSupport.getLanguageForFileExtension(ext) || 'unknown';
            
            return {
                content,
                languageId,
                relativePath,
                fullPath: filePath,
                lineCount,
                size: stat.size
            };
        } catch (error) {
            this.context.loggingService.error(`Failed to get file context: ${filePath}`, error);
            throw error;
        }
    }

    public async getCodeSnippet(
        filePath: string, 
        startLine: number, 
        endLine: number
    ): Promise<CodeSnippet> {
        try {
            const fileContext = await this.getFileContext(filePath);
            const lines = fileContext.content.split('\n');
            
            // Adjust line numbers to be within bounds
            startLine = Math.max(0, Math.min(startLine, lines.length - 1));
            endLine = Math.max(startLine, Math.min(endLine, lines.length - 1));
            
            const snippetLines = lines.slice(startLine, endLine + 1);
            const content = snippetLines.join('\n');
            
            // Get surrounding context (3 lines before and after)
            const contextStartLine = Math.max(0, startLine - 3);
            const contextEndLine = Math.min(lines.length - 1, endLine + 3);
            
            let context: string | undefined;
            if (contextStartLine < startLine || contextEndLine > endLine) {
                const contextLines = lines.slice(contextStartLine, contextEndLine + 1);
                context = contextLines.join('\n');
            }
            
            return {
                content,
                languageId: fileContext.languageId,
                filePath,
                startLine,
                endLine,
                context
            };
        } catch (error) {
            this.context.loggingService.error(
                `Failed to get code snippet: ${filePath} (${startLine}-${endLine})`, 
                error
            );
            throw error;
        }
    }

    public async getActiveDocumentContext(): Promise<FileContext | undefined> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return undefined;
        }
        
        const document = editor.document;
        const filePath = document.uri.fsPath;
        
        try {
            return await this.getFileContext(filePath);
        } catch (error) {
            this.context.loggingService.error('Failed to get active document context', error);
            throw error;
        }
    }

    public async getSelectedCodeContext(): Promise<CodeSnippet | undefined> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            return undefined;
        }
        
        const document = editor.document;
        const filePath = document.uri.fsPath;
        const selection = editor.selection;
        
        const startLine = selection.start.line;
        const endLine = selection.end.line;
        
        try {
            return await this.getCodeSnippet(filePath, startLine, endLine);
        } catch (error) {
            this.context.loggingService.error('Failed to get selected code context', error);
            throw error;
        }
    }

    private async findAllFiles(rootFolder: string): Promise<string[]> {
        try {
            const result: string[] = [];
            await this.traverseDirectory(rootFolder, result);
            return result;
        } catch (error) {
            this.context.loggingService.error(`Failed to find all files in: ${rootFolder}`, error);
            throw error;
        }
    }

    private async traverseDirectory(dirPath: string, results: string[]): Promise<void> {
        try {
            const uri = vscode.Uri.file(dirPath);
            const entries = await vscode.workspace.fs.readDirectory(uri);
            
            for (const [name, type] of entries) {
                const fullPath = path.join(dirPath, name);
                
                if (type === vscode.FileType.Directory) {
                    // Skip node_modules and .git folders
                    if (name === 'node_modules' || name === '.git') {
                        continue;
                    }
                    
                    await this.traverseDirectory(fullPath, results);
                } else if (type === vscode.FileType.File) {
                    results.push(fullPath);
                }
            }
        } catch (error) {
            this.context.loggingService.error(`Failed to traverse directory: ${dirPath}`, error);
            throw error;
        }
    }

    private async readFile(filePath: string): Promise<string> {
        try {
            const uri = vscode.Uri.file(filePath);
            const data = await vscode.workspace.fs.readFile(uri);
            return new TextDecoder().decode(data);
        } catch (error) {
            this.context.loggingService.error(`Failed to read file: ${filePath}`, error);
            throw error;
        }
    }

    private getWorkspaceId(): string {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return 'no-workspace';
        }
        
        return vscode.workspace.workspaceFolders
            .map(folder => folder.uri.toString())
            .sort()
            .join('|');
    }

    private invalidateCache(): void {
        this.codeAnalysisCache.clear();
        this.lastAnalysisTimestamp = 0;
    }

    public dispose(): void {
        this.subscriptions.forEach(s => s.dispose());
        this.subscriptions = [];
    }
} 