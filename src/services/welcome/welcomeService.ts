import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { AuthenticationService } from '../authentication/authenticationService';
import { ConfigurationService } from '../configuration/configurationService';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../telemetry/telemetryService';

export class WelcomeService implements vscode.Disposable {
    private static instance: WelcomeService;
    private firstRunKey = 'firstRun';
    
    constructor(
        private readonly extensionContext: ExtensionContext
    ) {
        WelcomeService.instance = this;
    }
    
    public static getInstance(context?: ExtensionContext): WelcomeService {
        if (!WelcomeService.instance && context) {
            WelcomeService.instance = new WelcomeService(context);
        }
        
        if (!WelcomeService.instance) {
            throw new Error('WelcomeService not initialized');
        }
        
        return WelcomeService.instance;
    }
    
    public async handleFirstRun(): Promise<void> {
        const isFirstRun = await this.isFirstRun();
        
        if (isFirstRun) {
            this.extensionContext.loggingService.info('First run detected, showing welcome workflow');
            
            // First, show the welcome message
            const welcomeResponse = await vscode.window.showInformationMessage(
                'Welcome to M31 Agent! Before you can start using the extension, you need to set up your OpenRouter API key.',
                'Set Up Now', 'Later'
            );
            
            if (welcomeResponse === 'Set Up Now') {
                await this.showSetupWorkflow();
            } else {
                vscode.window.showInformationMessage(
                    'You can set up M31 Agent later by running the "M31 Agent: Configure API Key" command.',
                    'Got it'
                );
            }
            
            await this.markFirstRunComplete();
        } else if (!this.extensionContext.authenticationService.isAuthenticated()) {
            // Not first run but still needs authentication
            const needAuthResponse = await vscode.window.showInformationMessage(
                'M31 Agent needs an OpenRouter API key to function.',
                'Configure API Key', 'Later'
            );
            
            if (needAuthResponse === 'Configure API Key') {
                await this.configureApiKey();
            }
        }
    }
    
    private async showSetupWorkflow(): Promise<void> {
        const apiKeyConfigured = await this.configureApiKey();
        
        if (apiKeyConfigured) {
            await this.selectModel();
        }
    }
    
    private async configureApiKey(): Promise<boolean> {
        try {
            const apiKey = await this.extensionContext.authenticationService.promptForApiKey();
            
            if (apiKey) {
                vscode.window.showInformationMessage('OpenRouter API key configured successfully!');
                this.extensionContext.telemetryService.trackEvent('welcome_api_key_configured');
                return true;
            }
            
            return false;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to configure API key: ${error instanceof Error ? error.message : String(error)}`);
            this.extensionContext.loggingService.error('Failed to configure API key during welcome', error);
            return false;
        }
    }
    
    private async selectModel(): Promise<void> {
        const models = [
            { label: 'OpenAI GPT-4o', value: 'openai/gpt-4o', description: 'Most capable general-purpose model (recommended)' },
            { label: 'OpenAI GPT-4 Turbo', value: 'openai/gpt-4-turbo', description: 'Highly capable general-purpose model' },
            { label: 'OpenAI GPT-3.5 Turbo', value: 'openai/gpt-3.5-turbo', description: 'Fast and economical general-purpose model' },
            { label: 'Anthropic Claude 3 Opus', value: 'anthropic/claude-3-opus', description: 'Highest capability Claude model' },
            { label: 'Anthropic Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet', description: 'Balanced capability and performance' },
            { label: 'Anthropic Claude 3 Haiku', value: 'anthropic/claude-3-haiku', description: 'Fast and efficient Claude model' },
            { label: 'Google Gemini Pro', value: 'google/gemini-pro', description: 'Google\'s advanced large language model' }
        ];
        
        const selectedModel = await vscode.window.showQuickPick(models, {
            placeHolder: 'Select your preferred AI model',
            title: 'Select AI Model',
            matchOnDescription: true,
            matchOnDetail: true
        });
        
        if (selectedModel) {
            try {
                await this.extensionContext.configurationService.setModelId(selectedModel.value);
                vscode.window.showInformationMessage(
                    `M31 Agent is now set up and ready! Selected model: ${selectedModel.label}`,
                    'Get Started'
                );
                this.extensionContext.telemetryService.trackEvent('welcome_model_selected', { model: selectedModel.value });
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to set model: ${error instanceof Error ? error.message : String(error)}`);
                this.extensionContext.loggingService.error('Failed to set model during welcome', error);
            }
        } else {
            // User cancelled selection, use default
            vscode.window.showInformationMessage('M31 Agent is now set up with the default GPT-4o model!');
        }
    }
    
    private async isFirstRun(): Promise<boolean> {
        const globalState = this.extensionContext.vscodeContext.globalState;
        return globalState.get<boolean>(this.firstRunKey, true);
    }
    
    private async markFirstRunComplete(): Promise<void> {
        const globalState = this.extensionContext.vscodeContext.globalState;
        await globalState.update(this.firstRunKey, false);
    }
    
    public dispose(): void {
        WelcomeService.instance = undefined as unknown;
    }
} 