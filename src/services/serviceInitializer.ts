import * as _vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { LanguageSupportService } from './languageSupport/languageSupportService';
import { CodebaseAnalysisService } from './codeAnalysis/codebaseAnalysisService';
import { CodebaseUnderstandingService } from './codeAnalysis/codebaseUnderstandingService';
import { FileOperationsService } from './fileOperations/fileOperationsService';
import { TerminalService } from './terminal/terminalService';
import { BrowserService } from './browser/browserService';
import { CheckpointService } from './checkpoint/checkpointService';
import { ContextToolsService } from './contextTools/contextToolsService';
import { CustomToolsService } from './customTools/customToolsService';
import { GitService } from './git/gitService';
import { CodeShareService } from './code/codeShareService';
import { OptimizedCompletionService } from './codeCompletion/optimizedCompletionService';
import { PerformanceMonitoringService } from './performance/performanceMonitoringService';
import { OpenRouterApiClient } from '../api/client/openRouterApiClient';

/**
 * Initializes all services in the correct order to handle dependencies
 */
export async function initializeServices(context: ExtensionContext): Promise<void> {
    context.loggingService.info('Initializing extension services');
    
    try {
        // Initialize API client
        try {
            const apiClient = new OpenRouterApiClient(
                context.configurationService,
                context.authenticationService,
                context.loggingService,
                context
            );
            apiClient.initialize();
            context.apiClient = apiClient;
            context.registerDisposable(apiClient);
            context.loggingService.info('API client initialized');
        } catch (error) {
            context.loggingService.error('Failed to initialize API client', error);
        }
        
        // Initialize performance monitoring service
        try {
            const performanceMonitoringService = PerformanceMonitoringService.getInstance(context);
            context.performanceMonitoringService = performanceMonitoringService;
            context.registerDisposable(performanceMonitoringService);
            context.loggingService.info('Performance monitoring service initialized');
        } catch (error) {
            context.loggingService.error('Failed to initialize Performance monitoring service', error);
        }
        
        // Initialize and register core services
        const languageSupportService = new LanguageSupportService(context);
        await languageSupportService.initialize();
        context.registerDisposable(languageSupportService);
        
        const codebaseAnalysisService = new CodebaseAnalysisService(context);
        await codebaseAnalysisService.initialize();
        context.registerDisposable(codebaseAnalysisService);
        
        // Initialize codebase understanding service
        const codebaseUnderstandingService = new CodebaseUnderstandingService(context);
        await codebaseUnderstandingService.initialize();
        context.registerDisposable(codebaseUnderstandingService);
        context.codebaseUnderstandingService = codebaseUnderstandingService;
        
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
        const contextToolsService = new ContextToolsService(context);
        context.registerDisposable(contextToolsService);
        context.contextToolsService = contextToolsService;
        
        // Initialize custom tools service
        const customToolsService = new CustomToolsService(context.vscodeContext);
        context.registerDisposable(customToolsService);
        context.customToolsService = customToolsService;
        
        // Initialize Git Service
        try {
            const gitService = new GitService(context);
            context.gitService = gitService;
            context.registerDisposable(gitService);
            context.loggingService.info('Git service initialized');
        } catch (error) {
            context.loggingService.error('Failed to initialize Git service', error);
        }
        
        // Initialize Code Share Service
        try {
            const codeShareService = new CodeShareService(context);
            context.codeShareService = codeShareService;
            context.registerDisposable(codeShareService);
            context.loggingService.info('Code Share service initialized');
        } catch (error) {
            context.loggingService.error('Failed to initialize Code Share service', error);
        }
        
        // Initialize Optimized Completion Service
        try {
            const optimizedCompletionService = new OptimizedCompletionService(context);
            context.optimizedCompletionService = optimizedCompletionService;
            context.registerDisposable(optimizedCompletionService);
            context.loggingService.info('Optimized Completion service initialized');
        } catch (error) {
            context.loggingService.error('Failed to initialize Optimized Completion service', error);
        }

        // Track telemetry
        context.telemetryService.trackEvent('services_initialized');
        context.loggingService.info('Extension services successfully initialized');
    } catch (error) {
        context.loggingService.error('Error initializing extension services', error);
        throw error;
    }
}