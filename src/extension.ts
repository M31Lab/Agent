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

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        const configService = new ConfigurationService(context);
        await configService.initialize();

        const loggingService = new LoggingService(configService);
        loggingService.info('M31-Agent Extension Activated');

        const telemetryService = new TelemetryService(configService);
        const authService = new AuthenticationService(context, configService);
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