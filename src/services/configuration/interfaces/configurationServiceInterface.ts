import { ExtensionConfiguration } from '../../../models/settings/extensionConfiguration';
import { AIModelConfiguration } from '../../../models/settings/aiModelConfiguration';
import { LogLevel } from '../../../utils/logging/logLevel';

export interface IConfigurationService {
    initialize(): Promise<void>;
    getConfiguration(): ExtensionConfiguration;
    getApiKey(): string;
    setApiKey(apiKey: string): Promise<void>;
    getModelId(): string;
    getLogLevel(): LogLevel;
    isTelemetryEnabled(): boolean;
    getMaxTokens(): number;
    getTemperature(): number;
    isConfirmationRequired(): boolean;
    getAIModelConfiguration(): AIModelConfiguration;
} 