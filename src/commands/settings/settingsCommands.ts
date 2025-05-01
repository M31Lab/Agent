import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { StatusBarManager } from '../../components/statusBar/statusBarManager';
import { registerCommand } from '../commandRegistry';

export function registerSettingsCommands(
    context: ExtensionContext,
    statusBarManager: StatusBarManager
): void {
    context.loggingService.debug('Registering settings commands');

    // Configure extension settings
    registerCommand(
        context,
        'm31-agent.configureSettings',
        async () => {
            const settings = await vscode.commands.executeCommand('workbench.action.openSettings', 'm31-agent');
            return settings;
        }
    );

    // Configure API key
    registerCommand(
        context,
        'm31-agent.configureApiKey',
        async () => {
            statusBarManager.setLoadingState('Configuring API key');
            
            try {
                const apiKey = await context.authenticationService.promptForApiKey();
                
                if (apiKey) {
                    statusBarManager.setActiveState('API key configured');
                    vscode.window.showInformationMessage('OpenRouter API key configured successfully');
                    context.telemetryService.trackEvent('api_key_configured');
                } else {
                    statusBarManager.setDefaultState();
                }
            } catch (error) {
                statusBarManager.setErrorState('Failed to configure API key');
                vscode.window.showErrorMessage(`Failed to configure API key: ${error instanceof Error ? error.message : String(error)}`);
                context.telemetryService.trackEvent('api_key_configuration_failed');
            }
        }
    );

    // Clear API key
    registerCommand(
        context,
        'm31-agent.clearApiKey',
        async () => {
            const confirmed = await vscode.window.showWarningMessage(
                'Are you sure you want to clear your OpenRouter API key?',
                { modal: true },
                'Yes'
            );

            if (confirmed === 'Yes') {
                statusBarManager.setLoadingState('Clearing API key');
                
                try {
                    await context.authenticationService.clearCredentials();
                    statusBarManager.setDefaultState();
                    vscode.window.showInformationMessage('API key cleared successfully');
                    context.telemetryService.trackEvent('api_key_cleared');
                } catch (error) {
                    statusBarManager.setErrorState('Failed to clear API key');
                    vscode.window.showErrorMessage(`Failed to clear API key: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
    );

    // Select model
    registerCommand(
        context,
        'm31-agent.selectModel',
        async () => {
            const models = [
                { label: 'OpenAI GPT-4o', value: 'openai/gpt-4o', description: 'Most capable general-purpose model' },
                { label: 'OpenAI GPT-4 Turbo', value: 'openai/gpt-4-turbo', description: 'Highly capable general-purpose model' },
                { label: 'OpenAI GPT-3.5 Turbo', value: 'openai/gpt-3.5-turbo', description: 'Fast and economical general-purpose model' },
                { label: 'Anthropic Claude 3 Opus', value: 'anthropic/claude-3-opus', description: 'Highest capability Claude model' },
                { label: 'Anthropic Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet', description: 'Balanced capability and performance' },
                { label: 'Anthropic Claude 3 Haiku', value: 'anthropic/claude-3-haiku', description: 'Fast and efficient Claude model' },
                { label: 'Google Gemini Pro', value: 'google/gemini-pro', description: 'Google\'s advanced large language model' }
            ];
            
            const currentModel = context.configurationService.getModelId();
            
            const selectedModel = await vscode.window.showQuickPick(models, {
                placeHolder: 'Select AI model',
                title: 'Select AI Model',
                matchOnDescription: true,
                matchOnDetail: true
            });
            
            if (selectedModel) {
                try {
                    await context.configurationService.setModelId(selectedModel.value);
                    statusBarManager.setActiveState(`Model: ${selectedModel.label}`);
                    vscode.window.showInformationMessage(`AI model set to ${selectedModel.label}`);
                    context.telemetryService.trackEvent('model_changed', { model: selectedModel.value });
                } catch (error) {
                    statusBarManager.setErrorState('Failed to change model');
                    vscode.window.showErrorMessage(`Failed to change model: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
    );

    // Reset settings to defaults
    registerCommand(
        context,
        'm31-agent.resetSettings',
        async () => {
            const confirmed = await vscode.window.showWarningMessage(
                'Are you sure you want to reset all settings to defaults?',
                { modal: true },
                'Yes'
            );

            if (confirmed === 'Yes') {
                statusBarManager.setLoadingState('Resetting settings');
                
                try {
                    await context.configurationService.resetToDefaults();
                    statusBarManager.setDefaultState();
                    vscode.window.showInformationMessage('Settings reset to defaults');
                    context.telemetryService.trackEvent('settings_reset');
                } catch (error) {
                    statusBarManager.setErrorState('Failed to reset settings');
                    vscode.window.showErrorMessage(`Failed to reset settings: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
    );

    // Toggle telemetry
    registerCommand(
        context,
        'm31-agent.toggleTelemetry',
        async () => {
            const currentValue = context.configurationService.isEnableTelemetry();
            const newValue = !currentValue;
            
            try {
                await context.configurationService.setEnableTelemetry(newValue);
                context.telemetryService.setTelemetryEnabled(newValue);
                
                vscode.window.showInformationMessage(`Telemetry ${newValue ? 'enabled' : 'disabled'}`);
                if (newValue) {
                    context.telemetryService.trackEvent('telemetry_enabled');
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to toggle telemetry: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    );
} 