import * as vscode from 'vscode';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { ConfigurationService } from '../configuration/configurationService';
import { LoggingService } from '../../utils/logging/loggingService';

export class TelemetryService {
    private static instance: TelemetryService;
    private telemetryEnabled: boolean;
    private userId: string;
    private sessionId: string;
    private extensionVersion: string;

    constructor(
        private readonly configService: ConfigurationService,
        private readonly loggingService: LoggingService = LoggingService.getInstance()
    ) {
        TelemetryService.instance = this;
        this.telemetryEnabled = this.configService.isEnableTelemetry();
        this.sessionId = uuidv4();
        this.userId = this.getUserId();
        this.extensionVersion = this.getExtensionVersion();

        this.configService.onConfigChanged(() => {
            this.telemetryEnabled = this.configService.isEnableTelemetry();
        });
    }

    public static getInstance(): TelemetryService {
        if (!TelemetryService.instance) {
            throw new Error('TelemetryService not initialized');
        }
        return TelemetryService.instance;
    }

    private getExtensionVersion(): string {
        const extension = vscode.extensions.getExtension('m31-ai.m31-agent');
        return extension?.packageJSON?.version || '0.0.0';
    }

    private getUserId(): string {
        const storedUserId = this.getStoredUserId();
        if (storedUserId) {
            return storedUserId;
        }
        
        const newUserId = uuidv4();
        this.storeUserId(newUserId);
        return newUserId;
    }

    private getStoredUserId(): string | undefined {
        try {
            const globalState = this.getGlobalState();
            return globalState?.get<string>('m31-agent.telemetry.userId');
        } catch (error) {
            this.loggingService.error('Failed to get stored user ID', error);
            return undefined;
        }
    }

    private storeUserId(userId: string): void {
        try {
            const globalState = this.getGlobalState();
            globalState?.update('m31-agent.telemetry.userId', userId);
        } catch (error) {
            this.loggingService.error('Failed to store user ID', error);
        }
    }

    private getGlobalState(): vscode.Memento | undefined {
        const extension = vscode.extensions.getExtension('m31-ai.m31-agent');
        return extension?.exports?.globalState;
    }

    public trackEvent(
        eventName: string,
        properties: Record<string, string> = {},
        measurements: Record<string, number> = {}
    ): void {
        if (!this.telemetryEnabled) {
            return;
        }

        const eventProperties = {
            ...properties,
            sessionId: this.sessionId,
            extensionVersion: this.extensionVersion
        };

        this.loggingService.debug(`Telemetry event: ${eventName}`, {
            properties: eventProperties,
            measurements
        });

        // In a production extension, you would send this data to your telemetry service
        // This implementation just logs the events
    }

    public setTelemetryEnabled(enabled: boolean): void {
        this.telemetryEnabled = enabled;
        this.configService.setEnableTelemetry(enabled);
    }

    public isTelemetryEnabled(): boolean {
        return this.telemetryEnabled;
    }

    public getSessionId(): string {
        return this.sessionId;
    }

    public dispose(): void {
        TelemetryService.instance = undefined as any;
    }
} 