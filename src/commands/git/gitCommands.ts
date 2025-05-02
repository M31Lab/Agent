import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { GenerateCommitMessageCommand } from './generateCommitMessageCommand';

export function registerGitCommands(context: ExtensionContext): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    // Register Generate Commit Message command
    try {
        const generateCommitMessageCommand = new GenerateCommitMessageCommand(context);
        disposables.push(generateCommitMessageCommand.register());
        context.loggingService.debug('Registered Generate Commit Message command');
    } catch (error) {
        context.loggingService.error('Failed to register Generate Commit Message command', error);
    }
    
    return disposables;
} 