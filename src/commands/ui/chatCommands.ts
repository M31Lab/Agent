import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';

export function registerChatCommands(
    context: ExtensionContext,
    dependencies: CommandDependencies
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    const { chatPanelProvider } = dependencies;

    // Show Chat Panel command
    const showChatPanel = vscode.commands.registerCommand('m31-agent.showChatPanel', () => {
        context.loggingService.info('Executing command: m31-agent.showChatPanel');
        context.telemetryService.trackCommand('showChatPanel');
        
        chatPanelProvider.showPanel();
    });
    disposables.push(showChatPanel);

    // Clear Chat command
    const clearChat = vscode.commands.registerCommand('m31-agent.clearChat', () => {
        context.loggingService.info('Executing command: m31-agent.clearChat');
        context.telemetryService.trackCommand('clearChat');
        
        chatPanelProvider.clearChat();
    });
    disposables.push(clearChat);

    // Focus Input command
    const focusInput = vscode.commands.registerCommand('m31-agent.focusInput', () => {
        context.loggingService.info('Executing command: m31-agent.focusInput');
        context.telemetryService.trackCommand('focusInput');
        
        chatPanelProvider.focusInput();
    });
    disposables.push(focusInput);

    return disposables;
} 