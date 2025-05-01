import { AIModel } from '../models/ai/aiModels';

export interface LoggingConfiguration {
    logLevel: 'debug' | 'info' | 'warning' | 'error' | 'none';
    includeTimestamps: boolean;
    outputChannel: string;
    logToFile: boolean;
    logFilePath?: string;
}

export interface TelemetryConfiguration {
    enabled: boolean;
    anonymizeData: boolean;
    includeUsageStats: boolean;
    consentShown: boolean;
}

export interface ApiConfiguration {
    endpoint: string;
    apiKey: string | null;
    requestTimeout: number;
    maxRetries: number;
    retryDelay: number;
}

export interface AiModelConfiguration {
    modelId: string;
    temperature: number;
    maxTokens: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    availableModels: AIModel[];
}

export interface UserInterfaceConfiguration {
    theme: 'light' | 'dark' | 'system';
    showWelcomeOnStartup: boolean;
    panelDefaultPosition: 'left' | 'right' | 'bottom';
    fontFamily: string;
    fontSize: number;
}

export interface SecurityConfiguration {
    requireConfirmation: boolean;
    allowFileSystemAccess: boolean;
    allowTerminalCommands: boolean;
    allowNetworkRequests: boolean;
    allowedDomains?: string[];
}

export interface CompletionConfiguration {
    streamingEnabled: boolean;
    showTokenCount: boolean;
    maxHistoryLength: number;
    autoDeleteSessions: boolean;
    sessionLifetimeDays: number;
}

export interface ExtensionConfiguration {
    logging: LoggingConfiguration;
    telemetry: TelemetryConfiguration;
    api: ApiConfiguration;
    aiModel: AiModelConfiguration;
    ui: UserInterfaceConfiguration;
    security: SecurityConfiguration;
    completion: CompletionConfiguration;
    version: string;
}

export type ConfigurationUpdateEvent = {
    section: keyof ExtensionConfiguration;
    value: any;
}; 