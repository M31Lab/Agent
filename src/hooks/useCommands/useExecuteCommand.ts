import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../../services/telemetry/telemetryService';

export interface CommandExecutionOptions {
    args?: any[];
    showErrorMessage?: boolean;
    trackTelemetry?: boolean;
    telemetryProperties?: Record<string, string>;
}

export function useExecuteCommand(
    extensionContext: ExtensionContext
): {
    executeCommand: <T>(command: string, options?: CommandExecutionOptions) => Promise<T | undefined>;
    registerCommand: (commandId: string, handler: (...args: any[]) => any) => vscode.Disposable;
} {
    const logging = extensionContext.loggingService;
    const telemetry = extensionContext.telemetryService;

    async function executeCommand<T>(
        command: string,
        options: CommandExecutionOptions = {}
    ): Promise<T | undefined> {
        const { 
            args = [], 
            showErrorMessage = true, 
            trackTelemetry = true,
            telemetryProperties = {}
        } = options;

        try {
            logging.debug(`Executing command: ${command}`);
            
            if (trackTelemetry) {
                telemetry.trackEvent('execute_command', {
                    command,
                    ...telemetryProperties
                });
            }

            return await vscode.commands.executeCommand<T>(command, ...args);
        } catch (error) {
            logging.error(`Error executing command: ${command}`, error);
            
            if (showErrorMessage) {
                vscode.window.showErrorMessage(`Failed to execute command: ${command}. ${error}`);
            }
            
            return undefined;
        }
    }

    function registerCommand(
        commandId: string,
        handler: (...args: any[]) => any
    ): vscode.Disposable {
        logging.debug(`Registering command: ${commandId}`);
        
        const disposable = vscode.commands.registerCommand(commandId, async (...args: any[]) => {
            try {
                logging.debug(`Running command: ${commandId}`);
                
                telemetry.trackEvent('command_executed', {
                    commandId
                });
                
                return await handler(...args);
            } catch (error) {
                logging.error(`Error running command: ${commandId}`, error);
                vscode.window.showErrorMessage(`Error executing command: ${error}`);
                throw error;
            }
        });
        
        return disposable;
    }

    return {
        executeCommand,
        registerCommand
    };
} 