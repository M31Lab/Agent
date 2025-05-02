export interface TerminalCommand {
    id: string;
    command: string;
    directory?: string;
    description?: string;
    isBackground: boolean;
    requireConfirmation: boolean;
    createdAt: number;
}

export interface TerminalCommandResult {
    id: string;
    command: string;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    isRunning: boolean;
    startTime: number;
    endTime?: number;
    error?: string;
}

export enum TerminalOutputType {
    Stdout = 'stdout',
    Stderr = 'stderr',
    Error = 'error',
    Info = 'info'
}

export interface TerminalOutput {
    commandId: string;
    type: TerminalOutputType;
    text: string;
    timestamp: number;
}

export interface TerminalSession {
    id: string;
    name?: string;
    status: 'idle' | 'running' | 'error';
    currentCommand?: TerminalCommand;
    currentDirectory: string;
    history: TerminalCommand[];
    outputs: TerminalOutput[];
    createdAt: number;
    lastActivity: number;
}

export interface TerminalOptions {
    shellPath?: string;
    shellArgs?: string[];
    cwd?: string;
    env?: Record<string, string>;
    autoRestart?: boolean;
    closeOnExit?: boolean;
}

export type TerminalEventType = 
    | 'sessionCreated'
    | 'sessionClosed'
    | 'commandStarted'
    | 'commandCompleted'
    | 'commandCancelled'
    | 'commandBackgrounded'
    | 'terminalOutput'
    | 'terminalClosed';

export interface TerminalEvent {
    type: TerminalEventType;
    sessionId: string;
    command?: TerminalCommand;
    result?: TerminalCommandResult;
    output?: TerminalOutput;
    timestamp: number;
}