export interface TerminalCommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
    canceled: boolean;
} 