import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { AuthenticationService } from '../../services/authentication/authenticationService';
import { ConfigurationService } from '../../services/configuration/configurationService';

export function registerSettingsCommands(
    context: ExtensionContext,
    dependencies: CommandDependencies
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    // Configure Settings command
    const configureSettings = vscode.commands.registerCommand('m31-agent.configureSettings', async () => {
        context.loggingService.info('Executing command: m31-agent.configureSettings');
        context.telemetryService.trackCommand('configureSettings');
        
        const options = [
            'Configure API Key',
            'Select AI Model',
            'Configure AI Parameters',
            'Toggle Telemetry',
            'View Logs'
        ];
        
        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select a setting to configure'
        });
        
        if (!selection) {
            return;
        }
        
        switch (selection) {
            case 'Configure API Key':
                await configureApiKey(context);
                break;
            case 'Select AI Model':
                await selectAiModel(context);
                break;
            case 'Configure AI Parameters':
                configureAiParameters(context);
                break;
            case 'Toggle Telemetry':
                toggleTelemetry(context);
                break;
            case 'View Logs':
                viewLogs(context);
                break;
        }
    });
    disposables.push(configureSettings);

    return disposables;
}

async function configureApiKey(context: ExtensionContext): Promise<void> {
    const authService = AuthenticationService.getInstance();
    if (!authService) {
        vscode.window.showErrorMessage('Authentication service not initialized');
        return;
    }
    
    await authService.promptForAuthentication();
}

async function selectAiModel(context: ExtensionContext): Promise<void> {
    const configService = ConfigurationService.getInstance();
    if (!configService) {
        vscode.window.showErrorMessage('Configuration service not initialized');
        return;
    }
    
    const models = [
        'openai/gpt-4o',
        'openai/gpt-4-turbo',
        'openai/gpt-3.5-turbo',
        'anthropic/claude-3-opus',
        'anthropic/claude-3-sonnet',
        'anthropic/claude-3-haiku',
        'google/gemini-pro'
    ];
    
    const currentModel = configService.getModelId();
    
    const selection = await vscode.window.showQuickPick(models, {
        placeHolder: 'Select an AI model',
        activeItems: [currentModel]
    });
    
    if (!selection) {
        return;
    }
    
    await vscode.workspace.getConfiguration('m31-agent').update('modelId', selection, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`AI model set to ${selection}`);
}

function configureAiParameters(context: ExtensionContext): void {
    vscode.commands.executeCommand('workbench.action.openSettings', 'm31-agent');
}

function toggleTelemetry(context: ExtensionContext): void {
    const configService = ConfigurationService.getInstance();
    if (!configService) {
        vscode.window.showErrorMessage('Configuration service not initialized');
        return;
    }
    
    const currentSetting = configService.isTelemetryEnabled();
    vscode.workspace.getConfiguration('m31-agent').update('enableTelemetry', !currentSetting, vscode.ConfigurationTarget.Global);
    
    vscode.window.showInformationMessage(`Telemetry ${!currentSetting ? 'enabled' : 'disabled'}`);
}

function viewLogs(context: ExtensionContext): void {
    context.loggingService.showOutputChannel();
} 