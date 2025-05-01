import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';
import { ICodeAnalysisService } from './interfaces/codeAnalysisServiceInterface';
import { AIRequestType } from '../../models/ai/aiRequestType';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { CodeContext } from '../../models/codebase/codeContext';
import { FileSystemService } from '../fileSystem/fileSystemService';
import { LanguageSupportService } from '../languageSupport/languageSupportService';

export interface CodeSummary {
    linesOfCode: number;
    functions: number;
    classes: number;
    imports: number;
    comments: number;
}

export interface DependencyInfo {
    name: string;
    usageCount: number;
    importLocations: string[];
}

export interface SearchResult {
    uri: vscode.Uri;
    relativePath: string;
    score: number;
    excerpt?: string;
}

export class CodeAnalysisService implements ICodeAnalysisService, vscode.Disposable {
    private static instance: CodeAnalysisService | undefined;
    private context: ExtensionContext;
    private disposables: vscode.Disposable[] = [];
    private fileSystemService: FileSystemService | undefined;
    private languageService: LanguageSupportService | undefined;

    constructor(context: ExtensionContext) {
        this.context = context;
        CodeAnalysisService.instance = this;
        
        // Get required services
        this.fileSystemService = FileSystemService.getInstance();
        this.languageService = LanguageSupportService.getInstance();
    }

    public static getInstance(): CodeAnalysisService | undefined {
        return CodeAnalysisService.instance;
    }

    public async analyzeCurrentDocument(): Promise<CodeContext> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active editor found');
        }

        const document = editor.document;
        const fileContent = document.getText();
        const fileName = path.basename(document.fileName);
        const filePath = document.fileName;
        const languageId = document.languageId;
        const selection = editor.selection;
        const hasSelection = !selection.isEmpty;
        
        let selectedText = '';
        let selectionStartLine = -1;
        let selectionEndLine = -1;
        
        if (hasSelection) {
            selectedText = document.getText(selection);
            selectionStartLine = selection.start.line;
            selectionEndLine = selection.end.line;
        }
        
        const lineCount = document.lineCount;
        const cursorPosition = editor.selection.active;
        
        return {
            fileName,
            filePath,
            languageId,
            fileContent,
            hasSelection,
            selectedText,
            selectionStartLine,
            selectionEndLine,
            lineCount,
            cursorLine: cursorPosition.line,
            cursorCharacter: cursorPosition.character
        };
    }

    public async analyzeWorkspace(): Promise<string[]> {
        const fileSystemService = FileSystemService.getInstance();
        if (!fileSystemService) {
            throw new Error('File system service not initialized');
        }
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return [];
        }
        
        const rootPath = workspaceFolders[0].uri.fsPath;
        
        // Get common directories in a typical project
        const commonDirs = ['src', 'lib', 'app', 'components', 'services', 'utils', 'tests', 'modules'];
        const projectStructure: string[] = [];
        
        for (const dir of commonDirs) {
            const dirPath = path.join(rootPath, dir);
            if (await fileSystemService.exists(dirPath) && await fileSystemService.isDirectory(dirPath)) {
                projectStructure.push(dir);
            }
        }
        
        return projectStructure;
    }

    public async getFileContext(uri: vscode.Uri): Promise<CodeContext> {
        const fileSystemService = FileSystemService.getInstance();
        if (!fileSystemService) {
            throw new Error('File system service not initialized');
        }
        
        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        const fileContent = await fileSystemService.readFile(filePath);
        
        // Try to determine language from file extension
        const fileExtension = path.extname(fileName).toLowerCase().slice(1);
        let languageId = this.getLanguageIdFromExtension(fileExtension);
        
        // If we couldn't determine from extension, try to open the document
        if (!languageId) {
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                languageId = document.languageId;
            } catch (error) {
                this.context.loggingService.warning(`Could not determine language for ${fileName}`);
                languageId = fileExtension;
            }
        }
        
        // Calculate line count
        const lineCount = fileContent.split('\n').length;
        
        return {
            fileName,
            filePath,
            languageId,
            fileContent,
            hasSelection: false,
            selectedText: '',
            selectionStartLine: -1,
            selectionEndLine: -1,
            lineCount,
            cursorLine: -1,
            cursorCharacter: -1
        };
    }

    public async findDefinition(symbol: string): Promise<vscode.Location | undefined> {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                return undefined;
            }
            
            // Search for the symbol in the current document
            const document = activeEditor.document;
            const text = document.getText();
            
            // First try using VS Code's built-in functionality
            const position = this.findSymbolInText(text, symbol);
            if (!position) {
                return undefined;
            }
            
            const vsCodePosition = new vscode.Position(position.line, position.character);
            
            const definitions = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeDefinitionProvider',
                document.uri,
                vsCodePosition
            );
            
            if (definitions && definitions.length > 0) {
                return definitions[0];
            }
            
            return undefined;
        } catch (error) {
            this.context.loggingService.error(`Failed to find definition for ${symbol}`, error);
            return undefined;
        }
    }

    public async getSimilarCode(codeSnippet: string, maxResults: number = 5): Promise<string[]> {
        try {
            const apiClient = OpenRouterApiClient.getInstance();
            if (!apiClient) {
                throw new Error('API client not initialized');
            }
            
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return [];
            }
            
            // Get the current language
            const editor = vscode.window.activeTextEditor;
            const languageId = editor?.document.languageId || '';
            
            const systemPrompt = `You are a code analysis assistant. Given a code snippet, find semantically similar code patterns in a codebase. 
Do not explain the similarities, just list the code snippets that are similar. 
Focus on structural and functional similarities, not superficial ones.`;
            
            const userPrompt = `I have the following code snippet in ${languageId}:
            
\`\`\`${languageId}
${codeSnippet}
\`\`\`

Based on the structure and functionality of this code, list exactly ${maxResults} similar patterns or implementations that I should look for in my codebase.
Be specific about what to search for (e.g., function names, class patterns, or specific code constructs).
Format each search suggestion as a line starting with a dash.
Don't explain the similarities, just list them.`;
            
            const response = await apiClient.sendRequest({
                requestType: AIRequestType.Chat,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            });
            
            const suggestions = response.content
                .split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.trim().substring(1).trim())
                .filter(line => line.length > 0)
                .slice(0, maxResults);
            
            return suggestions;
        } catch (error) {
            this.context.loggingService.error('Failed to get similar code', error);
            return [];
        }
    }

    public async analyzeFile(filePath: string): Promise<CodeSummary | undefined> {
        try {
            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
            return this.analyzeDocument(document);
        } catch (error) {
            this.context.loggingService.error(`Failed to analyze file: ${filePath}`, error);
            return undefined;
        }
    }
    
    public analyzeDocument(document: vscode.TextDocument): CodeSummary {
        const text = document.getText();
        const lines = text.split('\n');
        
        const languageService = LanguageSupportService.getInstance();
        const languageDef = languageService.getLanguageDefinitionForDocument(document);
        
        if (!languageDef) {
            return this.getBasicSummary(lines);
        }
        
        const lineCommentToken = languageDef.lineCommentToken;
        const blockCommentStart = languageDef.blockCommentStart;
        const blockCommentEnd = languageDef.blockCommentEnd;
        
        let linesOfCode = 0;
        let functionCount = 0;
        let classCount = 0;
        let importCount = 0;
        let commentCount = 0;
        
        let inBlockComment = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (line === '') {
                continue;
            }
            
            // Check for block comment start/end
            if (blockCommentStart && blockCommentEnd) {
                const blockStartIndex = line.indexOf(blockCommentStart);
                const blockEndIndex = line.indexOf(blockCommentEnd);
                
                if (blockStartIndex >= 0 && !inBlockComment) {
                    inBlockComment = true;
                    commentCount++;
                    
                    // If the block comment ends on the same line
                    if (blockEndIndex > blockStartIndex) {
                        inBlockComment = false;
                    }
                    continue;
                }
                
                if (inBlockComment) {
                    commentCount++;
                    
                    if (blockEndIndex >= 0) {
                        inBlockComment = false;
                    }
                    continue;
                }
            }
            
            // Skip lines that are just comments
            if (lineCommentToken && line.startsWith(lineCommentToken)) {
                commentCount++;
                continue;
            }
            
            // Count actual code lines
            linesOfCode++;
            
            // Count functions - basic detection, would need more sophisticated parsing for accuracy
            if (line.includes('function ') || line.match(/\w+\s*\([^)]*\)\s*{/)) {
                functionCount++;
            }
            
            // Count classes - basic detection
            if (line.includes('class ') || line.includes('interface ')) {
                classCount++;
            }
            
            // Count imports - basic detection
            if (line.includes('import ') || line.includes('require(') || line.includes('#include')) {
                importCount++;
            }
        }
        
        return {
            linesOfCode,
            functions: functionCount,
            classes: classCount,
            imports: importCount,
            comments: commentCount
        };
    }
    
    private getBasicSummary(lines: string[]): CodeSummary {
        let linesOfCode = 0;
        let commentCount = 0;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === '') {
                continue;
            }
            
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || 
                trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
                commentCount++;
            } else {
                linesOfCode++;
            }
        }
        
        return {
            linesOfCode,
            functions: 0,
            classes: 0,
            imports: 0,
            comments: commentCount
        };
    }
    
    public async findDependencies(directoryPath: string, includeNodeModules = false): Promise<DependencyInfo[]> {
        try {
            const fileSystemService = FileSystemService.getInstance();
            const dependencies = new Map<string, DependencyInfo>();
            
            // Get workspace folders
            const workspaceFolders = fileSystemService.getWorkspaceFolders();
            if (workspaceFolders.length === 0) {
                return [];
            }
            
            // Get all JavaScript/TypeScript files in the specified directory
            const includePattern = new vscode.RelativePattern(
                directoryPath,
                '**/*.{js,jsx,ts,tsx}'
            );
            
            const excludePattern = includeNodeModules ? undefined : '**/node_modules/**';
            
            const files = await vscode.workspace.findFiles(includePattern, excludePattern);
            
            for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();
                
                // Find all import statements
                const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
                let match;
                
                while ((match = importRegex.exec(text)) !== null) {
                    const dependencyName = match[1];
                    
                    if (!dependencies.has(dependencyName)) {
                        dependencies.set(dependencyName, {
                            name: dependencyName,
                            usageCount: 0,
                            importLocations: []
                        });
                    }
                    
                    const dependencyInfo = dependencies.get(dependencyName)!;
                    dependencyInfo.usageCount++;
                    dependencyInfo.importLocations.push(file.fsPath);
                }
                
                // Find require statements
                const requireRegex = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
                
                while ((match = requireRegex.exec(text)) !== null) {
                    const dependencyName = match[1];
                    
                    if (!dependencies.has(dependencyName)) {
                        dependencies.set(dependencyName, {
                            name: dependencyName,
                            usageCount: 0,
                            importLocations: []
                        });
                    }
                    
                    const dependencyInfo = dependencies.get(dependencyName)!;
                    dependencyInfo.usageCount++;
                    dependencyInfo.importLocations.push(file.fsPath);
                }
            }
            
            // Convert map to array and sort by usage count
            return Array.from(dependencies.values())
                .sort((a, b) => b.usageCount - a.usageCount);
            
        } catch (error) {
            this.context.loggingService.error(`Failed to find dependencies in directory: ${directoryPath}`, error);
            return [];
        }
    }
    
    public async findFunctionDefinitions(document: vscode.TextDocument): Promise<vscode.Location[]> {
        try {
            // Use VS Code's built-in symbol provider to find symbols in the document
            const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );
            
            if (!symbols) {
                return [];
            }
            
            // Filter for function/method symbols
            return symbols
                .filter(s => 
                    s.kind === vscode.SymbolKind.Function || 
                    s.kind === vscode.SymbolKind.Method)
                .map(s => s.location);
            
        } catch (error) {
            this.context.loggingService.error('Failed to find function definitions', error);
            return [];
        }
    }
    
    public async findReferences(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Location[]> {
        try {
            const references = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeReferenceProvider',
                document.uri,
                position
            );
            
            return references || [];
            
        } catch (error) {
            this.context.loggingService.error('Failed to find references', error);
            return [];
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

    private findSymbolInText(text: string, symbol: string): { line: number; character: number } | undefined {
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const index = line.indexOf(symbol);
            
            if (index !== -1) {
                // Make sure it's a complete symbol, not a substring
                // Check the character before and after to ensure it's a word boundary
                const charBefore = index > 0 ? line[index - 1] : ' ';
                const charAfter = index + symbol.length < line.length ? line[index + symbol.length] : ' ';
                
                const isWordBoundaryBefore = !/[a-zA-Z0-9_]/.test(charBefore);
                const isWordBoundaryAfter = !/[a-zA-Z0-9_]/.test(charAfter);
                
                if (isWordBoundaryBefore && isWordBoundaryAfter) {
                    return {
                        line: i,
                        character: index
                    };
                }
            }
        }
        
        return undefined;
    }

    private getLanguageIdFromExtension(extension: string): string | undefined {
        const extensionToLanguage: Record<string, string> = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascriptreact',
            'tsx': 'typescriptreact',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'go': 'go',
            'rb': 'ruby',
            'php': 'php',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'sh': 'shellscript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml'
        };
        
        return extensionToLanguage[extension];
    }

    public async findRelevantFiles(searchQuery: string, maxResults: number = 10): Promise<SearchResult[]> {
        try {
            this.context.loggingService.debug(`Finding relevant files for query: ${searchQuery}`);
            
            // Get workspace folders
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                this.context.loggingService.warning('No workspace folders found');
                return [];
            }
            
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            
            // Find all relevant files using workspace search API
            let searchResults: SearchResult[] = [];
            
            // First try to find exact matches
            const exactMatches = await this.findExactMatches(searchQuery, maxResults);
            searchResults = searchResults.concat(exactMatches);
            
            // If we need more results, try fuzzy matching
            if (searchResults.length < maxResults) {
                const fuzzyMatches = await this.findFuzzyMatches(searchQuery, maxResults - searchResults.length);
                searchResults = searchResults.concat(fuzzyMatches);
            }
            
            // Deduplicate and return top results sorted by score
            const uniqueResults = this.deduplicateResults(searchResults);
            const sortedResults = this.sortResultsByScore(uniqueResults);
            
            return sortedResults.slice(0, maxResults);
        } catch (error) {
            this.context.loggingService.error('Error finding relevant files', error);
            return [];
        }
    }

    private async findExactMatches(searchQuery: string, maxResults: number): Promise<SearchResult[]> {
        try {
            // Get workspace folders
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return [];
            }
            
            const workspaceRoot = workspaceFolders[0].uri;
            
            // Split search query into terms for better matching
            const searchTerms = searchQuery.toLowerCase().split(/\s+/);
            
            // Search for terms in file content
            const results: SearchResult[] = [];
            
            for (const term of searchTerms) {
                if (term.length < 3) {
                    continue; // Skip short terms
                }
                
                // Use VS Code's search API to find matches in content
                const contentMatches = await vscode.workspace.findTextInFiles(
                    { pattern: term },
                    { maxResults: maxResults * 2 }
                );
                
                // Convert results to our format
                for (const match of contentMatches) {
                    const uri = match.uri;
                    const relativePath = path.relative(workspaceRoot.fsPath, uri.fsPath);
                    
                    let score = 1.0;
                    // Prioritize certain file types
                    if (uri.fsPath.endsWith('.ts') || uri.fsPath.endsWith('.js')) {
                        score += 0.5;
                    }
                    
                    // Prioritize files with names matching the query
                    const fileName = path.basename(uri.fsPath).toLowerCase();
                    if (fileName.includes(term)) {
                        score += 1.0;
                    }
                    
                    // Get excerpt from the file if possible
                    let excerpt: string | undefined;
                    try {
                        const document = await vscode.workspace.openTextDocument(uri);
                        const text = document.getText();
                        const index = text.toLowerCase().indexOf(term);
                        if (index >= 0) {
                            const start = Math.max(0, index - 50);
                            const end = Math.min(text.length, index + term.length + 50);
                            excerpt = text.substring(start, end).replace(/\s+/g, ' ').trim();
                        }
                    } catch (error) {
                        // Unable to get excerpt
                    }
                    
                    results.push({
                        uri,
                        relativePath,
                        score,
                        excerpt
                    });
                }
            }
            
            return results;
        } catch (error) {
            this.context.loggingService.error('Error finding exact matches', error);
            return [];
        }
    }

    private async findFuzzyMatches(searchQuery: string, maxResults: number): Promise<SearchResult[]> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return [];
            }
            
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            
            // Get all files in the workspace
            const files = await vscode.workspace.findFiles('**/*.{ts,js,tsx,jsx,json,md}', '**/node_modules/**', 1000);
            
            const results: SearchResult[] = [];
            
            // Split search query into terms
            const searchTerms = searchQuery.toLowerCase().split(/\s+/);
            
            for (const uri of files) {
                const relativePath = path.relative(workspaceRoot, uri.fsPath);
                const fileName = path.basename(uri.fsPath).toLowerCase();
                
                // Calculate match score
                let score = 0;
                
                for (const term of searchTerms) {
                    if (term.length < 3) {
                        continue;
                    }
                    
                    if (fileName.includes(term)) {
                        score += 0.8;
                    }
                    
                    if (relativePath.toLowerCase().includes(term)) {
                        score += 0.5;
                    }
                }
                
                if (score > 0) {
                    results.push({
                        uri,
                        relativePath,
                        score
                    });
                }
            }
            
            return results;
        } catch (error) {
            this.context.loggingService.error('Error finding fuzzy matches', error);
            return [];
        }
    }

    private deduplicateResults(results: SearchResult[]): SearchResult[] {
        const seen = new Set<string>();
        const uniqueResults: SearchResult[] = [];
        
        for (const result of results) {
            const key = result.uri.toString();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(result);
            }
        }
        
        return uniqueResults;
    }

    private sortResultsByScore(results: SearchResult[]): SearchResult[] {
        return [...results].sort((a, b) => b.score - a.score);
    }
} 