export interface ITelemetryService {
    trackEvent(eventName: string, properties?: Record<string, string>, measurements?: Record<string, number>): void;
    trackError(error: Error, properties?: Record<string, string>, measurements?: Record<string, number>): void;
    trackCommand(commandName: string, properties?: Record<string, string>, measurements?: Record<string, number>): void;
    trackAIRequest(modelId: string, tokensUsed: number, promptLength: number, responseLength: number, durationMs: number): void;
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
    dispose(): void;
}