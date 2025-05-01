import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';

export function RegisterShowChatPanelCommand(
    context: ExtensionContext,
    dependencies: CommandDependencies
): void {
    const command = vscode.commands.registerCommand('m31-agent.showChatPanel', async () => {
        try {
            // Create and reveal the chat webview panel
            dependencies.chatPanelProvider.createOrShowPanel();
            
            // Update status bar with active state
            dependencies.statusBarManager.updateStatusBar(true);
            
            // Track command usage
            context.telemetryService.trackEvent('chat_panel_opened');
            
            context.loggingService.info('Chat panel opened');
        } catch (error) {
            context.loggingService.error('Failed to open chat panel', error);
            vscode.window.showErrorMessage('Failed to open M31-Agent chat panel');
        }
    });
    
    context.registerDisposable(command);
} 