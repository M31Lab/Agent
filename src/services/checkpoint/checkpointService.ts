import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
    Checkpoint, 
    FileChange, 
    FileChangeDiff,
    CheckpointDiff,
    CheckpointMetrics,
    CheckpointRestoreOptions,
    defaultCheckpointRestoreOptions,
    CheckpointEvent
} from '../../models/checkpoint';
import { ExtensionContext } from '../../models/context/extensionContext';

export class CheckpointService implements vscode.Disposable {
    private static instance: CheckpointService;
    private checkpoints: Map<string, Checkpoint> = new Map();
    private readonly storageDir: string;
    private readonly workspaceRoot: string;
    private readonly eventEmitter = new vscode.EventEmitter<CheckpointEvent>();
    private readonly disposables: vscode.Disposable[] = [];
    private readonly context: ExtensionContext;
    
    public readonly onCheckpointEvent = this.eventEmitter.event;
    
    constructor(context: ExtensionContext) {
        this.context = context;
        this.storageDir = path.join(context.globalStoragePath, 'checkpoints');
        this.disposables.push(this.eventEmitter);
        
        CheckpointService.instance = this;
        
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
        
        this.loadCheckpoints();
        
        this.initialize().catch(error => {
            context.loggingService.error('Failed to initialize checkpoint service', error);
        });
    }
    
    public static getInstance(context?: ExtensionContext): CheckpointService {
        if (!CheckpointService.instance && context) {
            CheckpointService.instance = new CheckpointService(context);
        }
        
        if (!CheckpointService.instance) {
            throw new Error('CheckpointService not initialized');
        }
        
        return CheckpointService.instance;
    }
    
    public async createCheckpoint(
        name: string,
        description?: string,
        taskId?: string,
        taskStep?: number
    ): Promise<string> {
        const checkpointId = uuidv4();
        const timestamp = Date.now();
        
        const changes = await this.captureChanges();
        
        const checkpoint: Checkpoint = {
            id: checkpointId,
            name,
            description: description || '',
            timestamp,
            changes,
            taskState: taskId ? {
                id: taskId,
                currentStep: taskStep || 0,
                steps: [],
                startTime: timestamp,
                lastUpdateTime: timestamp
            } : undefined
        };
        
        this.checkpoints.set(checkpointId, checkpoint);
        
        this.saveCheckpoint(checkpoint);
        
        this.emitEvent({
            type: 'checkpointCreated',
            checkpointId,
            name,
            timestamp
        });
        
        return checkpointId;
    }
    
    public async compareCheckpoints(
        fromCheckpointId: string,
        toCheckpointId: string
    ): Promise<CheckpointDiff> {
        const fromCheckpoint = this.checkpoints.get(fromCheckpointId);
        const toCheckpoint = this.checkpoints.get(toCheckpointId);
        
        if (!fromCheckpoint) {
            throw new Error(`Checkpoint ${fromCheckpointId} not found`);
        }
        
        if (!toCheckpoint) {
            throw new Error(`Checkpoint ${toCheckpointId} not found`);
        }
        
        const tempFileChanges: FileChange[] = [];
        const processedFiles = new Set<string>();
        
        // Process changes from source checkpoint
        for (const fromChange of fromCheckpoint.changes) {
            const toChange = toCheckpoint.changes.find(c => c.path === fromChange.path);
            processedFiles.add(fromChange.path);
            
            if (!toChange) {
                // File was deleted or not present in the target checkpoint
                tempFileChanges.push({
                    path: fromChange.path,
                    oldContent: fromChange.newContent,
                    type: 'delete',
                    timestamp: toCheckpoint.timestamp
                });
            } else if (fromChange.newContent !== toChange.newContent) {
                // File was modified
                tempFileChanges.push({
                    path: fromChange.path,
                    oldContent: fromChange.newContent,
                    newContent: toChange.newContent,
                    type: 'modify',
                    timestamp: toChange.timestamp
                });
            }
        }
        
        // Process files that are only in the target checkpoint (new files)
        for (const toChange of toCheckpoint.changes) {
            if (!processedFiles.has(toChange.path)) {
                tempFileChanges.push({
                    path: toChange.path,
                    newContent: toChange.newContent,
                    type: 'create',
                    timestamp: toChange.timestamp
                });
            }
        }
        
        // Convert FileChange[] to FileChangeDiff[]
        const fileChanges: FileChangeDiff[] = tempFileChanges.map(change => {
            const diffChange: FileChangeDiff = {
                path: change.path,
                type: change.type === 'create' ? 'added' : 
                      change.type === 'modify' ? 'modified' : 'deleted',
                oldContent: change.oldContent,
                newContent: change.newContent
            };
            return diffChange;
        });
        
        // Separate changes by type
        const createdFiles = fileChanges.filter(change => change.type === 'added');
        const deletedFiles = fileChanges.filter(change => change.type === 'deleted');
        const changedFiles = fileChanges.filter(change => change.type === 'modified').map(change => {
            // Calculate additions and deletions if needed
            const oldLines = change.oldContent?.split('\n').length || 0;
            const newLines = change.newContent?.split('\n').length || 0;
            return {
                ...change,
                additions: newLines > oldLines ? newLines - oldLines : 0,
                deletions: oldLines > newLines ? oldLines - newLines : 0
            };
        });
        
        const diff: CheckpointDiff = {
            id: uuidv4(),
            fromCheckpointId,
            toCheckpointId,
            fileChanges,
            changedFiles,
            createdFiles,
            deletedFiles,
            timestamp: Date.now()
        };
        
        return diff;
    }
    
    public async compareWithCurrent(checkpointId: string): Promise<CheckpointDiff> {
        const checkpoint = this.checkpoints.get(checkpointId);
        
        if (!checkpoint) {
            throw new Error(`Checkpoint ${checkpointId} not found`);
        }
        
        const currentChanges = await this.captureChanges();
        
        const tempFileChanges: FileChange[] = [];
        const processedFiles = new Set<string>();
        
        // Process changes from checkpoint
        for (const checkpointChange of checkpoint.changes) {
            const currentChange = currentChanges.find(c => c.path === checkpointChange.path);
            processedFiles.add(checkpointChange.path);
            
            if (!currentChange) {
                // File was deleted since checkpoint
                tempFileChanges.push({
                    path: checkpointChange.path,
                    oldContent: checkpointChange.newContent,
                    type: 'delete',
                    timestamp: Date.now()
                });
            } else if (checkpointChange.newContent !== currentChange.newContent) {
                // File was modified
                tempFileChanges.push({
                    path: checkpointChange.path,
                    oldContent: checkpointChange.newContent,
                    newContent: currentChange.newContent,
                    type: 'modify',
                    timestamp: currentChange.timestamp
                });
            }
        }
        
        // Process files that are only in the current state (new files)
        for (const currentChange of currentChanges) {
            if (!processedFiles.has(currentChange.path)) {
                tempFileChanges.push({
                    path: currentChange.path,
                    newContent: currentChange.newContent,
                    type: 'create',
                    timestamp: currentChange.timestamp
                });
            }
        }
        
        // Convert FileChange[] to FileChangeDiff[]
        const fileChanges: FileChangeDiff[] = tempFileChanges.map(change => {
            const diffChange: FileChangeDiff = {
                path: change.path,
                type: change.type === 'create' ? 'added' : 
                      change.type === 'modify' ? 'modified' : 'deleted',
                oldContent: change.oldContent,
                newContent: change.newContent
            };
            return diffChange;
        });
        
        // Separate changes by type
        const createdFiles = fileChanges.filter(change => change.type === 'added');
        const deletedFiles = fileChanges.filter(change => change.type === 'deleted');
        const changedFiles = fileChanges.filter(change => change.type === 'modified').map(change => {
            // Calculate additions and deletions if needed
            const oldLines = change.oldContent?.split('\n').length || 0;
            const newLines = change.newContent?.split('\n').length || 0;
            return {
                ...change,
                additions: newLines > oldLines ? newLines - oldLines : 0,
                deletions: oldLines > newLines ? oldLines - newLines : 0
            };
        });
        
        const diff: CheckpointDiff = {
            id: uuidv4(),
            fromCheckpointId: checkpointId,
            toCheckpointId: 'current',
            fileChanges,
            changedFiles,
            createdFiles,
            deletedFiles,
            timestamp: Date.now()
        };
        
        return diff;
    }
    
    public async restoreCheckpoint(
        checkpointId: string,
        options: Partial<CheckpointRestoreOptions> = {}
    ): Promise<boolean> {
        const checkpoint = this.checkpoints.get(checkpointId);
        
        if (!checkpoint) {
            throw new Error(`Checkpoint ${checkpointId} not found`);
        }
        
        const mergedOptions: CheckpointRestoreOptions = {
            ...defaultCheckpointRestoreOptions,
            ...options
        };
        
        const confirmRestore = await vscode.window.showWarningMessage(
            `Restore workspace to checkpoint "${checkpoint.name}"?`,
            { modal: true },
            'Restore',
            'Cancel'
        );
        
        if (confirmRestore !== 'Restore') {
            return false;
        }
        
        try {
            // Create a backup of current state
            const backupId = await this.createCheckpoint(
                `Backup before restoring ${checkpoint.name}`,
                `Automatic backup created before restoring checkpoint ${checkpoint.id}`
            );
            
            // Apply the changes from the checkpoint
            for (const change of checkpoint.changes) {
                const filePath = path.join(this.workspaceRoot, change.path);
                const dirPath = path.dirname(filePath);
                
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }
                
                if (change.newContent !== undefined) {
                    fs.writeFileSync(filePath, change.newContent, 'utf8');
                } else if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            
            // Restore task state if option is enabled
            if (mergedOptions.restoreTaskState && checkpoint.taskState) {
                // Task state restoration logic would go here
                this.context.loggingService.debug('Restoring task state from checkpoint', checkpoint.taskState);
            }
            
            // Restore terminal state if option is enabled
            if (mergedOptions.restoreTerminalState) {
                // Terminal state restoration logic would go here
                this.context.loggingService.debug('Restoring terminal state from checkpoint');
            }
            
            // Restore editor state if option is enabled
            if (mergedOptions.restoreEditorState) {
                // Editor state restoration logic would go here
                this.context.loggingService.debug('Restoring editor state from checkpoint');
            }
            
            this.emitEvent({
                type: 'checkpointRestored',
                checkpointId,
                name: checkpoint.name,
                backupCheckpointId: backupId,
                timestamp: Date.now(),
                options: mergedOptions
            });
            
            return true;
        } catch (error) {
            this.emitEvent({
                type: 'error',
                error: error instanceof Error ? error.message : String(error),
                checkpointId,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }
    
    public deleteCheckpoint(checkpointId: string): boolean {
        const checkpoint = this.checkpoints.get(checkpointId);
        
        if (!checkpoint) {
            return false;
        }
        
        this.checkpoints.delete(checkpointId);
        
        const checkpointFile = path.join(this.storageDir, `${checkpointId}.json`);
        if (fs.existsSync(checkpointFile)) {
            fs.unlinkSync(checkpointFile);
        }
        
        this.emitEvent({
            type: 'checkpointDeleted',
            checkpointId,
            name: checkpoint.name,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    public getCheckpoint(id: string): Checkpoint | undefined {
        return this.checkpoints.get(id);
    }
    
    public getCheckpointById(id: string): Checkpoint | undefined {
        return this.getCheckpoint(id);
    }
    
    public getAllCheckpoints(): Checkpoint[] {
        return Array.from(this.checkpoints.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    
    public getTaskCheckpoints(taskId: string): Checkpoint[] {
        return this.getAllCheckpoints()
            .filter(checkpoint => checkpoint.taskState?.id === taskId)
            .sort((a, b) => (a.taskState?.currentStep ?? 0) - (b.taskState?.currentStep ?? 0));
    }
    
    public getCheckpointMetrics(checkpointId: string): CheckpointMetrics {
        const checkpoint = this.checkpoints.get(checkpointId);
        
        if (!checkpoint) {
            throw new Error(`Checkpoint ${checkpointId} not found`);
        }
        
        let linesAdded = 0;
        let linesRemoved = 0;
        let filesCreated = 0;
        let filesDeleted = 0;
        let filesModified = 0;
        
        for (const change of checkpoint.changes) {
            if (change.oldContent === undefined && change.newContent !== undefined) {
                filesCreated++;
                linesAdded += change.newContent.split('\n').length;
            } else if (change.oldContent !== undefined && change.newContent === undefined) {
                filesDeleted++;
                linesRemoved += change.oldContent.split('\n').length;
            } else if (change.oldContent !== undefined && change.newContent !== undefined) {
                filesModified++;
                
                const oldLines = change.oldContent.split('\n').length;
                const newLines = change.newContent.split('\n').length;
                
                if (newLines > oldLines) {
                    linesAdded += (newLines - oldLines);
                } else {
                    linesRemoved += (oldLines - newLines);
                }
            }
        }
        
        return {
            totalFiles: filesCreated + filesDeleted + filesModified,
            addedLines: linesAdded,
            removedLines: linesRemoved,
            createdFiles: filesCreated,
            deletedFiles: filesDeleted,
            modifiedFiles: filesModified,
            totalLines: linesAdded + linesRemoved
        };
    }
    
    private async captureChanges(): Promise<FileChange[]> {
        const changes: FileChange[] = [];
        
        if (!this.workspaceRoot) {
            return changes;
        }
        
        const includePatterns = vscode.workspace.getConfiguration('m31-agent')
            .get<string[]>('checkpoint.includePatterns', ['**/*']);
        
        const excludePatterns = vscode.workspace.getConfiguration('m31-agent')
            .get<string[]>('checkpoint.excludePatterns', [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/build/**',
                '**/.vscode/**'
            ]);
        
        const files = await vscode.workspace.findFiles(
            `{${includePatterns.join(',')}}`,
            `{${excludePatterns.join(',')}}`
        );
        
        for (const file of files) {
            try {
                const relativePath = path.relative(this.workspaceRoot, file.fsPath);
                
                // Skip binary files and files that are too large
                const stats = fs.statSync(file.fsPath);
                if (stats.size > 1024 * 1024) { // Skip files larger than 1MB
                    continue;
                }
                
                const content = fs.readFileSync(file.fsPath, 'utf8');
                
                changes.push({
                    path: relativePath,
                    newContent: content,
                    type: 'modify',
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error(`Error reading file ${file.fsPath}:`, error);
            }
        }
        
        return changes;
    }
    
    private saveCheckpoint(checkpoint: Checkpoint): void {
        const filePath = path.join(this.storageDir, `${checkpoint.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf8');
    }
    
    private async initialize(): Promise<void> {
        // Any initialization logic can go here
        // For now, this is just a placeholder since the method is called in the constructor
    }
    
    private loadCheckpoints(): void {
        try {
            const files = fs.readdirSync(this.storageDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.storageDir, file);
                        const content = fs.readFileSync(filePath, 'utf8');
                        const checkpoint = JSON.parse(content) as Checkpoint;
                        
                        this.checkpoints.set(checkpoint.id, checkpoint);
                    } catch (error) {
                        console.error(`Error loading checkpoint from ${file}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading checkpoints:', error);
        }
    }
    
    private emitEvent(event: CheckpointEvent): void {
        this.eventEmitter.fire(event);
    }
    
    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}