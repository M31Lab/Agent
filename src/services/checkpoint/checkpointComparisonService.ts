import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CheckpointService } from './checkpointService';
import { Checkpoint, CheckpointDiff, FileChange } from '../../models/checkpoint';

export interface CheckpointComparisonOptions {
    includeUnchangedFiles: boolean;
    maxDiffSize: number;
    maxFiles: number;
    showBinaryFiles: boolean;
}

export const defaultComparisonOptions: CheckpointComparisonOptions = {
    includeUnchangedFiles: false,
    maxDiffSize: 500000, // 500KB
    maxFiles: 100,
    showBinaryFiles: false
};

export interface CheckpointComparisonResult {
    fromCheckpoint: Checkpoint | null;
    toCheckpoint: Checkpoint | null;
    diff: CheckpointDiff;
    summary: {
        filesChanged: number;
        additions: number;
        deletions: number;
        filesCreated: number;
        filesDeleted: number;
    };
}

export class CheckpointComparisonService implements vscode.Disposable {
    private readonly checkpointService: CheckpointService;
    private readonly context: ExtensionContext;
    private readonly eventEmitter = new vscode.EventEmitter<CheckpointComparisonEvent>();
    private readonly disposables: vscode.Disposable[] = [];
    
    public readonly onComparisonEvent = this.eventEmitter.event;
    
    constructor(context: ExtensionContext) {
        this.context = context;
        this.checkpointService = context.checkpointService || CheckpointService.getInstance(context);
        this.disposables.push(this.eventEmitter);
    }
    
    public async compareCheckpoints(
        fromCheckpointId: string,
        toCheckpointId: string,
        options: Partial<CheckpointComparisonOptions> = {}
    ): Promise<CheckpointComparisonResult> {
        // Merge options with defaults
        const comparisonOptions: CheckpointComparisonOptions = {
            ...defaultComparisonOptions,
            ...options
        };
        
        // Get checkpoints
        let fromCheckpoint: Checkpoint | null = null;
        let toCheckpoint: Checkpoint | null = null;
        
        if (fromCheckpointId !== 'current') {
            fromCheckpoint = this.checkpointService.getCheckpointById(fromCheckpointId);
            if (!fromCheckpoint) {
                throw new Error(`From checkpoint ${fromCheckpointId} not found`);
            }
        }
        
        if (toCheckpointId !== 'current') {
            toCheckpoint = this.checkpointService.getCheckpointById(toCheckpointId);
            if (!toCheckpoint) {
                throw new Error(`To checkpoint ${toCheckpointId} not found`);
            }
        }
        
        // If comparing to current workspace, create a virtual checkpoint with current state
        let currentWorkspaceState: FileChange[] = [];
        
        if (fromCheckpointId === 'current' || toCheckpointId === 'current') {
            currentWorkspaceState = await this.captureCurrentWorkspaceState();
        }
        
        // Prepare file changes for comparison
        const fromChanges = fromCheckpointId === 'current' ? 
            currentWorkspaceState : 
            fromCheckpoint?.changes || [];
            
        const toChanges = toCheckpointId === 'current' ? 
            currentWorkspaceState : 
            toCheckpoint?.changes || [];
        
        // Compare the changes to generate a diff
        const diff = this.generateDiff(fromChanges, toChanges, comparisonOptions);
        
        // Generate summary
        const summary = {
            filesChanged: diff.changedFiles.length,
            additions: diff.changedFiles.reduce((sum, file) => sum + (file.additions || 0), 0),
            deletions: diff.changedFiles.reduce((sum, file) => sum + (file.deletions || 0), 0),
            filesCreated: diff.createdFiles.length,
            filesDeleted: diff.deletedFiles.length
        };
        
        // Emit event
        this.emitEvent({
            type: 'comparisonCompleted',
            fromCheckpointId,
            toCheckpointId,
            summary
        });
        
        return {
            fromCheckpoint,
            toCheckpoint,
            diff,
            summary
        };
    }
    
    private async captureCurrentWorkspaceState(): Promise<FileChange[]> {
        // Get workspace root
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder open');
        }
        
        const changes: FileChange[] = [];
        const processedFiles = new Set<string>();
        
        // Process all files in the workspace
        await this.processDirectory(workspaceRoot, '', processedFiles, changes);
        
        return changes;
    }
    
    private async processDirectory(
        rootPath: string,
        relativePath: string,
        processedFiles: Set<string>,
        changes: FileChange[]
    ): Promise<void> {
        const dirPath = path.join(rootPath, relativePath);
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const entryRelativePath = path.join(relativePath, entry.name);
            
            // Skip node_modules, .git, and other directories to ignore
            if (
                entry.isDirectory() && 
                (entry.name === 'node_modules' || 
                entry.name === '.git' || 
                entry.name === 'dist' || 
                entry.name === 'build' ||
                entry.name.startsWith('.'))
            ) {
                continue;
            }
            
            if (entry.isDirectory()) {
                await this.processDirectory(rootPath, entryRelativePath, processedFiles, changes);
            } else {
                const filePath = entryRelativePath;
                
                if (processedFiles.has(filePath)) {
                    continue;
                }
                
                processedFiles.add(filePath);
                
                try {
                    const fullPath = path.join(rootPath, filePath);
                    const content = await fs.readFile(fullPath, 'utf8');
                    
                    changes.push({
                        path: filePath,
                        oldContent: undefined,
                        newContent: content
                    });
                } catch (error) {
                    this.context.loggingService.warn(`Error reading file ${filePath}:`, error);
                    // Skip binary files or files with encoding issues
                }
            }
        }
    }
    
    private generateDiff(
        fromChanges: FileChange[],
        toChanges: FileChange[],
        options: CheckpointComparisonOptions
    ): CheckpointDiff {
        const diff: CheckpointDiff = {
            changedFiles: [],
            createdFiles: [],
            deletedFiles: []
        };
        
        // Create maps for faster lookups
        const fromFilesMap = new Map<string, FileChange>();
        const toFilesMap = new Map<string, FileChange>();
        
        for (const change of fromChanges) {
            fromFilesMap.set(change.path, change);
        }
        
        for (const change of toChanges) {
            toFilesMap.set(change.path, change);
        }
        
        // Find created and changed files
        let processedCount = 0;
        for (const [filePath, toChange] of toFilesMap.entries()) {
            if (processedCount >= options.maxFiles) {
                break;
            }
            
            const fromChange = fromFilesMap.get(filePath);
            
            if (!fromChange) {
                // File was created
                diff.createdFiles.push({
                    path: filePath,
                    content: toChange.newContent
                });
                processedCount++;
            } else if (fromChange.newContent !== toChange.newContent) {
                // File was changed
                if (
                    toChange.newContent && 
                    fromChange.newContent && 
                    toChange.newContent.length + fromChange.newContent.length <= options.maxDiffSize
                ) {
                    // Compute diff statistics
                    const [additions, deletions] = this.computeDiffStats(
                        fromChange.newContent,
                        toChange.newContent
                    );
                    
                    diff.changedFiles.push({
                        path: filePath,
                        oldContent: fromChange.newContent,
                        newContent: toChange.newContent,
                        additions,
                        deletions
                    });
                    processedCount++;
                }
            } else if (options.includeUnchangedFiles) {
                // File unchanged but include it
                diff.changedFiles.push({
                    path: filePath,
                    oldContent: fromChange.newContent,
                    newContent: toChange.newContent,
                    unchanged: true
                });
                processedCount++;
            }
        }
        
        // Find deleted files
        for (const [filePath, fromChange] of fromFilesMap.entries()) {
            if (processedCount >= options.maxFiles) {
                break;
            }
            
            if (!toFilesMap.has(filePath)) {
                // File was deleted
                diff.deletedFiles.push({
                    path: filePath,
                    content: fromChange.newContent
                });
                processedCount++;
            }
        }
        
        return diff;
    }
    
    private computeDiffStats(oldContent: string, newContent: string): [number, number] {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        
        // Very simple line-based diff
        const oldSet = new Set(oldLines);
        const newSet = new Set(newLines);
        
        let additions = 0;
        let deletions = 0;
        
        for (const line of newLines) {
            if (!oldSet.has(line)) {
                additions++;
            }
        }
        
        for (const line of oldLines) {
            if (!newSet.has(line)) {
                deletions++;
            }
        }
        
        return [additions, deletions];
    }
    
    public async visualizeDiff(
        fromCheckpointId: string,
        toCheckpointId: string,
        options: Partial<CheckpointComparisonOptions> = {}
    ): Promise<void> {
        try {
            const comparison = await this.compareCheckpoints(
                fromCheckpointId,
                toCheckpointId,
                options
            );
            
            const panel = vscode.window.createWebviewPanel(
                'checkpointDiff',
                'Checkpoint Comparison',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
            
            panel.webview.html = this.generateDiffHtml(comparison);
            
            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(async message => {
                if (message.command === 'openDiff' && message.filePath) {
                    await this.openFileDiff(
                        message.filePath,
                        fromCheckpointId,
                        toCheckpointId
                    );
                } else if (message.command === 'restoreCheckpoint' && message.checkpointId) {
                    await this.checkpointService.restoreCheckpoint(message.checkpointId);
                }
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Error visualizing diff: ${errorMessage}`);
        }
    }
    
    private async openFileDiff(
        filePath: string,
        fromCheckpointId: string,
        toCheckpointId: string
    ): Promise<void> {
        try {
            // Get content for from checkpoint
            let fromContent = '';
            if (fromCheckpointId !== 'current') {
                const fromCheckpoint = this.checkpointService.getCheckpointById(fromCheckpointId);
                if (fromCheckpoint) {
                    const fileChange = fromCheckpoint.changes.find(c => c.path === filePath);
                    if (fileChange && fileChange.newContent) {
                        fromContent = fileChange.newContent;
                    }
                }
            } else {
                // If from is current, read from disk
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    const fullPath = path.join(workspaceRoot, filePath);
                    try {
                        fromContent = await fs.readFile(fullPath, 'utf8');
                    } catch (error) {
                        // File doesn't exist in current workspace
                    }
                }
            }
            
            // Get content for to checkpoint
            let toContent = '';
            if (toCheckpointId !== 'current') {
                const toCheckpoint = this.checkpointService.getCheckpointById(toCheckpointId);
                if (toCheckpoint) {
                    const fileChange = toCheckpoint.changes.find(c => c.path === filePath);
                    if (fileChange && fileChange.newContent) {
                        toContent = fileChange.newContent;
                    }
                }
            } else {
                // If to is current, read from disk
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    const fullPath = path.join(workspaceRoot, filePath);
                    try {
                        toContent = await fs.readFile(fullPath, 'utf8');
                    } catch (error) {
                        // File doesn't exist in current workspace
                    }
                }
            }
            
            // Create temporary URIs for diff editor
            const _fromUri = vscode.Uri.parse(`untitled:${filePath}.from-checkpoint`);
            const _toUri = vscode.Uri.parse(`untitled:${filePath}.to-checkpoint`);
            
            // Create document contents
            const fromDoc = await vscode.workspace.openTextDocument({
                content: fromContent,
                language: this.getLanguageFromPath(filePath)
            });
            
            const toDoc = await vscode.workspace.openTextDocument({
                content: toContent,
                language: this.getLanguageFromPath(filePath)
            });
            
            // Show diff editor
            await vscode.commands.executeCommand(
                'vscode.diff',
                fromDoc.uri,
                toDoc.uri,
                `${path.basename(filePath)} - Checkpoint Diff`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Error opening file diff: ${errorMessage}`);
        }
    }
    
    private getLanguageFromPath(filePath: string): string {
        const extension = path.extname(filePath).toLowerCase();
        
        const extensionMap: Record<string, string> = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascriptreact',
            '.tsx': 'typescriptreact',
            '.html': 'html',
            '.css': 'css',
            '.json': 'json',
            '.md': 'markdown',
            '.py': 'python',
            '.java': 'java',
            '.c': 'c',
            '.cpp': 'cpp',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.sh': 'shellscript',
            '.yaml': 'yaml',
            '.yml': 'yaml'
        };
        
        return extensionMap[extension] || 'plaintext';
    }
    
    private generateDiffHtml(comparison: CheckpointComparisonResult): string {
        const { fromCheckpoint, toCheckpoint, diff, summary } = comparison;
        
        const fromName = fromCheckpoint ? fromCheckpoint.name : 'Current Workspace';
        const toName = toCheckpoint ? toCheckpoint.name : 'Current Workspace';
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkpoint Comparison</title>
    <style>
        :root {
            --foreground: var(--vscode-foreground);
            --background: var(--vscode-editor-background);
            --border: var(--vscode-panel-border);
            --link: var(--vscode-textLink-foreground);
            --addition: var(--vscode-diffEditor-insertedTextBackground);
            --deletion: var(--vscode-diffEditor-removedTextBackground);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            padding: 20px;
            background-color: var(--background);
            color: var(--foreground);
        }
        
        h1, h2, h3 {
            color: var(--foreground);
        }
        
        .summary {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        
        .checkpoints {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        
        .checkpoint {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 5px;
            margin: 0 5px;
        }
        
        .file-list {
            margin-top: 20px;
        }
        
        .file-item {
            padding: 10px;
            border-bottom: 1px solid var(--border);
            cursor: pointer;
        }
        
        .file-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .file-path {
            font-family: monospace;
        }
        
        .file-stats {
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        .addition {
            color: var(--vscode-gitDecoration-addedResourceForeground);
        }
        
        .deletion {
            color: var(--vscode-gitDecoration-deletedResourceForeground);
        }
        
        .tab-container {
            margin-top: 20px;
        }
        
        .tab-buttons {
            display: flex;
            border-bottom: 1px solid var(--border);
        }
        
        .tab-button {
            padding: 10px 20px;
            border: none;
            background: none;
            color: var(--foreground);
            cursor: pointer;
        }
        
        .tab-button.active {
            border-bottom: 2px solid var(--link);
            font-weight: bold;
        }
        
        .tab-content {
            display: none;
            padding: 15px 0;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .restore-button {
            padding: 5px 10px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            margin-top: 10px;
        }
        
        .restore-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <h1>Checkpoint Comparison</h1>
    
    <div class="summary">
        <div>
            <strong>Summary:</strong> 
            ${summary.filesChanged} files changed 
            (${summary.additions} additions, ${summary.deletions} deletions), 
            ${summary.filesCreated} files created, 
            ${summary.filesDeleted} files deleted
        </div>
    </div>
    
    <div class="checkpoints">
        <div class="checkpoint">
            <h3>From: ${fromName}</h3>
            ${fromCheckpoint ? `
                <div>Created: ${new Date(fromCheckpoint.timestamp).toLocaleString()}</div>
                <div>${fromCheckpoint.description || ''}</div>
                <button class="restore-button" onclick="restoreCheckpoint('${fromCheckpoint.id}')">
                    Restore This Checkpoint
                </button>
            ` : '<div>Current workspace state</div>'}
        </div>
        
        <div class="checkpoint">
            <h3>To: ${toName}</h3>
            ${toCheckpoint ? `
                <div>Created: ${new Date(toCheckpoint.timestamp).toLocaleString()}</div>
                <div>${toCheckpoint.description || ''}</div>
                <button class="restore-button" onclick="restoreCheckpoint('${toCheckpoint.id}')">
                    Restore This Checkpoint
                </button>
            ` : '<div>Current workspace state</div>'}
        </div>
    </div>
    
    <div class="tab-container">
        <div class="tab-buttons">
            <button class="tab-button active" onclick="openTab('changed')">
                Changed Files (${diff.changedFiles.length})
            </button>
            <button class="tab-button" onclick="openTab('created')">
                Created Files (${diff.createdFiles.length})
            </button>
            <button class="tab-button" onclick="openTab('deleted')">
                Deleted Files (${diff.deletedFiles.length})
            </button>
        </div>
        
        <div id="changed" class="tab-content active">
            ${diff.changedFiles.length === 0 ? '<p>No changed files</p>' : ''}
            <div class="file-list">
                ${diff.changedFiles.map(file => `
                    <div class="file-item" onclick="openFileDiff('${file.path}')">
                        <div class="file-path">${file.path}</div>
                        <div class="file-stats">
                            ${file.unchanged ? 
                                '<span>Unchanged</span>' : 
                                `<span class="addition">+${file.additions}</span> <span class="deletion">-${file.deletions}</span>`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div id="created" class="tab-content">
            ${diff.createdFiles.length === 0 ? '<p>No created files</p>' : ''}
            <div class="file-list">
                ${diff.createdFiles.map(file => `
                    <div class="file-item" onclick="openFileDiff('${file.path}')">
                        <div class="file-path">${file.path}</div>
                        <div class="file-stats">
                            <span class="addition">New file</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div id="deleted" class="tab-content">
            ${diff.deletedFiles.length === 0 ? '<p>No deleted files</p>' : ''}
            <div class="file-list">
                ${diff.deletedFiles.map(file => `
                    <div class="file-item" onclick="openFileDiff('${file.path}')">
                        <div class="file-path">${file.path}</div>
                        <div class="file-stats">
                            <span class="deletion">Deleted file</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function openTab(tabId) {
            const tabContents = document.querySelectorAll('.tab-content');
            const tabButtons = document.querySelectorAll('.tab-button');
            
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            tabButtons.forEach(button => {
                button.classList.remove('active');
            });
            
            document.getElementById(tabId).classList.add('active');
            document.querySelector(\`[onclick="openTab('\${tabId}')"]\`).classList.add('active');
        }
        
        function openFileDiff(filePath) {
            vscode.postMessage({
                command: 'openDiff',
                filePath
            });
        }
        
        function restoreCheckpoint(checkpointId) {
            vscode.postMessage({
                command: 'restoreCheckpoint',
                checkpointId
            });
        }
    </script>
</body>
</html>
`;
    }
    
    private emitEvent(event: Omit<CheckpointComparisonEvent, 'timestamp'>): void {
        this.eventEmitter.fire({
            ...event,
            timestamp: Date.now()
        });
    }
    
    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}

export interface CheckpointComparisonEvent {
    type: 'comparisonStarted' | 'comparisonCompleted' | 'comparisonError';
    fromCheckpointId: string;
    toCheckpointId: string;
    summary?: {
        filesChanged: number;
        additions: number;
        deletions: number;
        filesCreated: number;
        filesDeleted: number;
    };
    error?: string;
    timestamp: number;
} 