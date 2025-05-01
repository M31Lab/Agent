import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { AuthenticationService } from '../../services/authentication/authenticationService';
import { ConfigurationService } from '../../services/configuration/configurationService';

export function RegisterConfigureSettingsCommand(
    context: ExtensionContext,
    dependencies: CommandDependencies
): void {
    const command = vscode.commands.registerCommand('m31-agent.configureSettings', async () => {
        try {
            context.loggingService.info('Executing settings configuration command');
            
            const options = [
                'Set API Key',
                'Select AI Model',
                'Configure AI Parameters',
                'Toggle Telemetry',
                'Reset to Defaults',
                'View Logs'
            ];
            
            const selection = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select a setting to configure'
            });
            
            if (!selection) {
                return;
            }
            
            switch (selection) {
                case 'Set API Key':
                    await configureApiKey(context);
                    break;
                    
                case 'Select AI Model':
                    await selectAiModel(context);
                    break;
                    
                case 'Configure AI Parameters':
                    await configureAiParameters(context);
                    break;
                    
                case 'Toggle Telemetry':
                    await toggleTelemetry(context);
                    break;
                    
                case 'Reset to Defaults':
                    await resetToDefaults(context);
                    break;
                    
                case 'View Logs':
                    viewLogs(context);
                    break;
            }
            
            // Track settings configuration
            context.telemetryService.trackEvent('settings_configured', {
                setting: selection
            });
        } catch (error) {
            context.loggingService.error('Failed to configure settings', error);
            vscode.window.showErrorMessage(`Error configuring settings: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    
    context.registerDisposable(command);
}

async function configureApiKey(context: ExtensionContext): Promise<void> {
    const authService = AuthenticationService.getInstance();
    
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your OpenRouter API key',
        password: true,
        placeHolder: 'sk-or-...',
        ignoreFocusOut: true
    });
    
    if (!apiKey) {
        return;
    }
    
    await authService.setApiKey(apiKey);
    vscode.window.showInformationMessage('API key saved securely');
}

async function selectAiModel(context: ExtensionContext): Promise<void> {
    const configService = context.configurationService;
    
    const models = [
        { label: 'OpenAI GPT-4o', id: 'openai/gpt-4o' },
        { label: 'OpenAI GPT-4 Turbo', id: 'openai/gpt-4-turbo' },
        { label: 'OpenAI GPT-3.5 Turbo', id: 'openai/gpt-3.5-turbo' },
        { label: 'Anthropic Claude 3 Opus', id: 'anthropic/claude-3-opus' },
        { label: 'Anthropic Claude 3 Sonnet', id: 'anthropic/claude-3-sonnet' },
        { label: 'Anthropic Claude 3 Haiku', id: 'anthropic/claude-3-haiku' },
        { label: 'Google Gemini Pro', id: 'google/gemini-pro' }
    ];
    
    const currentModel = configService.getModelId();
    
    const selection = await vscode.window.showQuickPick(models, {
        placeHolder: 'Select an AI model',
        ignoreFocusOut: true
    });
    
    if (!selection) {
        return;
    }
    
    await configService.update('modelId', selection.id, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`AI model set to ${selection.label}`);
}

async function configureAiParameters(context: ExtensionContext): Promise<void> {
    const configService = context.configurationService;
    
    const options = [
        'Max Tokens',
        'Temperature',
        'Require Confirmation'
    ];
    
    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select parameter to configure'
    });
    
    if (!selection) {
        return;
    }
    
    switch (selection) {
        case 'Max Tokens':
            const maxTokens = await vscode.window.showInputBox({
                prompt: 'Enter max tokens (256-8192)',
                value: configService.getMaxTokens().toString(),
                validateInput: value => {
                    const num = parseInt(value);
                    return (num >= 256 && num <= 8192) ? null : 'Please enter a number between 256 and 8192';
                }
            });
            
            if (maxTokens) {
                await configService.update('maxTokens', parseInt(maxTokens), vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Max tokens set to ${maxTokens}`);
            }
            break;
            
        case 'Temperature':
            const temperature = await vscode.window.showInputBox({
                prompt: 'Enter temperature (0.0-1.0)',
                value: configService.getTemperature().toString(),
                validateInput: value => {
                    const num = parseFloat(value);
                    return (num >= 0 && num <= 1) ? null : 'Please enter a number between 0.0 and 1.0';
                }
            });
            
            if (temperature) {
                await configService.update('temperature', parseFloat(temperature), vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Temperature set to ${temperature}`);
            }
            break;
            
        case 'Require Confirmation':
            const currentSetting = configService.isRequireConfirmation();
            const newSetting = !currentSetting;
            
            await configService.update('requireConfirmation', newSetting, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Confirmation requirement ${newSetting ? 'enabled' : 'disabled'}`);
            break;
    }
}

async function toggleTelemetry(context: ExtensionContext): Promise<void> {
    const configService = context.configurationService;
    const currentSetting = configService.isTelemetryEnabled();
    
    await configService.update('enableTelemetry', !currentSetting, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Telemetry ${!currentSetting ? 'enabled' : 'disabled'}`);
}

async function resetToDefaults(context: ExtensionContext): Promise<void> {
    const configService = context.configurationService;
    
    const confirmation = await vscode.window.showWarningMessage(
        'Are you sure you want to reset all settings to defaults?',
        { modal: true },
        'Reset'
    );
    
    if (confirmation !== 'Reset') {
        return;
    }
    
    await configService.resetToDefaults();
    vscode.window.showInformationMessage('Settings reset to defaults');
}

function viewLogs(context: ExtensionContext): void {
    context.loggingService.showOutputChannel();
} 