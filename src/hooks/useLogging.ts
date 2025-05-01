import { LoggingService, LogLevel } from '../utils/logging/loggingService';
import { useConfiguration } from './useConfiguration';

export function useLogging() {
    const getLoggingService = (): LoggingService | undefined => {
        return LoggingService.getInstance();
    };

    const debug = (message: string, data?: any): void => {
        const logger = getLoggingService();
        if (!logger) {
            return;
        }

        logger.debug(message, data);
    };

    const info = (message: string, data?: any): void => {
        const logger = getLoggingService();
        if (!logger) {
            return;
        }

        logger.info(message, data);
    };

    const warning = (message: string, data?: any): void => {
        const logger = getLoggingService();
        if (!logger) {
            return;
        }

        logger.warning(message, data);
    };

    const error = (message: string, error?: any): void => {
        const logger = getLoggingService();
        if (!logger) {
            console.error(message, error);
            return;
        }

        logger.error(message, error);
    };

    const showOutputChannel = (): void => {
        const logger = getLoggingService();
        if (!logger) {
            return;
        }

        logger.showOutputChannel();
    };

    const getLogLevel = (): LogLevel => {
        const config = useConfiguration();
        const logLevelString = config.getLogLevel();
        
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
    };

    return {
        getLoggingService,
        debug,
        info,
        warning,
        error,
        showOutputChannel,
        getLogLevel,
        LogLevel
    };
} 