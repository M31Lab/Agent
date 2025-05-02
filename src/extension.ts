import * as vscode from 'vscode';
import { registerAllCommands } from './commands/commandRegistry';
import { ExtensionContext } from './models/context/extensionContext';
import { initializeServices } from './services/serviceInitializer';
import { StatusBarManager } from './components/statusBar/statusBarManager';
import { TelemetryService } from './services/telemetry/telemetryService';
import { LoggingService } from './utils/logging/loggingService';
import { ChatPanelProvider } from './components/chat/chatPanelProvider';
import { ConfigurationService } from './services/configuration/configurationService';
import { AuthenticationService } from './services/authentication/authenticationService';
import { BrowserService } from './services/browser/browserService';
import { BrowserTestingService } from './services/browser/browserTestingService';
import { CheckpointService } from './services/checkpoint/checkpointService';
import { CheckpointComparisonService } from './services/checkpoint/checkpointComparisonService';
import { WebSearchService } from './services/search/webSearchService';
import { McpService } from './services/mcp/mcpService';
import { DiagnosticsMonitoringService } from './services/diagnostics/diagnosticsMonitoringService';
import { WelcomeService } from './services/welcome/welcomeService';
// Import sidebar view providers
import { ChatViewProvider } from './views/chatView';
import { CodebaseViewProvider } from './views/codebaseView';
import { DiagnosticsViewProvider } from './views/diagnosticsView';
import { DashboardViewProvider } from './views/dashboardView';
import { CodeExplorerViewProvider } from './views/codeExplorerView';
import { ModelConfigViewProvider } from './views/modelConfigView';
import { PerformanceViewProvider } from './views/performanceView';
import { PanelManager } from './components/panelManager';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('M31-Agent: Starting activation...');
    try {
        console.log('M31-Agent: Creating ConfigurationService...');
        const configService = new ConfigurationService(context);
        await configService.initialize();

        console.log('M31-Agent: Creating LoggingService...');
        const loggingService = new LoggingService(configService);
        loggingService.info('M31-Agent Extension Activated');

        console.log('M31-Agent: Creating TelemetryService and AuthenticationService...');
        const telemetryService = new TelemetryService(configService, loggingService);
        const authService = new AuthenticationService(context, configService, loggingService);
        await authService.initialize();

        console.log('M31-Agent: Creating ExtensionContext...');
        const extensionContext = new ExtensionContext(
            context,
            configService,
            loggingService,
            telemetryService,
            authService
        );

        console.log('M31-Agent: Initializing services...');
        await initializeServices(extensionContext);
        
        // Initialize welcome service and handle first run
        console.log('M31-Agent: Creating WelcomeService...');
        const welcomeService = new WelcomeService(extensionContext);
        extensionContext.registerDisposable(welcomeService);
        
        console.log('M31-Agent: Initializing StatusBarManager...');
        const statusBarManager = new StatusBarManager(extensionContext);
        statusBarManager.initialize();
        
        console.log('M31-Agent: Creating ChatPanelProvider...');
        const chatPanelProvider = new ChatPanelProvider(extensionContext);
        
        console.log('M31-Agent: Registering commands...');
        registerAllCommands(extensionContext, {
            statusBarManager,
            chatPanelProvider
        });

        // Initialize new services
        console.log('M31-Agent: Initializing additional services...');
        extensionContext.browserService = new BrowserService();
        extensionContext.browserTestingService = BrowserTestingService.getInstance(extensionContext);
        extensionContext.checkpointService = new CheckpointService(extensionContext);
        extensionContext.checkpointComparisonService = new CheckpointComparisonService(extensionContext);
        extensionContext.webSearchService = WebSearchService.getInstance(extensionContext);
        extensionContext.mcpService = McpService.getInstance(extensionContext);
        extensionContext.diagnosticsMonitoringService = DiagnosticsMonitoringService.getInstance(extensionContext);
        
        // Register these services for disposal
        extensionContext.registerDisposable(extensionContext.browserService!);
        extensionContext.registerDisposable(extensionContext.browserTestingService!);
        extensionContext.registerDisposable(extensionContext.checkpointService!);
        extensionContext.registerDisposable(extensionContext.checkpointComparisonService!);
        extensionContext.registerDisposable(extensionContext.webSearchService!);
        extensionContext.registerDisposable(extensionContext.mcpService!);
        extensionContext.registerDisposable(extensionContext.diagnosticsMonitoringService!);

        // Register sidebar views
        console.log('M31-Agent: Registering sidebar views...');
        const chatViewProvider = new ChatViewProvider(context.extensionUri);
        const codebaseViewProvider = new CodebaseViewProvider();
        const diagnosticsViewProvider = new DiagnosticsViewProvider();
        const dashboardViewProvider = new DashboardViewProvider(context.extensionUri);
        const codeExplorerViewProvider = new CodeExplorerViewProvider(context.extensionUri);
        const modelConfigViewProvider = new ModelConfigViewProvider(context.extensionUri);
        const performanceViewProvider = new PerformanceViewProvider(context.extensionUri, extensionContext);
        
        // Connect the chat view provider to the chat panel provider
        chatViewProvider.setChatPanelProvider(chatPanelProvider);
        
        // Connect dashboard view to panel manager
        dashboardViewProvider.setPanelManager(new PanelManager(extensionContext));

        // Register tree data providers and webview providers
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                ChatViewProvider.viewType,
                chatViewProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            ),
            vscode.window.registerWebviewViewProvider(
                DashboardViewProvider.viewType,
                dashboardViewProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            ),
            vscode.window.registerWebviewViewProvider(
                CodeExplorerViewProvider.viewType,
                codeExplorerViewProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            ),
            vscode.window.registerWebviewViewProvider(
                ModelConfigViewProvider.viewType,
                modelConfigViewProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            ),
            vscode.window.registerWebviewViewProvider(
                PerformanceViewProvider.viewType,
                performanceViewProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            ),
            vscode.window.registerTreeDataProvider(
                'm31-agent.diagnosticsView',
                diagnosticsViewProvider
            ),
            vscode.window.registerTreeDataProvider(
                'm31-agent.codebaseView',
                codebaseViewProvider
            ),
            // Register commands for the views
            vscode.commands.registerCommand('m31-agent.diagnosticsView.refresh', () => {
                diagnosticsViewProvider.refresh();
            }),
            vscode.commands.registerCommand('m31-agent.codebaseView.refresh', () => {
                codebaseViewProvider.refresh();
            })
        );

        // Add diagnostics status bar indicator
        console.log('M31-Agent: Setting up diagnostics status bar...');
        const diagnosticsStatusBar = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        
        diagnosticsStatusBar.command = 'm31-agent.diagnostics.showAll';
        extensionContext.registerDisposable(diagnosticsStatusBar);
        
        // Update status bar with current diagnostics
        const updateDiagnosticsStatusBar = (): void => {
            let counts = { errors: 0, warnings: 0, information: 0, hints: 0 };
            
            // Try to get counts from the diagnostics service
            try {
                if (extensionContext.diagnosticsMonitoringService) {
                    counts = extensionContext.diagnosticsMonitoringService.getErrorCount();
                } else {
                    // Fallback to the diagnostics view provider
                    counts = diagnosticsViewProvider.getErrorCount();
                }
            } catch (error) {
                // Additional fallback - if both methods fail, use the vscode.languages.getDiagnostics API directly
                try {
                    const allDiagnostics = vscode.languages.getDiagnostics();
                    for (const [, fileDiagnostics] of allDiagnostics) {
                        for (const diagnostic of fileDiagnostics) {
                            if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                                counts.errors++;
                            } else if (diagnostic.severity === vscode.DiagnosticSeverity.Warning) {
                                counts.warnings++;
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to count diagnostics:', err);
                }
            }
            
            if (counts.errors > 0) {
                diagnosticsStatusBar.text = `$(error) ${counts.errors} Error${counts.errors === 1 ? '' : 's'}`;
                diagnosticsStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                diagnosticsStatusBar.show();
            } else if (counts.warnings > 0) {
                diagnosticsStatusBar.text = `$(warning) ${counts.warnings} Warning${counts.warnings === 1 ? '' : 's'}`;
                diagnosticsStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                diagnosticsStatusBar.show();
            } else {
                diagnosticsStatusBar.hide();
            }
        };
        
        // Initialize and listen for changes
        updateDiagnosticsStatusBar();
        
        // Register for diagnostic changes
        try {
            if (extensionContext.diagnosticsMonitoringService) {
                extensionContext.registerDisposable(
                    extensionContext.diagnosticsMonitoringService.onDiagnosticsEvent(() => {
                        updateDiagnosticsStatusBar();
                    })
                );
            } else {
                // Fallback - listen to VS Code's built-in diagnostic events
                extensionContext.registerDisposable(
                    vscode.languages.onDidChangeDiagnostics(() => {
                        updateDiagnosticsStatusBar();
                    })
                );
            }
        } catch (error) {
            // If service registration fails, at least listen to VS Code's events
            extensionContext.registerDisposable(
                vscode.languages.onDidChangeDiagnostics(() => {
                    updateDiagnosticsStatusBar();
                })
            );
        }

        // Handle first run experience
        console.log('M31-Agent: Handling first run experience...');
        await welcomeService.handleFirstRun();

        console.log('M31-Agent: Activation completed successfully');
        loggingService.info('M31-Agent Extension Successfully Initialized');
        telemetryService.trackEvent('extension_activated');
    } catch (error) {
        console.error('Failed to activate M31-Agent extension:', error);
        vscode.window.showErrorMessage('Failed to activate M31-Agent extension. See output channel for details.');
    }
}

export function deactivate(): void {
    TelemetryService.getInstance()?.trackEvent('extension_deactivated');
    LoggingService.getInstance()?.info('M31-Agent Extension Deactivated');
} 