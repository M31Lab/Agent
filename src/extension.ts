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

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        const configService = new ConfigurationService(context);
        await configService.initialize();

        const loggingService = new LoggingService(configService);
        loggingService.info('M31-Agent Extension Activated');

        const telemetryService = new TelemetryService(configService, loggingService);
        const authService = new AuthenticationService(context, configService, loggingService);
        await authService.initialize();

        const extensionContext = new ExtensionContext(
            context,
            configService,
            loggingService,
            telemetryService,
            authService
        );

        await initializeServices(extensionContext);
        
        const statusBarManager = new StatusBarManager(extensionContext);
        statusBarManager.initialize();
        
        const chatPanelProvider = new ChatPanelProvider(extensionContext);
        
        registerAllCommands(extensionContext, {
            statusBarManager,
            chatPanelProvider
        });

        // Initialize new services
        extensionContext.browserService = new BrowserService();
        extensionContext.browserTestingService = BrowserTestingService.getInstance(extensionContext);
        extensionContext.checkpointService = new CheckpointService(extensionContext.vscodeContext);
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

        // Add diagnostics status bar indicator
        const diagnosticsStatusBar = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        
        diagnosticsStatusBar.command = 'm31-agent.diagnostics.showAll';
        extensionContext.registerDisposable(diagnosticsStatusBar);
        
        // Update status bar with current diagnostics
        const updateDiagnosticsStatusBar = (): void => {
            const diagnosticsService = extensionContext.diagnosticsMonitoringService;
            if (!diagnosticsService) {
                return;
            }
            
            const counts = diagnosticsService.getErrorCount();
            
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
        extensionContext.registerDisposable(
            extensionContext.diagnosticsMonitoringService!.onDiagnosticsEvent(() => {
                updateDiagnosticsStatusBar();
            })
        );

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