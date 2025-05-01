import * as vscode from 'vscode';
import { LoggingService } from '../../utils/logging/loggingService';
import { ConfigurationService } from '../configuration/configurationService';
import { ApiError } from '../../models/responses/apiError';

export class AuthenticationService {
    private static instance: AuthenticationService;
    private readonly secretStorageKey = 'openRouterApiKey';
    private readonly tokenStorageKey = 'openRouterApiToken';
    private apiKey: string | undefined;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configService: ConfigurationService,
        private readonly loggingService: LoggingService = LoggingService.getInstance()
    ) {
        AuthenticationService.instance = this;
    }

    public static getInstance(): AuthenticationService {
        if (!AuthenticationService.instance) {
            throw new Error('AuthenticationService not initialized');
        }
        return AuthenticationService.instance;
    }

    public async initialize(): Promise<void> {
        await this.loadCredentials();
    }

    private async loadCredentials(): Promise<void> {
        try {
            this.apiKey = await this.context.secrets.get(this.secretStorageKey);
            
            if (!this.apiKey) {
                const envApiKey = process.env.OPENROUTER_API_KEY;
                if (envApiKey) {
                    this.apiKey = envApiKey;
                    this.loggingService.info('API key loaded from environment variable');
                } else {
                    this.loggingService.info('No API key found');
                }
            } else {
                this.loggingService.info('API key loaded from secret storage');
            }
        } catch (error) {
            this.loggingService.error('Failed to load credentials', error);
            throw new ApiError(500, 'Failed to load credentials', 'auth_error', error);
        }
    }

    public isAuthenticated(): boolean {
        return !!this.apiKey;
    }

    public getApiKey(): string {
        if (!this.apiKey) {
            throw new ApiError(401, 'API key not set', 'auth_error');
        }
        return this.apiKey;
    }

    public async setApiKey(apiKey: string): Promise<void> {
        try {
            await this.context.secrets.store(this.secretStorageKey, apiKey);
            this.apiKey = apiKey;
            this.loggingService.info('API key saved to secret storage');
        } catch (error) {
            this.loggingService.error('Failed to save API key', error);
            throw new ApiError(500, 'Failed to save API key', 'auth_error', error);
        }
    }

    public async clearCredentials(): Promise<void> {
        try {
            await this.context.secrets.delete(this.secretStorageKey);
            await this.context.secrets.delete(this.tokenStorageKey);
            this.apiKey = undefined;
            this.loggingService.info('Credentials cleared');
        } catch (error) {
            this.loggingService.error('Failed to clear credentials', error);
            throw new ApiError(500, 'Failed to clear credentials', 'auth_error', error);
        }
    }

    public async promptForApiKey(): Promise<string | undefined> {
        const apiKey = await vscode.window.showInputBox({
            title: 'Enter OpenRouter API Key',
            prompt: 'Please enter your OpenRouter API key. The key will be stored securely.',
            password: true,
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value) {
                    return 'API key cannot be empty';
                }
                
                if (value.trim().length < 20) {
                    return 'API key seems too short. Please enter a valid OpenRouter API key.';
                }
                
                return null;
            }
        });

        if (apiKey) {
            await this.setApiKey(apiKey);
            return apiKey;
        }
        
        return undefined;
    }

    public async ensureAuthenticated(): Promise<boolean> {
        if (this.isAuthenticated()) {
            return true;
        }

        const apiKey = await this.promptForApiKey();
        return !!apiKey;
    }

    public dispose(): void {
        AuthenticationService.instance = undefined as any;
    }
} 