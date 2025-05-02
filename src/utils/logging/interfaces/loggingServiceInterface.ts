export interface ILoggingService {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warning(message: string, context?: Record<string, unknown>): void;
    error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
    showOutputChannel(): void;
    dispose(): void;
} 