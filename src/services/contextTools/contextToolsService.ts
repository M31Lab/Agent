import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { 
    ContextTool,
    ContextToolType,
    ContextToolInput,
    ContextToolResult,
    _UrlContextInput,
    FileContextInput,
    FolderContextInput,
    _ProblemsContextInput,
    _CustomContextInput
} from '../../models/contextTools';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../../services/telemetry/telemetryService';
import { CodeSnippet, FileContext } from '../../models/codebase/codeContext';
// { _FileSystemService } from '../fileSystem/fileSystemService';

export interface UrlContextInput {
    url: string;
    maxTokens?: number;
    includeImages?: boolean;
}

export interface FileContextInput {
    filePath: string;
    selection?: {
        startLine: number;
        endLine: number;
    };
}

export interface FolderContextInput {
    folderPath: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    maxDepth?: number;
    maxFiles?: number;
}

export interface ProblemsContextInput {
    severity?: 'all' | 'error' | 'warning' | 'info';
    maxProblems?: number;
}

export interface ContextToolEvent {
    type: 'toolExecuted' | 'toolFailed';
    toolType: ContextToolType;
    input?: UrlContextInput | FileContextInput | FolderContextInput | ProblemsContextInput;
    result?: ContextToolResult;
    content?: string;
    error?: string;
    timestamp: number;
}

export interface UrlToolOptions {
    url: string;
    maxTokens?: number;
    includeImages?: boolean;
}

export interface FileToolOptions {
    filePath: string;
}

export interface FolderToolOptions {
    folderPath: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    maxFiles?: number;
    maxTokensPerFile?: number;
}

export interface ProblemsToolOptions {
    severity: 'all' | 'error' | 'warning' | 'info';
    maxProblems?: number;
}

export class ContextToolsService {
    private readonly eventEmitter = new vscode.EventEmitter<ContextToolEvent>();
    private readonly disposables: vscode.Disposable[] = [];
    private readonly tools: Map<ContextToolType, ContextTool> = new Map();
    private readonly context: ExtensionContext;
    private readonly logging: LoggingService;
    
    public readonly onContextToolEvent = this.eventEmitter.event;
    
    constructor(context: ExtensionContext) {
        this.context = context;
        this.logging = context.loggingService;
        this.disposables.push(this.eventEmitter);
        
        this.registerDefaultTools();
    }
    
    private registerDefaultTools(): void {
        // URL Tool
        this.tools.set(ContextToolType.Url, {
            type: ContextToolType.Url,
            name: 'URL',
            description: 'Fetch content from a URL and convert to markdown',
            command: '@url',
            icon: 'globe',
            requiresInput: true,
            requiresConfirmation: true
        });
        
        // Problems Tool
        this.tools.set(ContextToolType.Problems, {
            type: ContextToolType.Problems,
            name: 'Problems',
            description: 'Add workspace errors and warnings from the Problems panel',
            command: '@problems',
            icon: 'warning',
            requiresInput: false,
            requiresConfirmation: true
        });
        
        // File Tool
        this.tools.set(ContextToolType.File, {
            type: ContextToolType.File,
            name: 'File',
            description: 'Add a file\'s contents',
            command: '@file',
            icon: 'file-code',
            requiresInput: true,
            requiresConfirmation: false
        });
        
        // Folder Tool
        this.tools.set(ContextToolType.Folder, {
            type: ContextToolType.Folder,
            name: 'Folder',
            description: 'Add multiple files from a folder',
            command: '@folder',
            icon: 'folder',
            requiresInput: true,
            requiresConfirmation: true
        });
    }
    
    public async executeUrlTool(options: UrlToolOptions): Promise<ContextToolResult> {
        try {
            this.logging.info(`Fetching URL: ${options.url}`);
            
            // Validate URL
            if (!options.url.startsWith('http://') && !options.url.startsWith('https://')) {
                throw new Error('URL must start with http:// or https://');
            }
            
            // Fetch the content
            const response = await axios.get(options.url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'M31-Agent/1.0 VSCode Extension'
                }
            });
            
            const contentType = response.headers['content-type'] || '';
            let markdown = '';
            
            if (contentType.includes('text/html')) {
                // Parse HTML and convert to markdown
                markdown = await this.htmlToMarkdown(response.data, options.url, options.includeImages);
            } else if (contentType.includes('application/json')) {
                // Format JSON
                markdown = '```json\n' + JSON.stringify(response.data, null, 2) + '\n```';
            } else {
                // Plain text
                markdown = '```\n' + response.data + '\n```';
            }
            
            // Apply token limit if specified
            if (options.maxTokens && options.maxTokens > 0) {
                // Approximate token count (4 chars per token)
                const approxTokens = markdown.length / 4;
                if (approxTokens > options.maxTokens) {
                    const truncatePercent = options.maxTokens / approxTokens;
                    const truncateLength = Math.floor(markdown.length * truncatePercent);
                    markdown = markdown.substring(0, truncateLength) + 
                        '\n\n...\n\n_Content truncated due to token limit._';
                }
            }
            
            // Add source reference
            markdown = `# Content from ${options.url}\n\n${markdown}\n\n_Source: ${options.url}_`;
            
            this.eventEmitter.fire({
                type: 'toolExecuted',
                toolType: ContextToolType.Url,
                content: markdown,
                timestamp: Date.now()
            });
            
            return {
                content: markdown,
                metadata: {
                    source: options.url,
                    timestamp: Date.now(),
                    type: ContextToolType.Url
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logging.error(`Error fetching URL: ${errorMessage}`);
            
            this.eventEmitter.fire({
                type: 'toolFailed',
                toolType: ContextToolType.Url,
                error: errorMessage,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }
    
    public async executeProblemsTools(options: ProblemsToolOptions): Promise<ContextToolResult> {
        try {
            // Get all diagnostics across all files
            const allDiagnostics: Array<{
                file: string;
                line: number;
                column: number;
                severity: string;
                source: string;
                message: string;
            }> = [];
            
            // Get all files with diagnostics
            vscode.languages.getDiagnostics().forEach(([uri, diagnostics]) => {
                if (diagnostics.length === 0) {
                    return;
                }
                
                const filePath = uri.fsPath;
                const fileName = path.basename(filePath);
                
                // Process each diagnostic
                diagnostics.forEach(diagnostic => {
                    // Filter by severity if needed
                    if (options.severity !== 'all') {
                        const diagSeverity = this.getDiagnosticSeverityString(diagnostic.severity).toLowerCase();
                        if (diagSeverity !== options.severity) {
                            return;
                        }
                    }
                    
                    const startPosition = diagnostic.range.start;
                    
                    allDiagnostics.push({
                        file: fileName,
                        line: startPosition.line + 1,
                        column: startPosition.character + 1,
                        severity: this.getDiagnosticSeverityString(diagnostic.severity),
                        source: diagnostic.source || 'unknown',
                        message: diagnostic.message
                    });
                });
            });
            
            // Sort diagnostics by severity (errors first) and then by file
            allDiagnostics.sort((a, b) => {
                const severityOrder = { 'Error': 0, 'Warning': 1, 'Information': 2, 'Hint': 3 };
                const severityA = severityOrder[a.severity] || 4;
                const severityB = severityOrder[b.severity] || 4;
                
                if (severityA !== severityB) {
                    return severityA - severityB;
                }
                
                return a.file.localeCompare(b.file);
            });
            
            // Apply maximum limit if specified
            const maxProblems = options.maxProblems || allDiagnostics.length;
            const diagnostics = allDiagnostics.slice(0, maxProblems);
            
            // Generate markdown
            let markdown = '# Workspace Problems\n\n';
            
            if (diagnostics.length === 0) {
                markdown += 'No problems found matching the criteria.\n';
            } else {
                // Group by file
                const problemsByFile = diagnostics.reduce((groups, problem) => {
                    const file = problem.file;
                    if (!groups[file]) {
                        groups[file] = [];
                    }
                    groups[file].push(problem);
                    return groups;
                }, {} as Record<string, typeof diagnostics>);
                
                // Generate markdown for each file
                for (const [file, problems] of Object.entries(problemsByFile)) {
                    markdown += `## ${file}\n\n`;
                    
                    for (const problem of problems) {
                        const icon = problem.severity === 'Error' ? '❌' : 
                            problem.severity === 'Warning' ? '⚠️' : 'ℹ️';
                            
                        markdown += `${icon} **${problem.severity}** at line ${problem.line}, column ${problem.column}\n`;
                        markdown += `> ${problem.message}\n`;
                        markdown += `> Source: ${problem.source}\n\n`;
                    }
                }
                
                if (allDiagnostics.length > maxProblems) {
                    markdown += `\n_Note: Only showing ${maxProblems} out of ${allDiagnostics.length} problems._\n`;
                }
            }
            
            this.eventEmitter.fire({
                type: 'toolExecuted',
                toolType: ContextToolType.Problems,
                content: markdown,
                timestamp: Date.now()
            });
            
            return {
                content: markdown,
                metadata: {
                    source: 'vscode.diagnostics',
                    timestamp: Date.now(),
                    type: ContextToolType.Problems
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logging.error(`Error processing problems: ${errorMessage}`);
            
            this.eventEmitter.fire({
                type: 'toolFailed',
                toolType: ContextToolType.Problems,
                error: errorMessage,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }
    
    public async executeFileTool(input: FileContextInput): Promise<ContextToolResult> {
        try {
            this.eventEmitter.fire({
                type: 'toolExecuted',
                toolType: ContextToolType.File,
                input,
                timestamp: Date.now()
            });
            
            const filePath = this.resolveFilePath(input.filePath);
            
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            
            // Read file content
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Apply selection if provided
            if (input.selection) {
                const lines = content.split('\n');
                const { startLine, endLine } = input.selection;
                
                if (startLine > 0 && endLine <= lines.length && startLine <= endLine) {
                    content = lines.slice(startLine - 1, endLine).join('\n');
                }
            }
            
            const result: ContextToolResult = {
                toolType: ContextToolType.File,
                input,
                content,
                timestamp: Date.now(),
                metadata: {
                    filePath,
                    fileSize: fs.statSync(filePath).size,
                    selection: input.selection
                }
            };
            
            this.eventEmitter.fire({
                type: 'toolExecuted',
                toolType: ContextToolType.File,
                input,
                result,
                timestamp: Date.now()
            });
            
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.eventEmitter.fire({
                type: 'toolFailed',
                toolType: ContextToolType.File,
                input,
                error: errorMessage,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }
    
    public async executeFolderTool(input: FolderContextInput): Promise<ContextToolResult> {
        try {
            this.eventEmitter.fire({
                type: 'toolExecuted',
                toolType: ContextToolType.Folder,
                input,
                timestamp: Date.now()
            });
            
            const folderPath = this.resolveFilePath(input.folderPath);
            
            if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
                throw new Error(`Folder not found: ${folderPath}`);
            }
            
            const files = await this.findFilesInFolder(
                folderPath,
                input.includePatterns || ['**/*'],
                input.excludePatterns || ['**/node_modules/**', '**/.git/**'],
                input.maxDepth || 3
            );
            
            // Limit total files
            const maxFiles = input.maxFiles || 10;
            const selectedFiles = files.slice(0, maxFiles);
            
            let content = `# Files in folder: ${input.folderPath}\n\n`;
            
            for (const file of selectedFiles) {
                const relativePath = path.relative(folderPath, file);
                content += `## File: ${relativePath}\n\n`;
                
                try {
                    const fileContent = fs.readFileSync(file, 'utf8');
                    content += '```' + this.getLanguageIdFromPath(file) + '\n';
                    content += fileContent + '\n';
                    content += '```\n\n';
                } catch (readError) {
                    content += `Error reading file: ${readError instanceof Error ? readError.message : String(readError)}\n\n`;
                }
            }
            
            if (files.length > maxFiles) {
                content += `\n_Note: Showing ${maxFiles} of ${files.length} files. Use more specific patterns to include other files._\n`;
            }
            
            const result: ContextToolResult = {
                toolType: ContextToolType.Folder,
                input,
                content,
                timestamp: Date.now(),
                metadata: {
                    folderPath,
                    totalFiles: files.length,
                    includedFiles: selectedFiles.length,
                    fileList: selectedFiles.map(f => path.relative(folderPath, f))
                }
            };
            
            this.eventEmitter.fire({
                type: 'toolExecuted',
                toolType: ContextToolType.Folder,
                input,
                result,
                timestamp: Date.now()
            });
            
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.eventEmitter.fire({
                type: 'toolFailed',
                toolType: ContextToolType.Folder,
                input,
                error: errorMessage,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }
    
    public getAllTools(): ContextTool[] {
        return Array.from(this.tools.values());
    }
    
    public getToolByType(type: ContextToolType): ContextTool | undefined {
        return this.tools.get(type);
    }
    
    public getToolByCommand(command: string): ContextTool | undefined {
        return Array.from(this.tools.values()).find(tool => tool.command === command);
    }
    
    private extractTitle(html: string): string {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return titleMatch ? titleMatch[1].trim() : 'Untitled Page';
    }
    
    private htmlToMarkdown(html: string, baseUrl: string, includeImages: boolean = false): string {
        try {
            const $ = cheerio.load(html);
            let markdown = '';
            
            // Extract title
            const title = $('title').text();
            if (title) {
                markdown += `# ${title}\n\n`;
            }
            
            // Process main content
            const mainContent = $('main, #content, #main, .content, article, .article, .post, .entry');
            const contentElement = mainContent.length > 0 ? mainContent.first() : $('body');
            
            // Process headings
            contentElement.find('h1, h2, h3, h4, h5, h6').each((i, elem) => {
                const level = parseInt(elem.tagName.substring(1));
                const text = $(elem).text().trim();
                markdown += `${'#'.repeat(level)} ${text}\n\n`;
            });
            
            // Process paragraphs
            contentElement.find('p').each((i, elem) => {
                const text = $(elem).text().trim();
                if (text) {
                    markdown += `${text}\n\n`;
                }
            });
            
            // Process lists
            contentElement.find('ul, ol').each((i, elem) => {
                const isOrdered = elem.tagName === 'ol';
                
                $(elem).find('li').each((j, liElem) => {
                    const text = $(liElem).text().trim();
                    if (isOrdered) {
                        markdown += `${j + 1}. ${text}\n`;
                    } else {
                        markdown += `* ${text}\n`;
                    }
                });
                
                markdown += '\n';
            });
            
            // Process images if enabled
            if (includeImages) {
                contentElement.find('img').each((i, elem) => {
                    const src = $(elem).attr('src');
                    const alt = $(elem).attr('alt') || 'Image';
                    
                    if (src) {
                        // Resolve relative URLs
                        const imageUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
                        markdown += `![${alt}](${imageUrl})\n\n`;
                    }
                });
            }
            
            // Process code blocks
            contentElement.find('pre, code').each((i, elem) => {
                const language = $(elem).attr('class')?.match(/language-(\w+)/) ? 
                    $(elem).attr('class')?.match(/language-(\w+)/)?.[1] || '' : '';
                const code = $(elem).text().trim();
                
                markdown += '```' + language + '\n' + code + '\n```\n\n';
            });
            
            return markdown.trim();
        } catch (error) {
            this.logging.error('Error converting HTML to markdown:', error);
            return html; // Return original content on error
        }
    }
    
    private getDiagnostics(): DiagnosticInfo[] {
        const diagnostics: DiagnosticInfo[] = [];
        
        // Get all diagnostics from VS Code
        vscode.languages.getDiagnostics().forEach(([uri, fileDiagnostics]) => {
            const filePath = uri.fsPath;
            
            fileDiagnostics.forEach(diagnostic => {
                diagnostics.push({
                    filePath,
                    message: diagnostic.message,
                    severity: diagnostic.severity,
                    source: diagnostic.source || 'unknown',
                    line: diagnostic.range.start.line + 1,
                    column: diagnostic.range.start.character + 1
                });
            });
        });
        
        // Sort by severity (errors first)
        diagnostics.sort((a, b) => a.severity - b.severity);
        
        return diagnostics;
    }
    
    private formatDiagnosticsAsMarkdown(diagnostics: DiagnosticInfo[]): string {
        if (diagnostics.length === 0) {
            return 'No problems found in workspace.';
        }
        
        let content = '# Workspace Problems\n\n';
        content += `Found ${diagnostics.length} problems in workspace.\n\n`;
        
        // Group by file
        const fileGroups: { [filePath: string]: DiagnosticInfo[] } = {};
        
        for (const diagnostic of diagnostics) {
            if (!fileGroups[diagnostic.filePath]) {
                fileGroups[diagnostic.filePath] = [];
            }
            fileGroups[diagnostic.filePath].push(diagnostic);
        }
        
        // Format each file's problems
        for (const [filePath, fileDiagnostics] of Object.entries(fileGroups)) {
            const relativePath = vscode.workspace.asRelativePath(filePath);
            content += `## File: ${relativePath}\n\n`;
            
            for (const diagnostic of fileDiagnostics) {
                const severity = this.getSeverityName(diagnostic.severity);
                content += `- **${severity}** (Line ${diagnostic.line}, Column ${diagnostic.column}): ${diagnostic.message}`;
                
                if (diagnostic.source && diagnostic.source !== 'unknown') {
                    content += ` [${diagnostic.source}]`;
                }
                
                content += '\n';
            }
            
            content += '\n';
        }
        
        return content;
    }
    
    private getSeverityName(severity: vscode.DiagnosticSeverity): string {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return 'Error';
            case vscode.DiagnosticSeverity.Warning:
                return 'Warning';
            case vscode.DiagnosticSeverity.Information:
                return 'Info';
            case vscode.DiagnosticSeverity.Hint:
                return 'Hint';
            default:
                return 'Unknown';
        }
    }
    
    private getSeverityLevel(severity: string): vscode.DiagnosticSeverity {
        switch (severity.toLowerCase()) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'info':
            case 'information':
                return vscode.DiagnosticSeverity.Information;
            case 'hint':
                return vscode.DiagnosticSeverity.Hint;
            default:
                return vscode.DiagnosticSeverity.Error;
        }
    }
    
    private resolveFilePath(filePath: string): string {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder is open');
        }
        
        return path.join(workspaceRoot, filePath);
    }
    
    private async findFilesInFolder(
        folderPath: string,
        includePatterns: string[],
        excludePatterns: string[],
        maxDepth: number
    ): Promise<string[]> {
        const _folderUri = vscode.Uri.file(folderPath);
        
        // Convert patterns to glob patterns for VS Code
        const includeGlob = `{${includePatterns.map(p => path.join(folderPath, p)).join(',')}}`;
        const excludeGlob = `{${excludePatterns.map(p => path.join(folderPath, p)).join(',')}}`;
        
        const files = await vscode.workspace.findFiles(includeGlob, excludeGlob);
        
        // Filter by depth
        return files
            .map(file => file.fsPath)
            .filter(file => {
                const relativePath = path.relative(folderPath, file);
                const depth = relativePath.split(path.sep).length;
                return depth <= maxDepth;
            });
    }
    
    private matchesGlobPattern(filePath: string, pattern: string): boolean {
        // Convert the glob pattern to a regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(filePath);
    }
    
    private getLanguageIdFromPath(filePath: string): string {
        const extension = path.extname(filePath).toLowerCase();
        
        switch (extension) {
            case '.js':
                return 'javascript';
            case '.ts':
                return 'typescript';
            case '.jsx':
                return 'javascriptreact';
            case '.tsx':
                return 'typescriptreact';
            case '.html':
                return 'html';
            case '.css':
                return 'css';
            case '.json':
                return 'json';
            case '.py':
                return 'python';
            case '.java':
                return 'java';
            case '.c':
                return 'c';
            case '.cpp':
                return 'cpp';
            case '.cs':
                return 'csharp';
            case '.go':
                return 'go';
            case '.rb':
                return 'ruby';
            case '.php':
                return 'php';
            case '.rs':
                return 'rust';
            case '.swift':
                return 'swift';
            case '.sh':
                return 'shellscript';
            case '.md':
                return 'markdown';
            case '.yml':
            case '.yaml':
                return 'yaml';
            case '.xml':
                return 'xml';
            case '.sql':
                return 'sql';
            default:
                return '';
        }
    }
    
    private getDiagnosticSeverityString(severity: vscode.DiagnosticSeverity): string {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return 'Error';
            case vscode.DiagnosticSeverity.Warning:
                return 'Warning';
            case vscode.DiagnosticSeverity.Information:
                return 'Information';
            case vscode.DiagnosticSeverity.Hint:
                return 'Hint';
            default:
                return 'Unknown';
        }
    }
    
    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}

export type ContextToolEventType = 
    | 'toolExecuted'
    | 'toolFailed';

export interface ContextToolEvent {
    type: ContextToolEventType;
    toolType: ContextToolType;
    input: ContextToolInput;
    result?: ContextToolResult;
    error?: string;
    timestamp: number;
}

interface DiagnosticInfo {
    filePath: string;
    message: string;
    severity: vscode.DiagnosticSeverity;
    source: string;
    line: number;
    column: number;
} 