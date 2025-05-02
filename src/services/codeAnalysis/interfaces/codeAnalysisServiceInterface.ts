import * as vscode from 'vscode';
import { CodeContext } from '../../../models/codebase/codeContext';
import { CodeSummary, DependencyInfo, SearchResult } from '../codeAnalysisService';

export interface ICodeAnalysisService {
    /**
     * Analyzes the current active document and returns context
     */
    analyzeCurrentDocument(): Promise<CodeContext>;

    /**
     * Analyzes the workspace structure
     */
    analyzeWorkspace(): Promise<string[]>;

    /**
     * Gets the context for a specific file
     */
    getFileContext(uri: vscode.Uri): Promise<CodeContext>;

    /**
     * Finds the definition of a symbol
     */
    findDefinition(symbol: string): Promise<vscode.Location | undefined>;

    /**
     * Finds code snippets similar to the provided code
     */
    getSimilarCode(codeSnippet: string, maxResults?: number): Promise<string[]>;

    /**
     * Analyzes a file and returns a summary of its contents
     */
    analyzeFile(filePath: string): Promise<CodeSummary | undefined>;

    /**
     * Analyzes a document and returns a summary of its contents
     */
    analyzeDocument(document: vscode.TextDocument): CodeSummary;

    /**
     * Finds dependencies in a directory
     */
    findDependencies(directoryPath: string, includeNodeModules?: boolean): Promise<DependencyInfo[]>;

    /**
     * Finds all function definitions in a document
     */
    findFunctionDefinitions(document: vscode.TextDocument): Promise<vscode.Location[]>;

    /**
     * Finds all references to a symbol at a specific position
     */
    findReferences(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Location[]>;

    /**
     * Finds files relevant to a search query
     */
    findRelevantFiles(searchQuery: string, maxResults?: number): Promise<SearchResult[]>;
} 