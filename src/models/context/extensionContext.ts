import * as vscode from 'vscode';
import { ConfigurationService } from '../../services/configuration/configurationService';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../../services/telemetry/telemetryService';
import { AuthenticationService } from '../../services/authentication/authenticationService';

export class ExtensionContext {
    private disposables: vscode.Disposable[] = [];

    constructor(
        public readonly vscodeContext: vscode.ExtensionContext,
        public readonly configurationService: ConfigurationService,
        public readonly loggingService: LoggingService,
        public readonly telemetryService: TelemetryService,
        public readonly authenticationService: AuthenticationService
    ) {}

    public registerDisposable(disposable: vscode.Disposable): void {
        this.disposables.push(disposable);
        this.vscodeContext.subscriptions.push(disposable);
    }

    public get extensionPath(): string {
        return this.vscodeContext.extensionPath;
    }

    public get subscriptions(): vscode.Disposable[] {
        return this.vscodeContext.subscriptions;
    }

    public get globalState(): vscode.Memento {
        return this.vscodeContext.globalState;
    }

    public get workspaceState(): vscode.Memento {
        return this.vscodeContext.workspaceState;
    }

    public get storagePath(): string | undefined {
        return this.vscodeContext.storagePath;
    }

    public get logPath(): string {
        return this.vscodeContext.logPath;
    }

    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
} 