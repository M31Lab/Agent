import * as vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { StatusBarManager } from '../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../components/chat/chatPanelProvider';
import { registerChatCommands } from './chat/chatCommands';
import { registerSettingsCommands } from './settings/settingsCommands';
import { registerCodeCommands } from './code/codeCommands';
import { registerTerminalCommands } from './terminal/terminalCommands';
import { registerNavigationCommands } from './navigation/navigationCommands';

export interface CommandDependencies {
    statusBarManager: StatusBarManager;
    chatPanelProvider: ChatPanelProvider;
}

export function registerAllCommands(
    context: ExtensionContext, 
    dependencies: CommandDependencies
): void {
    const { statusBarManager, chatPanelProvider } = dependencies;

    context.loggingService.info('Registering extension commands');

    // Register all command groups
    registerChatCommands(context, chatPanelProvider, statusBarManager);
    registerSettingsCommands(context, statusBarManager);
    registerCodeCommands(context, chatPanelProvider, statusBarManager);
    registerTerminalCommands(context, chatPanelProvider, statusBarManager);
    registerNavigationCommands(context, chatPanelProvider, statusBarManager);

    context.loggingService.info('All extension commands registered');
    context.telemetryService.trackEvent('commands_registered');
}

export function registerCommand(
    context: ExtensionContext,
    commandId: string,
    callback: (...args: any[]) => any,
    thisArg?: any
): vscode.Disposable {
    context.loggingService.debug(`Registering command: ${commandId}`);
    
    const wrappedCallback = async (...args: any[]) => {
        try {
            context.loggingService.debug(`Executing command: ${commandId}`);
            context.telemetryService.trackEvent('command_executed', { command: commandId });
            return await callback.apply(thisArg, args);
        } catch (error) {
            context.loggingService.error(`Error executing command: ${commandId}`, error);
            vscode.window.showErrorMessage(`Error executing command: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    };

    const disposable = vscode.commands.registerCommand(commandId, wrappedCallback);
    context.registerDisposable(disposable);
    
    return disposable;
}

export async function executeVSCodeCommand(
    commandId: string, 
    ...args: any[]
): Promise<any> {
    try {
        return await vscode.commands.executeCommand(commandId, ...args);
    } catch (error) {
        throw new Error(`Failed to execute VS Code command '${commandId}': ${error instanceof Error ? error.message : String(error)}`);
    }
} 