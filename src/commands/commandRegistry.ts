import * as vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { StatusBarManager } from '../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../components/chat/chatPanelProvider';
import { registerChatCommands } from './chat/chatCommands';
import { registerSettingsCommands } from './settings/settingsCommands';
import { registerCodeCommands } from './code/codeCommands';
import { registerTerminalCommands } from './terminal/terminalCommands';
import { registerNavigationCommands } from './navigation/navigationCommands';
import { registerWebSearchCommands } from './websearch/webSearchCommands';
import { registerCheckpointComparisonCommands } from './checkpoint/checkpointComparisonCommands';
import { registerDiagnosticsMonitoringCommands } from './diagnostics/diagnosticsMonitoringCommands';
import { registerMcpCommands } from './mcp/mcpToolCommands';
import { registerCodeAnalysisCommands } from './codeAnalysis/codeAnalysisCommands';
import { registerGitCommands } from './git/gitCommands';

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
    
    // Register new command groups
    registerWebSearchCommands(context);
    registerCheckpointComparisonCommands(context);
    registerDiagnosticsMonitoringCommands(context);
    registerMcpCommands(context);
    registerCodeAnalysisCommands(context);

    // Register Git commands
    registerGitCommands(context).forEach(disposable => {
        context.registerDisposable(disposable);
    });
    
    // Register code feature commands (add logs, share code)
    try {
        const codeCommandsPath = './code/codeCommands';
        // Dynamic import to avoid circular dependencies
        import(codeCommandsPath).then(module => {
            const codeCommands = module.registerCodeCommands(context);
            codeCommands.forEach(disposable => {
                context.registerDisposable(disposable);
            });
            context.loggingService.debug('Registered code feature commands');
        }).catch(error => {
            context.loggingService.error('Failed to register code feature commands', error);
        });
    } catch (error) {
        context.loggingService.error('Failed to import code commands module', error);
    }

    context.loggingService.info('All extension commands registered');
    context.telemetryService.trackEvent('commands_registered');
}

export function registerCommand(
    context: ExtensionContext,
    commandId: string,
    callback: (...args: unknown[][]) => unknown[],
    thisArg?: unknown
): vscode.Disposable {
    context.loggingService.debug(`Registering command: ${commandId}`);
    
    const wrappedCallback = async (...args: unknown[][]): Promise<void>  => {
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
    ...args: unknown[][]
): Promise<Promise<unknown>> {
    try {
        return await vscode.commands.executeCommand(commandId, ...args);
    } catch (error) {
        throw new Error(`Failed to execute VS Code command '${commandId}': ${error instanceof Error ? error.message : String(error)}`);
    }
} 