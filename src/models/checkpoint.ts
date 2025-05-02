export interface FileChange {
    path: string;
    type: 'create' | 'modify' | 'delete';
    oldContent?: string;
    newContent?: string;
    timestamp?: number;
    changeType?: string; // For backward compatibility
}

export interface Checkpoint {
    id: string;
    name: string;
    description: string;
    timestamp: number;
    changes: FileChange[];
    taskState?: TaskState;
    terminalState?: TerminalState;
    editorState?: EditorState;
    metrics?: CheckpointMetrics;
}

export interface TaskState {
    id: string;
    currentStep: number;
    steps: TaskStep[];
    startTime: number;
    lastUpdateTime: number;
}

export interface TaskStep {
    id: string;
    type: 'file' | 'terminal' | 'browser' | 'other';
    action: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
    details?: Record<string, unknown>;
}

export interface TerminalState {
    sessions: TerminalSession[];
}

export interface TerminalSession {
    id: string;
    name: string;
    cwd: string;
    commands: TerminalCommand[];
}

export interface TerminalCommand {
    id: string;
    command: string;
    output: string;
    exitCode?: number;
    startTime: number;
    endTime?: number;
}

export interface EditorState {
    openFiles: string[];
    viewColumn: number;
    selections: EditorSelection[];
}

export interface EditorSelection {
    filePath: string;
    selection: {
        startLine: number;
        startCharacter: number;
        endLine: number;
        endCharacter: number;
    };
}

export interface CheckpointDiff {
    id: string;
    fromCheckpointId: string;
    toCheckpointId: string;
    timestamp: number;
    fileChanges: FileChangeDiff[];
    changedFiles: Array<FileChangeDiff & { additions?: number; deletions?: number }>;
    createdFiles: FileChangeDiff[];
    deletedFiles: FileChangeDiff[];
}

export interface FileChangeDiff {
    path: string;
    type: 'added' | 'modified' | 'deleted';
    diff?: string;
    content?: string;
    oldContent?: string;
    newContent?: string;
    unchanged?: boolean;
}

export interface CheckpointRestoreOptions {
    restoreTaskState: boolean;
    restoreTerminalState: boolean;
    restoreEditorState: boolean;
}

export const defaultCheckpointRestoreOptions: CheckpointRestoreOptions = {
    restoreTaskState: true,
    restoreTerminalState: false,
    restoreEditorState: true
};

export interface CheckpointMetrics {
    totalFiles: number;
    createdFiles: number;
    modifiedFiles: number;
    deletedFiles: number;
    totalLines: number;
    addedLines: number;
    removedLines: number;
}

export type CheckpointEventType = 
    | 'checkpointCreated'
    | 'checkpointRestored'
    | 'checkpointCompared'
    | 'checkpointDeleted'
    | 'error';

export interface CheckpointEvent {
    type: CheckpointEventType;
    checkpointId: string;
    name?: string;
    backupCheckpointId?: string;
    error?: string;
    timestamp: number;
    options?: CheckpointRestoreOptions;
} 