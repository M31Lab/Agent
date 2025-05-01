import * as vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { LanguageSupportService } from './languageSupport/languageSupportService';
import { CodebaseAnalysisService } from './codeAnalysis/codebaseAnalysisService';
import { FileOperationsService } from './fileOperations/fileOperationsService';
import { TerminalService } from './terminal/terminalService';

/**
 * Initializes all services in the correct order to handle dependencies
 */
export async function initializeServices(context: ExtensionContext): Promise<void> {
    context.loggingService.info('Initializing extension services');
    
    try {
        // Initialize and register services
        const languageSupportService = new LanguageSupportService(context);
        await languageSupportService.initialize();
        context.registerDisposable(languageSupportService);
        
        const codebaseAnalysisService = new CodebaseAnalysisService(context);
        await codebaseAnalysisService.initialize();
        context.registerDisposable(codebaseAnalysisService);
        
        const fileOperationsService = new FileOperationsService(context);
        await fileOperationsService.initialize();
        context.registerDisposable(fileOperationsService);
        
        const terminalService = new TerminalService(context);
        await terminalService.initialize();
        context.registerDisposable(terminalService);
        
        // Track telemetry
        context.telemetryService.trackEvent('services_initialized');
        context.loggingService.info('Extension services successfully initialized');
    } catch (error) {
        context.loggingService.error('Error initializing extension services', error);
        throw error;
    }
}