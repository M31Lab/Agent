import { ExtensionConfiguration } from '../interfaces/configurationInterfaces';
import { LogLevel } from '../../utils/logging/loggingService';
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from '../defaults/defaultConfiguration';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    correctedConfig?: ExtensionConfiguration;
}

export function validateConfiguration(config: ExtensionConfiguration): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        correctedConfig: { ...config }
    };

    validateTemperature(config.temperature, result);
    validateMaxTokens(config.maxTokens, result);
    validateLogLevel(config.logLevel, result);
    validateModelId(config.modelId, result);
    validateApiEndpoint(config.apiEndpoint, result);
    validateAutoSaveDelay(config.autoSaveDelay, result);

    result.isValid = result.errors.length === 0;
    
    return result;
}

function validateTemperature(temperature: number, result: ValidationResult): void {
    if (temperature < 0 || temperature > 1) {
        result.errors.push(`Temperature must be between 0 and 1. Got: ${temperature}`);
        if (result.correctedConfig) {
            result.correctedConfig.temperature = DEFAULT_TEMPERATURE;
        }
    }
}

function validateMaxTokens(maxTokens: number, result: ValidationResult): void {
    if (maxTokens < 1 || maxTokens > 32000) {
        result.errors.push(`Max tokens must be between 1 and 32000. Got: ${maxTokens}`);
        if (result.correctedConfig) {
            result.correctedConfig.maxTokens = DEFAULT_MAX_TOKENS;
        }
    }
}

function validateLogLevel(logLevel: string | LogLevel, result: ValidationResult): void {
    const validLogLevels = ['debug', 'info', 'warning', 'error', 'none'];
    
    if (typeof logLevel === 'string' && !validLogLevels.includes(logLevel.toLowerCase())) {
        result.errors.push(`Log level must be one of: ${validLogLevels.join(', ')}. Got: ${logLevel}`);
        if (result.correctedConfig) {
            result.correctedConfig.logLevel = 'info';
        }
    }
}

function validateModelId(modelId: string, result: ValidationResult): void {
    if (!modelId || modelId.trim() === '') {
        result.errors.push('Model ID cannot be empty');
        if (result.correctedConfig) {
            result.correctedConfig.modelId = 'openai/gpt-4o';
        }
    }
}

function validateApiEndpoint(apiEndpoint: string, result: ValidationResult): void {
    try {
        new URL(apiEndpoint);
    } catch (error) {
        result.errors.push(`API endpoint must be a valid URL. Got: ${apiEndpoint}`);
        if (result.correctedConfig) {
            result.correctedConfig.apiEndpoint = 'https://openrouter.ai/api/v1';
        }
    }
}

function validateAutoSaveDelay(autoSaveDelay: number, result: ValidationResult): void {
    if (autoSaveDelay < 100 || autoSaveDelay > 10000) {
        result.warnings.push(`Auto save delay should be between 100ms and 10000ms. Got: ${autoSaveDelay}ms`);
    }
} 