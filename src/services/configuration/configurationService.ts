import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export class ConfigurationService {
    private static instance: ConfigurationService;
    private config: vscode.WorkspaceConfiguration;
    private readonly extensionId = 'm31-agent';
    private readonly onConfigChangedEmitter = new EventEmitter();
    private configChangeListener: vscode.Disposable | undefined;

    constructor(private readonly context: vscode.ExtensionContext) {
        ConfigurationService.instance = this;
        this.config = vscode.workspace.getConfiguration(this.extensionId);
    }

    public static getInstance(): ConfigurationService {
        if (!ConfigurationService.instance) {
            throw new Error('ConfigurationService not initialized');
        }
        return ConfigurationService.instance;
    }

    public async initialize(): Promise<void> {
        this.registerConfigChangeListener();
    }

    private registerConfigChangeListener(): void {
        this.configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(this.extensionId)) {
                this.config = vscode.workspace.getConfiguration(this.extensionId);
                this.onConfigChangedEmitter.emit('changed');
            }
        });
        this.context.subscriptions.push(this.configChangeListener);
    }

    public onConfigChanged(listener: () => void): vscode.Disposable {
        this.onConfigChangedEmitter.on('changed', listener);
        return {
            dispose: () => {
                this.onConfigChangedEmitter.removeListener('changed', listener);
            }
        };
    }

    public get<T>(key: string): T | undefined {
        return this.config.get<T>(key);
    }

    public async update<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
        await this.config.update(key, value, target);
    }

    public getModelId(): string {
        return this.get<string>('modelId') || 'openai/gpt-4o';
    }

    public async setModelId(modelId: string): Promise<void> {
        await this.update('modelId', modelId);
    }

    public getTemperature(): number {
        return this.get<number>('temperature') || 0.7;
    }

    public async setTemperature(temperature: number): Promise<void> {
        await this.update('temperature', temperature);
    }

    public getMaxTokens(): number {
        return this.get<number>('maxTokens') || 1024;
    }

    public async setMaxTokens(maxTokens: number): Promise<void> {
        await this.update('maxTokens', maxTokens);
    }

    public getApiEndpoint(): string {
        return this.get<string>('apiEndpoint') || 'https://openrouter.ai/api/v1';
    }

    public async setApiEndpoint(apiEndpoint: string): Promise<void> {
        await this.update('apiEndpoint', apiEndpoint);
    }

    public getLogLevel(): string {
        return this.get<string>('logLevel') || 'info';
    }

    public async setLogLevel(logLevel: string): Promise<void> {
        await this.update('logLevel', logLevel);
    }

    public isRequireConfirmation(): boolean {
        return this.get<boolean>('requireConfirmation') ?? true;
    }

    public async setRequireConfirmation(requireConfirmation: boolean): Promise<void> {
        await this.update('requireConfirmation', requireConfirmation);
    }

    public isEnableTelemetry(): boolean {
        return this.get<boolean>('enableTelemetry') ?? true;
    }

    public async setEnableTelemetry(enableTelemetry: boolean): Promise<void> {
        await this.update('enableTelemetry', enableTelemetry);
    }

    public isShowWelcomeOnStartup(): boolean {
        return this.get<boolean>('showWelcomeOnStartup') ?? true;
    }

    public async setShowWelcomeOnStartup(showWelcomeOnStartup: boolean): Promise<void> {
        await this.update('showWelcomeOnStartup', showWelcomeOnStartup);
    }

    public getAutoSaveDelay(): number {
        return this.get<number>('autoSaveDelay') || 1000;
    }

    public async setAutoSaveDelay(autoSaveDelay: number): Promise<void> {
        await this.update('autoSaveDelay', autoSaveDelay);
    }

    public async resetToDefaults(): Promise<void> {
        const keys = [
            'modelId',
            'maxTokens',
            'temperature',
            'enableTelemetry',
            'requireConfirmation',
            'apiEndpoint',
            'autoSaveDelay',
            'logLevel',
            'showWelcomeOnStartup'
        ];

        for (const key of keys) {
            await this.update(key, undefined);
        }
    }

    public dispose(): void {
        if (this.configChangeListener) {
            this.configChangeListener.dispose();
        }
        
        ConfigurationService.instance = undefined as any;
    }
} 