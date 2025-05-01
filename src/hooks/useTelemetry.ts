import { TelemetryService } from '../services/telemetry/telemetryService';
import { useConfiguration } from './useConfiguration';

export function useTelemetry() {
    const getTelemetryService = (): TelemetryService | undefined => {
        return TelemetryService.getInstance();
    };

    const trackEvent = (
        eventName: string,
        properties?: Record<string, string>,
        measurements?: Record<string, number>
    ): void => {
        const telemetry = getTelemetryService();
        if (!telemetry) {
            return;
        }

        telemetry.trackEvent(eventName, properties, measurements);
    };

    const isTelemetryEnabled = (): boolean => {
        const config = useConfiguration();
        return config.isTelemetryEnabled();
    };

    const trackCommand = (commandName: string, properties?: Record<string, string>): void => {
        trackEvent('command_executed', {
            command: commandName,
            ...properties
        });
    };

    const trackApiRequest = (
        endpoint: string,
        status: 'success' | 'error',
        properties?: Record<string, string>
    ): void => {
        trackEvent('api_request', {
            endpoint,
            status,
            ...properties
        });
    };

    const trackFeatureUsage = (featureName: string, properties?: Record<string, string>): void => {
        trackEvent('feature_used', {
            feature: featureName,
            ...properties
        });
    };

    const trackError = (
        errorName: string,
        errorMessage: string,
        properties?: Record<string, string>
    ): void => {
        trackEvent('error', {
            error_name: errorName,
            error_message: errorMessage,
            ...properties
        });
    };

    return {
        getTelemetryService,
        trackEvent,
        isTelemetryEnabled,
        trackCommand,
        trackApiRequest,
        trackFeatureUsage,
        trackError
    };
} 