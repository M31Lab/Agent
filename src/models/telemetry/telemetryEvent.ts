export interface TelemetryEvent {
    name: string;
    timestamp: string;
    properties: Record<string, string>;
    measurements: Record<string, number>;
} 