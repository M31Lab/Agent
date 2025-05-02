import * as vscode from 'vscode';
import { ConfigurationService } from '../../services/configuration/configurationService';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../../services/telemetry/telemetryService';
import { AuthenticationService } from '../../services/authentication/authenticationService';
import { BrowserService } from '../../services/browser/browserService';
import { TerminalService } from '../../services/terminal/terminalService';
import { CheckpointService } from '../../services/checkpoint/checkpointService';
import { ContextToolsService } from '../../services/contextTools/contextToolsService';
import { CustomToolsService } from '../../services/customTools/customToolsService';
import { BrowserTestingService } from '../../services/browser/browserTestingService';
import { CheckpointComparisonService } from '../../services/checkpoint/checkpointComparisonService';
import { WebSearchService } from '../../services/search/webSearchService';
import { McpService } from '../../services/mcp/mcpService';
import { DiagnosticsMonitoringService } from '../../services/diagnostics/diagnosticsMonitoringService';
import { CodebaseUnderstandingService } from '../../services/codeAnalysis/codebaseUnderstandingService';
import { GitService } from '../../services/git/gitService';
import { CodeShareService } from '../../services/code/codeShareService';
import { OptimizedCompletionService } from '../../services/codeCompletion/optimizedCompletionService';
import { ApiClient } from '../../api/apiClient';
import { PerformanceMonitoringService } from '../../services/performance/performanceMonitoringService';

export class ExtensionContext {
    private disposables: vscode.Disposable[] = [];
    
    // Agent Services
    public browserService?: BrowserService;
    public terminalService?: TerminalService;
    public checkpointService?: CheckpointService;
    public contextToolsService?: ContextToolsService;
    public customToolsService?: CustomToolsService;
    public browserTestingService?: BrowserTestingService;
    public checkpointComparisonService?: CheckpointComparisonService;
    public webSearchService?: WebSearchService;
    public mcpService?: McpService;
    public diagnosticsMonitoringService?: DiagnosticsMonitoringService;
    public codebaseUnderstandingService?: CodebaseUnderstandingService;
    public gitService?: GitService;
    public codeShareService?: CodeShareService;
    public optimizedCompletionService?: OptimizedCompletionService;
    public apiClient?: ApiClient;
    public performanceMonitoringService?: PerformanceMonitoringService;

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
    
    public get globalStoragePath(): string {
        return this.vscodeContext.globalStoragePath;
    }

    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
} 