import * as vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { LanguageSupportService } from './languageSupport/languageSupportService';
import { CodebaseAnalysisService } from './codeAnalysis/codebaseAnalysisService';
import { FileOperationsService } from './fileOperations/fileOperationsService';
import { TerminalService } from './terminal/terminalService';
import { BrowserService } from './browser/browserService';
import { CheckpointService } from './checkpoint/checkpointService';
import { ContextToolsService } from './contextTools/contextToolsService';
import { CustomToolsService } from './customTools/customToolsService';

/**
 * Initializes all services in the correct order to handle dependencies
 */
export async function initializeServices(context: ExtensionContext): Promise<void> {
    context.loggingService.info('Initializing extension services');
    
    try {
        // Initialize and register core services
        const languageSupportService = new LanguageSupportService(context);
        await languageSupportService.initialize();
        context.registerDisposable(languageSupportService);
        
        const codebaseAnalysisService = new CodebaseAnalysisService(context);
        await codebaseAnalysisService.initialize();
        context.registerDisposable(codebaseAnalysisService);
        
        const fileOperationsService = new FileOperationsService(context);
        await fileOperationsService.initialize();
        context.registerDisposable(fileOperationsService);
        
        // Initialize terminal service
        const terminalService = new TerminalService();
        context.registerDisposable(terminalService);
        context.terminalService = terminalService;
        
        // Initialize browser service
        const browserService = new BrowserService();
        context.registerDisposable(browserService);
        context.browserService = browserService;
        
        // Initialize checkpoint service
        const checkpointService = new CheckpointService(context.vscodeContext);
        context.registerDisposable(checkpointService);
        context.checkpointService = checkpointService;
        
        // Initialize context tools service
        const contextToolsService = new ContextToolsService();
        context.registerDisposable(contextToolsService);
        context.contextToolsService = contextToolsService;
        
        // Initialize custom tools service
        const customToolsService = new CustomToolsService(context.vscodeContext);
        context.registerDisposable(customToolsService);
        context.customToolsService = customToolsService;
        
        // Track telemetry
        context.telemetryService.trackEvent('services_initialized');
        context.loggingService.info('Extension services successfully initialized');
    } catch (error) {
        context.loggingService.error('Error initializing extension services', error);
        throw error;
    }
}