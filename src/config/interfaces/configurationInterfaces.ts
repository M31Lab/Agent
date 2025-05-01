import { LogLevel } from '../../utils/logging/loggingService';
import { ModelSettings } from '../../models/ai/aiModels';

export interface ExtensionConfiguration {
    apiKey?: string;
    modelId: string;
    temperature: number;
    maxTokens: number;
    logLevel: LogLevel | string;
    enableTelemetry: boolean;
    requireConfirmation: boolean;
    apiEndpoint: string;
    autoSaveDelay: number;
    showWelcomeOnStartup: boolean;
}

export interface EnvironmentConfig {
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
    version: string;
    name: string;
    buildDate: Date;
}

export interface UserConfiguration {
    modelSettings: ModelSettings;
    generalSettings: {
        showWelcomeOnStartup: boolean;
        enableTelemetry: boolean;
        requireConfirmation: boolean;
    };
    interfaceSettings: {
        autoSaveDelay: number;
        theme: string;
    };
    advancedSettings: {
        logLevel: LogLevel | string;
        apiEndpoint: string;
    };
} 