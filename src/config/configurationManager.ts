import * as vscode from 'vscode';
import { ConfigurationKeys } from './configurationKeys';
import { ExtensionConfiguration, UserConfiguration } from './interfaces/configurationInterfaces';
import { DefaultConfiguration, DEFAULT_API_ENDPOINT, DEFAULT_AUTO_SAVE_DELAY, DEFAULT_SHOW_WELCOME_ON_STARTUP } from './defaults/defaultConfiguration';
import { validateConfiguration } from './validators/configurationValidator';
import { getEnvironmentConfig } from './environments/environmentConfig';
import { EventEmitter } from 'events';
import { LogLevel } from '../utils/logging/loggingService';

export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private vscodeConfig: vscode.WorkspaceConfiguration;
    private readonly extensionId = 'm31-agent';
    private readonly configChangedEmitter = new EventEmitter();
    private configChangeListener: vscode.Disposable | undefined;
    
    private constructor(private readonly context: vscode.ExtensionContext) {
        this.vscodeConfig = vscode.workspace.getConfiguration(this.extensionId);
    }
    
    public static getInstance(context?: vscode.ExtensionContext): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            if (!context) {
                throw new Error('Context is required for initial ConfigurationManager initialization');
            }
            ConfigurationManager.instance = new ConfigurationManager(context);
        }
        return ConfigurationManager.instance;
    }
    
    public initialize(): void {
        this.registerConfigChangeListener();
        this.validateCurrentConfiguration();
    }
    
    private registerConfigChangeListener(): void {
        this.configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(this.extensionId)) {
                this.vscodeConfig = vscode.workspace.getConfiguration(this.extensionId);
                this.validateCurrentConfiguration();
                this.configChangedEmitter.emit('changed', e);
            }
        });
        this.context.subscriptions.push(this.configChangeListener);
    }
    
    public onConfigChanged(listener: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        this.configChangedEmitter.on('changed', listener);
        return {
            dispose: () => {
                this.configChangedEmitter.removeListener('changed', listener);
            }
        };
    }
    
    public get<T>(key: string): T | undefined {
        return this.vscodeConfig.get<T>(key);
    }
    
    public async update<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
        await this.vscodeConfig.update(key, value, target);
    }
    
    public getFullConfiguration(): ExtensionConfiguration {
        return {
            apiKey: undefined, // Not stored in configuration for security
            modelId: this.get<string>(ConfigurationKeys.MODEL_ID) || DefaultConfiguration[ConfigurationKeys.MODEL_ID],
            temperature: this.get<number>(ConfigurationKeys.TEMPERATURE) || DefaultConfiguration[ConfigurationKeys.TEMPERATURE],
            maxTokens: this.get<number>(ConfigurationKeys.MAX_TOKENS) || DefaultConfiguration[ConfigurationKeys.MAX_TOKENS],
            logLevel: this.get<string>(ConfigurationKeys.LOG_LEVEL) || DefaultConfiguration[ConfigurationKeys.LOG_LEVEL],
            enableTelemetry: this.get<boolean>(ConfigurationKeys.ENABLE_TELEMETRY) ?? DefaultConfiguration[ConfigurationKeys.ENABLE_TELEMETRY],
            requireConfirmation: this.get<boolean>(ConfigurationKeys.REQUIRE_CONFIRMATION) ?? DefaultConfiguration[ConfigurationKeys.REQUIRE_CONFIRMATION],
            apiEndpoint: this.get<string>('apiEndpoint') || DEFAULT_API_ENDPOINT,
            autoSaveDelay: this.get<number>('autoSaveDelay') || DEFAULT_AUTO_SAVE_DELAY,
            showWelcomeOnStartup: this.get<boolean>('showWelcomeOnStartup') ?? DEFAULT_SHOW_WELCOME_ON_STARTUP
        };
    }
    
    public getUserConfiguration(): UserConfiguration {
        const config = this.getFullConfiguration();
        
        return {
            modelSettings: {
                modelId: config.modelId,
                temperature: config.temperature,
                maxTokens: config.maxTokens
            },
            generalSettings: {
                showWelcomeOnStartup: config.showWelcomeOnStartup,
                enableTelemetry: config.enableTelemetry,
                requireConfirmation: config.requireConfirmation
            },
            interfaceSettings: {
                autoSaveDelay: config.autoSaveDelay,
                theme: 'default'
            },
            advancedSettings: {
                logLevel: config.logLevel,
                apiEndpoint: config.apiEndpoint
            }
        };
    }
    
    private validateCurrentConfiguration(): void {
        const config = this.getFullConfiguration();
        const validationResult = validateConfiguration(config);
        
        if (!validationResult.isValid && validationResult.correctedConfig) {
            this.applyCorrections(validationResult.correctedConfig);
        }
        
        for (const warning of validationResult.warnings) {
            console.warn(`Configuration warning: ${warning}`);
        }
    }
    
    private async applyCorrections(correctedConfig: ExtensionConfiguration): Promise<void> {
        try {
            if (correctedConfig.modelId !== this.get<string>(ConfigurationKeys.MODEL_ID)) {
                await this.update(ConfigurationKeys.MODEL_ID, correctedConfig.modelId);
            }
            
            if (correctedConfig.temperature !== this.get<number>(ConfigurationKeys.TEMPERATURE)) {
                await this.update(ConfigurationKeys.TEMPERATURE, correctedConfig.temperature);
            }
            
            if (correctedConfig.maxTokens !== this.get<number>(ConfigurationKeys.MAX_TOKENS)) {
                await this.update(ConfigurationKeys.MAX_TOKENS, correctedConfig.maxTokens);
            }
            
            if (correctedConfig.logLevel !== this.get<string>(ConfigurationKeys.LOG_LEVEL)) {
                await this.update(ConfigurationKeys.LOG_LEVEL, correctedConfig.logLevel);
            }
            
            if (correctedConfig.apiEndpoint !== this.get<string>('apiEndpoint')) {
                await this.update('apiEndpoint', correctedConfig.apiEndpoint);
            }
        } catch (error) {
            console.error('Failed to apply configuration corrections', error);
        }
    }
    
    public getLogLevel(): LogLevel {
        const logLevelString = this.get<string>(ConfigurationKeys.LOG_LEVEL) || DefaultConfiguration[ConfigurationKeys.LOG_LEVEL];
        
        switch (logLevelString) {
            case 'debug':
                return LogLevel.Debug;
            case 'info':
                return LogLevel.Info;
            case 'warning':
                return LogLevel.Warning;
            case 'error':
                return LogLevel.Error;
            case 'none':
                return LogLevel.None;
            default:
                return LogLevel.Info;
        }
    }
    
    public getEnvironmentInformation() {
        return getEnvironmentConfig();
    }
    
    public dispose(): void {
        if (this.configChangeListener) {
            this.configChangeListener.dispose();
        }
        
        ConfigurationManager.instance = undefined as any;
    }
} 