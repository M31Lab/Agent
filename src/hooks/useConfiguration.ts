import * as vscode from 'vscode';
import { ConfigurationService } from '../services/configuration/configurationService';

export function useConfiguration() {
    const getConfigurationService = (): ConfigurationService | undefined => {
        return ConfigurationService.getInstance();
    };

    const getConfiguration = <T>(key: string, defaultValue: T): T => {
        const configService = getConfigurationService();
        if (!configService) {
            return defaultValue;
        }

        return configService.getConfiguration<T>(key, defaultValue);
    };

    const updateConfiguration = async (
        key: string,
        value: any,
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> => {
        const configService = getConfigurationService();
        if (!configService) {
            throw new Error('Configuration service not initialized');
        }

        return configService.update(key, value, target);
    };

    const getModelId = (): string => {
        const configService = getConfigurationService();
        if (!configService) {
            return 'openai/gpt-4o';
        }

        return configService.getModelId();
    };

    const getMaxTokens = (): number => {
        const configService = getConfigurationService();
        if (!configService) {
            return 1024;
        }

        return configService.getMaxTokens();
    };

    const getTemperature = (): number => {
        const configService = getConfigurationService();
        if (!configService) {
            return 0.7;
        }

        return configService.getTemperature();
    };

    const isRequireConfirmation = (): boolean => {
        const configService = getConfigurationService();
        if (!configService) {
            return true;
        }

        return configService.isRequireConfirmation();
    };

    const isTelemetryEnabled = (): boolean => {
        const configService = getConfigurationService();
        if (!configService) {
            return true;
        }

        return configService.isTelemetryEnabled();
    };

    const getLogLevel = (): string => {
        const configService = getConfigurationService();
        if (!configService) {
            return 'info';
        }

        return configService.getLogLevel();
    };

    const resetToDefaults = async (): Promise<void> => {
        const configService = getConfigurationService();
        if (!configService) {
            throw new Error('Configuration service not initialized');
        }

        return configService.resetToDefaults();
    };

    return {
        getConfigurationService,
        getConfiguration,
        updateConfiguration,
        getModelId,
        getMaxTokens,
        getTemperature,
        isRequireConfirmation,
        isTelemetryEnabled,
        getLogLevel,
        resetToDefaults
    };
} 