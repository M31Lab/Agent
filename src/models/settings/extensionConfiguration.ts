import { LogLevel } from '../../utils/logging/logLevel';
import { AIModelConfiguration } from './aiModelConfiguration';

export interface ExtensionConfiguration {
    modelId: string;
    maxTokens: number;
    temperature: number;
    requireConfirmation: boolean;
    logLevel: LogLevel;
    enableTelemetry: boolean;
    modelConfiguration: AIModelConfiguration;
} 