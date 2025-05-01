import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { StatusBarManager } from '../../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../../components/chat/chatPanelProvider';
import { registerCommand } from '../commandRegistry';

export function registerNavigationCommands(
    context: ExtensionContext,
    chatPanelProvider: ChatPanelProvider,
    statusBarManager: StatusBarManager
): void {
    context.loggingService.debug('Registering navigation commands');

    // AI-assisted codebase navigation
    registerCommand(
        context,
        'm31-agent.navigateCodebase',
        async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'What are you looking for in the codebase?',
                placeHolder: 'E.g., "Find where user authentication is implemented"'
            });

            if (!query) {
                return;
            }

            statusBarManager.setLoadingState('Searching codebase');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Help me navigate this codebase. I'm looking for: ${query}\n\nPlease analyze the project structure and suggest relevant files or code locations.`
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('navigate_codebase', {
                    queryLength: query.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to process navigation query');
                vscode.window.showErrorMessage(`Failed to process navigation query: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // Search for files based on description
    registerCommand(
        context,
        'm31-agent.findFile',
        async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'Describe the file you\'re looking for',
                placeHolder: 'E.g., "Configuration file for authentication"'
            });

            if (!query) {
                return;
            }

            statusBarManager.setLoadingState('Searching for files');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Help me find a file in this codebase that matches this description: ${query}\n\nPlease suggest the most likely file paths and explain why they match.`
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('find_file', {
                    queryLength: query.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to search for files');
                vscode.window.showErrorMessage(`Failed to search for files: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // Find code matching a description
    registerCommand(
        context,
        'm31-agent.findCode',
        async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'Describe the code you\'re looking for',
                placeHolder: 'E.g., "Function that handles user registration"'
            });

            if (!query) {
                return;
            }

            statusBarManager.setLoadingState('Searching for code');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Help me find code in this codebase that matches this description: ${query}\n\nPlease list the most relevant code locations with file paths and line numbers if possible.`
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('find_code', {
                    queryLength: query.length.toString()
                });
            } catch (error) {
                statusBarManager.setErrorState('Failed to search for code');
                vscode.window.showErrorMessage(`Failed to search for code: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );

    // Create project overview
    registerCommand(
        context,
        'm31-agent.projectOverview',
        async () => {
            statusBarManager.setLoadingState('Analyzing project structure');
            
            try {
                await chatPanelProvider.show();
                await chatPanelProvider.sendMessage(
                    `Analyze this project and provide a comprehensive overview. Include information about:\n\n1. Project structure\n2. Key components and their purposes\n3. Technologies used\n4. Main entry points\n5. Architecture patterns\n\nPlease be as detailed as possible.`
                );
                
                statusBarManager.setDefaultState();
                context.telemetryService.trackEvent('project_overview_requested');
            } catch (error) {
                statusBarManager.setErrorState('Failed to generate project overview');
                vscode.window.showErrorMessage(`Failed to generate project overview: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );
} 