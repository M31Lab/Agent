import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { TerminalService, CommandResult } from '../../services/terminal/terminalService';

export interface TerminalExecutionOptions {
    showTerminal?: boolean;
    captureOutput?: boolean;
    name?: string;
    cwd?: string;
    env?: Record<string, string>;
    requireConfirmation?: boolean;
}

export function useTerminalCommand(
    extensionContext: ExtensionContext
): {
    executeCommand: (command: string, options?: TerminalExecutionOptions) => Promise<string>;
    executeCommandWithResult: (command: string, options?: TerminalExecutionOptions) => Promise<CommandResult>;
    runInTerminal: (text: string, terminalName?: string) => Promise<void>;
    killProcess: () => Promise<void>;
    createTerminal: (name?: string, cwd?: string, env?: Record<string, string>) => vscode.Terminal;
} {
    const logging = extensionContext.loggingService;
    const telemetry = extensionContext.telemetryService;
    const configService = extensionContext.configurationService;
    
    // Get the terminal service instance
    const terminalService = TerminalService.getInstance(extensionContext);

    async function executeCommand(command: string, options: TerminalExecutionOptions = {}): Promise<string> {
        const { 
            showTerminal = true, 
            captureOutput = true, 
            name = 'M31 Agent', 
            requireConfirmation
        } = options;
        
        logging.debug(`Executing command: ${command}`);
        
        // Check if confirmation is required
        const shouldConfirm = requireConfirmation ?? configService.isRequireConfirmation();
        
        if (shouldConfirm) {
            const confirmation = await vscode.window.showWarningMessage(
                `Execute the following command?\n${command}`,
                { modal: true },
                'Yes', 'No'
            );
            
            if (confirmation !== 'Yes') {
                logging.info('Command execution cancelled by user');
                return '';
            }
        }
        
        try {
            telemetry.trackEvent('terminal_command_executed', {
                commandLength: command.length.toString()
            });
            
            // Execute the command
            return await terminalService.executeCommand(command, captureOutput);
        } catch (error) {
            logging.error(`Error executing command: ${error}`);
            vscode.window.showErrorMessage(`Failed to execute command: ${error}`);
            return '';
        }
    }
    
    async function executeCommandWithResult(command: string, options: TerminalExecutionOptions = {}): Promise<CommandResult> {
        const { 
            requireConfirmation, 
            captureOutput = true 
        } = options;
        
        logging.debug(`Executing command with result: ${command}`);
        
        // Check if confirmation is required
        const shouldConfirm = requireConfirmation ?? configService.isRequireConfirmation();
        
        if (shouldConfirm) {
            const confirmation = await vscode.window.showWarningMessage(
                `Execute the following command?\n${command}`,
                { modal: true },
                'Yes', 'No'
            );
            
            if (confirmation !== 'Yes') {
                logging.info('Command execution cancelled by user');
                return { output: '', exitCode: null };
            }
        }
        
        try {
            telemetry.trackEvent('terminal_command_executed', {
                commandLength: command.length.toString()
            });
            
            // Execute the command
            return await terminalService.executeCommandWithOutput(command);
        } catch (error) {
            logging.error(`Error executing command: ${error}`);
            vscode.window.showErrorMessage(`Failed to execute command: ${error}`);
            return { output: `Error: ${error}`, exitCode: 1 };
        }
    }
    
    async function runInTerminal(text: string, terminalName?: string): Promise<void> {
        try {
            await terminalService.runInTerminal(text);
            logging.debug(`Text executed in terminal: ${text.length} characters`);
            
            telemetry.trackEvent('text_executed_in_terminal', {
                textLength: text.length.toString()
            });
        } catch (error) {
            logging.error(`Error running text in terminal: ${error}`);
            vscode.window.showErrorMessage(`Failed to run text in terminal: ${error}`);
        }
    }
    
    async function killProcess(): Promise<void> {
        try {
            await terminalService.killRunningProcess();
            logging.debug('Sent kill signal to terminal process');
        } catch (error) {
            logging.error(`Error killing process: ${error}`);
        }
    }
    
    function createTerminal(name?: string, cwd?: string, env?: Record<string, string>): vscode.Terminal {
        const terminal = terminalService.createTerminal(name || 'M31 Agent');
        logging.debug(`Created terminal: ${name || 'M31 Agent'}`);
        
        telemetry.trackEvent('terminal_created');
        
        return terminal;
    }
    
    return {
        executeCommand,
        executeCommandWithResult,
        runInTerminal,
        killProcess,
        createTerminal
    };
} 