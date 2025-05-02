import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { TerminalService } from '../../services/terminal/terminalService';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { AIRequestType } from '../../models/ai/aiRequestType';

export function RegisterRunCommandCommand(
    context: ExtensionContext,
    dependencies: CommandDependencies
): void {
    const command = vscode.commands.registerCommand('m31-agent.runCommand', async () => {
        try {
            // Get terminal service
            const terminalService = TerminalService.getInstance();
            if (!terminalService) {
                throw new Error('Terminal service is not initialized');
            }
            
            // Get API client
            const apiClient = OpenRouterApiClient.getInstance();
            
            // Show status bar as busy
            dependencies.statusBarManager.showBusy('Getting command');
            
            // Get command from user
            const inputCommand = await vscode.window.showInputBox({
                prompt: 'Enter the command to run or describe what you want to do',
                placeHolder: 'e.g., List files, Find text in files, git status',
                ignoreFocusOut: true
            });
            
            if (!inputCommand) {
                dependencies.statusBarManager.showReady();
                return;
            }
            
            // Check if this is a direct command or a description
            const isDirectCommand = isLikelyTerminalCommand(inputCommand);
            let commandToRun = inputCommand;
            
            // If it's a description, use AI to generate the actual command
            if (!isDirectCommand) {
                dependencies.statusBarManager.showBusy('Generating command');
                
                try {
                    // Get operating system info for context
                    const platform = process.platform;
                    let osInfo = 'Linux/Unix';
                    
                    if (platform === 'win32') {
                        osInfo = 'Windows';
                    } else if (platform === 'darwin') {
                        osInfo = 'macOS';
                    }
                    
                    // Call AI to get a command for the description
                    const response = await apiClient.sendRequest({
                        requestType: AIRequestType.CodeGeneration,
                        messages: [
                            {
                                role: 'system',
                                content: `You are a command-line expert that generates shell commands for ${osInfo} systems.
                                Given a natural language description, provide ONLY the command with no explanation or markdown formatting.
                                Always return a valid shell command with no additional text.`
                            },
                            {
                                role: 'user',
                                content: `Generate a command to: ${inputCommand}`
                            }
                        ]
                    });
                    
                    // Clean up any markdown or extra text that might be in the response
                    commandToRun = response.content.trim();
                    
                    // Remove markdown code block formatting if present
                    const codeBlockPattern = /```(?:\w*\n)?([\s\S]*?)```/;
                    const match = commandToRun.match(codeBlockPattern);
                    if (match) {
                        commandToRun = match[1].trim();
                    }
                    
                    context.loggingService.debug(`Generated command: ${commandToRun} from description: ${inputCommand}`);
                } catch (error) {
                    context.loggingService.error('Error generating command from description', error);
                    vscode.window.showErrorMessage('Failed to generate command from description');
                    dependencies.statusBarManager.showReady();
                    return;
                }
            }
            
            // Ask user for confirmation before running the command
            const confirmation = await vscode.window.showWarningMessage(
                `Are you sure you want to run: ${commandToRun}`,
                { modal: true, detail: 'Running terminal commands can modify your system' },
                'Run', 'Edit', 'Cancel'
            );
            
            if (confirmation === 'Cancel' || !confirmation) {
                dependencies.statusBarManager.showReady();
                return;
            }
            
            if (confirmation === 'Edit') {
                const editedCommand = await vscode.window.showInputBox({
                    prompt: 'Edit the command before running',
                    value: commandToRun,
                    ignoreFocusOut: true
                });
                
                if (!editedCommand) {
                    dependencies.statusBarManager.showReady();
                    return;
                }
                
                commandToRun = editedCommand;
            }
            
            // Prepare to run command
            dependencies.statusBarManager.showBusy(`Running: ${commandToRun}`);
            
            // Run the command in a terminal
            await terminalService.executeCommand(commandToRun);
            
            // Track command execution
            context.telemetryService.trackEvent('command_executed', {
                wasGenerated: (!isDirectCommand).toString()
            });
            
            // Show success
            dependencies.statusBarManager.showReady();
            context.loggingService.info(`Executed command: ${commandToRun}`);
        } catch (error) {
            context.loggingService.error('Failed to run command', error);
            vscode.window.showErrorMessage(`Failed to run command: ${error instanceof Error ? error.message : String(error)}`);
            dependencies.statusBarManager.showError('Failed');
        }
    });
    
    context.registerDisposable(command);
}

/**
 * Heuristically determines if the input is likely a direct terminal command
 * or a natural language description of what to do.
 */
function isLikelyTerminalCommand(input: string): boolean {
    // Basic detection of whether this looks like a command
    // If it contains spaces and the first word is a common command
    const firstWord = input.trim().split(' ')[0].toLowerCase();
    
    // List of common terminal commands
    const commonCommands = [
        'ls', 'dir', 'cd', 'rm', 'cp', 'mv', 'cat', 'echo', 'grep', 
        'find', 'git', 'npm', 'node', 'python', 'pip', 'mkdir', 
        'touch', 'chmod', 'curl', 'wget', 'ssh', 'sudo', 'ps',
        'kill', 'apt', 'brew', 'code', 'make', 'docker', 'kubectl'
    ];
    
    // Check if starts with common command syntax
    if (commonCommands.includes(firstWord)) {
        return true;
    }
    
    // Check if it contains natural language patterns
    const naturalLanguagePatterns = [
        'how to', 'can you', 'please', 'help', 'find', 'search', 
        'list', 'show me', 'display', 'what is', 'where is'
    ];
    
    for (const pattern of naturalLanguagePatterns) {
        if (input.toLowerCase().includes(pattern)) {
            return false;
        }
    }
    
    // Check for command line syntax patterns
    const commandPatterns = [
        '|', '>', '>>', '<', '&&', ';', '--', '-', '/',
        '*', '?', '~', '$', '`', '{}', '[]'
    ];
    
    for (const pattern of commandPatterns) {
        if (input.includes(pattern)) {
            return true;
        }
    }
    
    // Default to considering longer inputs as descriptions rather than commands
    return input.length < 20;
}