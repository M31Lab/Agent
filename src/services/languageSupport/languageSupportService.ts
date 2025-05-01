import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';
import { languageDefinitions } from './languageDefinitions';

export interface LanguageFeatures {
    id: string;
    fileExtensions: string[];
    commentStart: string;
    commentEnd?: string;
    lineComment: string;
    brackets: [string, string][];
    autoClosingPairs: [string, string][];
    surroundingPairs: [string, string][];
    folding?: {
        markers: {
            start: string;
            end: string;
        };
    };
}

export class LanguageSupportService implements vscode.Disposable {
    private static instance: LanguageSupportService | undefined;
    private context: ExtensionContext;
    private supportedLanguages: Map<string, LanguageFeatures> = new Map();
    private subscriptions: vscode.Disposable[] = [];
    private loggingService: LoggingService | undefined;

    constructor(context: ExtensionContext) {
        this.context = context;
        LanguageSupportService.instance = this;
        this.loggingService = context.loggingService;
    }

    public static getInstance(): LanguageSupportService | undefined {
        return LanguageSupportService.instance;
    }

    public async initialize(): Promise<void> {
        this.loggingService?.info('Initializing language support service');
        
        // Initialize language definitions
        for (const language of languageDefinitions) {
            this.supportedLanguages.set(language.id, language);
        }
        
        // Register language features
        this.registerLanguageFeatures();
        
        // Register document formatters
        this.registerDocumentFormatters();
        
        this.loggingService?.info(`Initialized support for ${this.supportedLanguages.size} languages`);
    }

    private registerLanguageFeatures(): void {
        // Listen for document open events to provide language-specific features
        const documentOpenListener = vscode.workspace.onDidOpenTextDocument(document => {
            const languageId = document.languageId;
            if (this.isLanguageSupported(languageId)) {
                this.activateLanguageFeatures(document);
            }
        });
        
        this.subscriptions.push(documentOpenListener);
        
        // Activate for all already open documents
        vscode.workspace.textDocuments.forEach(document => {
            if (this.isLanguageSupported(document.languageId)) {
                this.activateLanguageFeatures(document);
            }
        });
    }

    private registerDocumentFormatters(): void {
        // Register formatters for supported languages
        const formatter = vscode.languages.registerDocumentFormattingEditProvider(
            this.getSupportedLanguageSelectors(),
            {
                provideDocumentFormattingEdits: async (document) => {
                    return this.formatDocument(document);
                }
            }
        );
        
        this.subscriptions.push(formatter);
    }

    private activateLanguageFeatures(document: vscode.TextDocument): void {
        // Based on the language, provide specific features
        const languageId = document.languageId;
        this.loggingService?.debug(`Activating features for ${languageId}`);
        
        // Additional language-specific setup could be done here
    }

    private async formatDocument(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
        // This would use specific formatting logic based on language
        // For now, it's just a stub that doesn't change the document
        return [];
    }

    public isLanguageSupported(languageId: string): boolean {
        return this.supportedLanguages.has(languageId);
    }

    public getLanguageFeatures(languageId: string): LanguageFeatures | undefined {
        return this.supportedLanguages.get(languageId);
    }

    public getSupportedLanguageIds(): string[] {
        return Array.from(this.supportedLanguages.keys());
    }

    private getSupportedLanguageSelectors(): vscode.DocumentSelector {
        return this.getSupportedLanguageIds().map(id => ({ language: id }));
    }

    public getCommentForLanguage(languageId: string): { line: string; block?: [string, string] } {
        const language = this.supportedLanguages.get(languageId);
        if (!language) {
            // Default to // comments if language not found
            return { line: '//' };
        }
        
        const result: { line: string; block?: [string, string] } = {
            line: language.lineComment
        };
        
        if (language.commentStart && language.commentEnd) {
            result.block = [language.commentStart, language.commentEnd];
        }
        
        return result;
    }

    public getFileExtensionsForLanguage(languageId: string): string[] {
        const language = this.supportedLanguages.get(languageId);
        return language ? language.fileExtensions : [];
    }

    public getLanguageForFileExtension(extension: string): string | undefined {
        for (const [id, language] of this.supportedLanguages.entries()) {
            if (language.fileExtensions.includes(extension)) {
                return id;
            }
        }
        return undefined;
    }

    public dispose(): void {
        this.subscriptions.forEach(s => s.dispose());
        this.subscriptions = [];
    }
}