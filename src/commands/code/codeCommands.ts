import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { ChatPanelProvider } from '../../components/chat/chatPanelProvider';
import { StatusBarManager } from '../../components/statusBar/statusBarManager';
import { registerCommand } from '../commandRegistry';
import { AddLogsCommand } from './addLogsCommand';
import { ShareCodeCommand } from './shareCodeCommand';

export function registerCodeCommands(
    context: ExtensionContext,
    chatPanelProvider: ChatPanelProvider, 
    statusBarManager: StatusBarManager
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    // Register Add Logs command
    try {
        const addLogsCommand = new AddLogsCommand(context);
        disposables.push(addLogsCommand.register());
        context.loggingService.debug('Registered Add Logs command');
    } catch (error) {
        context.loggingService.error('Failed to register Add Logs command', error);
    }
    
    // Register Share Code command
    try {
        const shareCodeCommand = new ShareCodeCommand(context);
        disposables.push(shareCodeCommand.register());
        context.loggingService.debug('Registered Share Code command');
    } catch (error) {
        context.loggingService.error('Failed to register Share Code command', error);
    }
    
    return disposables;
}