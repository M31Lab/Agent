import * as vscode from 'vscode';
import { Disposable } from 'vscode';
import { TerminalCommandResult } from '../../../models/terminal/terminalCommandResult';

export interface ITerminalService extends Disposable {
    getOrCreateTerminal(): vscode.Terminal;
    showTerminal(): void;
    executeCommand(command: string, showTerminal?: boolean): void;
    executeCommandWithConfirmation(command: string): Promise<boolean>;
    executeCommandAndCaptureOutput(command: string): Promise<TerminalCommandResult>;
} 