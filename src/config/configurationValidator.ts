import { ExtensionConfiguration, AiModelConfiguration, ApiConfiguration, LoggingConfiguration, SecurityConfiguration, TelemetryConfiguration, UserInterfaceConfiguration, CompletionConfiguration } from './configurationInterfaces';
import { DEFAULT_MODEL_ID, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, DEFAULT_REQUIRE_CONFIRMATION, DEFAULT_TELEMETRY_ENABLED, DEFAULT_LOG_LEVEL, DEFAULT_SHOW_WELCOME } from './defaultConfiguration';

export class ConfigurationValidator {
    public static validateApiConfiguration(config: Partial<ApiConfiguration>): ApiConfiguration {
        return {
            endpoint: this.validateString(config.endpoint, 'https://openrouter.ai/api/v1'),
            apiKey: config.apiKey || null,
            requestTimeout: this.validateNumber(config.requestTimeout, 30000, 5000, 120000),
            maxRetries: this.validateNumber(config.maxRetries, 3, 0, 10),
            retryDelay: this.validateNumber(config.retryDelay, 1000, 100, 10000)
        };
    }

    public static validateAiModelConfiguration(config: Partial<AiModelConfiguration>): AiModelConfiguration {
        return {
            modelId: this.validateString(config.modelId, DEFAULT_MODEL_ID),
            temperature: this.validateNumber(config.temperature, DEFAULT_TEMPERATURE, 0, 1),
            maxTokens: this.validateNumber(config.maxTokens, DEFAULT_MAX_TOKENS, 1, 8192),
            frequencyPenalty: config.frequencyPenalty !== undefined ? this.validateNumber(config.frequencyPenalty, 0, 0, 2) : undefined,
            presencePenalty: config.presencePenalty !== undefined ? this.validateNumber(config.presencePenalty, 0, 0, 2) : undefined,
            availableModels: config.availableModels || []
        };
    }

    public static validateLoggingConfiguration(config: Partial<LoggingConfiguration>): LoggingConfiguration {
        return {
            logLevel: this.validateLogLevel(config.logLevel, DEFAULT_LOG_LEVEL as any),
            includeTimestamps: this.validateBoolean(config.includeTimestamps, true),
            outputChannel: this.validateString(config.outputChannel, 'M31 Agent Logs'),
            logToFile: this.validateBoolean(config.logToFile, false),
            logFilePath: config.logFilePath
        };
    }

    public static validateSecurityConfiguration(config: Partial<SecurityConfiguration>): SecurityConfiguration {
        return {
            requireConfirmation: this.validateBoolean(config.requireConfirmation, DEFAULT_REQUIRE_CONFIRMATION),
            allowFileSystemAccess: this.validateBoolean(config.allowFileSystemAccess, true),
            allowTerminalCommands: this.validateBoolean(config.allowTerminalCommands, true),
            allowNetworkRequests: this.validateBoolean(config.allowNetworkRequests, true),
            allowedDomains: config.allowedDomains || undefined
        };
    }

    public static validateTelemetryConfiguration(config: Partial<TelemetryConfiguration>): TelemetryConfiguration {
        return {
            enabled: this.validateBoolean(config.enabled, DEFAULT_TELEMETRY_ENABLED),
            anonymizeData: this.validateBoolean(config.anonymizeData, true),
            includeUsageStats: this.validateBoolean(config.includeUsageStats, true),
            consentShown: this.validateBoolean(config.consentShown, false)
        };
    }

    public static validateUserInterfaceConfiguration(config: Partial<UserInterfaceConfiguration>): UserInterfaceConfiguration {
        return {
            theme: this.validateTheme(config.theme, 'system'),
            showWelcomeOnStartup: this.validateBoolean(config.showWelcomeOnStartup, DEFAULT_SHOW_WELCOME),
            panelDefaultPosition: this.validatePanelPosition(config.panelDefaultPosition, 'right'),
            fontFamily: this.validateString(config.fontFamily, 'var(--vscode-editor-font-family)'),
            fontSize: this.validateNumber(config.fontSize, 13, 10, 24)
        };
    }

    public static validateCompletionConfiguration(config: Partial<CompletionConfiguration>): CompletionConfiguration {
        return {
            streamingEnabled: this.validateBoolean(config.streamingEnabled, true),
            showTokenCount: this.validateBoolean(config.showTokenCount, true),
            maxHistoryLength: this.validateNumber(config.maxHistoryLength, 50, 0, 1000),
            autoDeleteSessions: this.validateBoolean(config.autoDeleteSessions, false),
            sessionLifetimeDays: this.validateNumber(config.sessionLifetimeDays, 30, 1, 365)
        };
    }

    public static validateFullConfiguration(config: Partial<ExtensionConfiguration>): ExtensionConfiguration {
        return {
            logging: this.validateLoggingConfiguration(config.logging || {}),
            telemetry: this.validateTelemetryConfiguration(config.telemetry || {}),
            api: this.validateApiConfiguration(config.api || {}),
            aiModel: this.validateAiModelConfiguration(config.aiModel || {}),
            ui: this.validateUserInterfaceConfiguration(config.ui || {}),
            security: this.validateSecurityConfiguration(config.security || {}),
            completion: this.validateCompletionConfiguration(config.completion || {}),
            version: this.validateString(config.version, '0.0.0')
        };
    }

    private static validateString(value: any, defaultValue: string): string {
        if (typeof value !== 'string') {
            return defaultValue;
        }
        return value;
    }

    private static validateNumber(value: any, defaultValue: number, min: number, max: number): number {
        if (typeof value !== 'number' || isNaN(value)) {
            return defaultValue;
        }
        return Math.min(Math.max(value, min), max);
    }

    private static validateBoolean(value: any, defaultValue: boolean): boolean {
        if (typeof value !== 'boolean') {
            return defaultValue;
        }
        return value;
    }

    private static validateLogLevel(value: any, defaultValue: 'debug' | 'info' | 'warning' | 'error' | 'none'): 'debug' | 'info' | 'warning' | 'error' | 'none' {
        const validLevels = ['debug', 'info', 'warning', 'error', 'none'];
        if (typeof value !== 'string' || !validLevels.includes(value)) {
            return defaultValue;
        }
        return value as any;
    }

    private static validateTheme(value: any, defaultValue: 'light' | 'dark' | 'system'): 'light' | 'dark' | 'system' {
        const validThemes = ['light', 'dark', 'system'];
        if (typeof value !== 'string' || !validThemes.includes(value)) {
            return defaultValue;
        }
        return value as any;
    }

    private static validatePanelPosition(value: any, defaultValue: 'left' | 'right' | 'bottom'): 'left' | 'right' | 'bottom' {
        const validPositions = ['left', 'right', 'bottom'];
        if (typeof value !== 'string' || !validPositions.includes(value)) {
            return defaultValue;
        }
        return value as any;
    }
} 