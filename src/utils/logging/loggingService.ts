import * as vscode from 'vscode';
import { ConfigurationService } from '../../services/configuration/configurationService';

export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warning = 2,
    Error = 3,
    None = 4
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    data?: any;
}

export class LoggingService {
    private static instance: LoggingService;
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel = LogLevel.Info;
    private logs: LogEntry[] = [];
    private readonly maxLogsLength = 1000;

    constructor(private readonly configService: ConfigurationService) {
        LoggingService.instance = this;
        this.outputChannel = vscode.window.createOutputChannel('M31 Agent');
        this.setLogLevel(this.getLogLevelFromConfig());

        this.configService.onConfigChanged(() => {
            this.setLogLevel(this.getLogLevelFromConfig());
        });
    }

    public static getInstance(): LoggingService {
        if (!LoggingService.instance) {
            throw new Error('LoggingService not initialized');
        }
        return LoggingService.instance;
    }

    private getLogLevelFromConfig(): LogLevel {
        const logLevelString = this.configService.getLogLevel();
        
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
    }

    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
        this.debug(`Log level set to ${LogLevel[level]}`);
    }

    public getLogLevel(): LogLevel {
        return this.logLevel;
    }

    public debug(message: string, data?: any): void {
        this.log(LogLevel.Debug, message, data);
    }

    public info(message: string, data?: any): void {
        this.log(LogLevel.Info, message, data);
    }

    public warning(message: string, data?: any): void {
        this.log(LogLevel.Warning, message, data);
    }

    public error(message: string, data?: any): void {
        this.log(LogLevel.Error, message, data);
    }

    private log(level: LogLevel, message: string, data?: any): void {
        if (level < this.logLevel) {
            return;
        }

        const timestamp = new Date();
        const logEntry: LogEntry = {
            level,
            message,
            timestamp,
            data
        };

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogsLength) {
            this.logs.shift();
        }

        const formattedMessage = this.formatLogEntry(logEntry);
        this.outputChannel.appendLine(formattedMessage);

        if (level === LogLevel.Error) {
            console.error(formattedMessage);
        }
    }

    private formatLogEntry(entry: LogEntry): string {
        const levelString = LogLevel[entry.level].padEnd(7);
        const timestamp = entry.timestamp.toISOString();
        let message = `[${timestamp}] [${levelString}] ${entry.message}`;

        if (entry.data) {
            try {
                if (entry.data instanceof Error) {
                    message += `\n${entry.data.stack || entry.data.message}`;
                } else if (typeof entry.data === 'object') {
                    message += `\n${JSON.stringify(entry.data, null, 2)}`;
                } else {
                    message += `\n${String(entry.data)}`;
                }
            } catch (error) {
                message += `\n[Error serializing log data: ${error}]`;
            }
        }

        return message;
    }

    public show(): void {
        this.outputChannel.show();
    }

    public getLogs(): LogEntry[] {
        return [...this.logs];
    }

    public clearLogs(): void {
        this.logs = [];
        this.outputChannel.clear();
    }

    public exportLogs(): string {
        return this.logs.map(log => this.formatLogEntry(log)).join('\n');
    }

    public trackEvent(eventName: string, properties?: Record<string, string>): void {
        this.debug(`TELEMETRY: ${eventName}`, properties);
    }

    public dispose(): void {
        this.outputChannel.dispose();
        LoggingService.instance = undefined as any;
    }
} 