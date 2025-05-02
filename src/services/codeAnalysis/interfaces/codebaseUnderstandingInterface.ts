import * as vscode from 'vscode';
import { _CodeContext } from '../../../models/codebase/codeContext';
import { _CodeSummary } from '../codeAnalysisService';
import { CodeAnalysisResult, _FileContext, _CodeSnippet } from '../codebaseAnalysisService';

export interface ICodebaseUnderstandingService {
    analyzeFullCodebase(): Promise<CodebaseAnalysisResult>;
    
    generateCodebaseOverview(): Promise<CodebaseOverview>;
    
    findRelationships(filePath: string): Promise<FileRelationshipMap>;
    
    analyzeCodeFlow(functionName: string): Promise<CodeFlowAnalysis>;
    
    extractArchitecturalPatterns(): Promise<ArchitecturalPatternMap>;
    
    getContextAwareCompletion(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]>;
    
    getRelevantFilesForTask(taskDescription: string): Promise<RelevantFileResult[]>;
    
    getSymbolUsageAnalysis(symbolName: string): Promise<SymbolUsageAnalysis>;
    
    getDependencyGraph(): Promise<DependencyGraphResult>;
    
    getModuleInsights(modulePath: string): Promise<ModuleInsights>;
}

export interface CodebaseAnalysisResult extends CodeAnalysisResult {
    recentChanges: FileChange[];
    complexityHotspots: ComplexityHotspot[];
    languageDistribution: LanguageDistribution[];
    dependencyInsights: DependencyInsight[];
}

export interface CodebaseOverview {
    projectName: string;
    rootFolders: string[];
    fileCount: number;
    totalSize: number;
    totalLineCount: number;
    languageSummary: LanguageDistribution[];
    mainModules: ModuleSummary[];
    entryPoints: string[];
    projectType: string;
    architectureType: string;
    buildSystem: string;
}

export interface FileRelationshipMap {
    file: string;
    imports: string[];
    importedBy: string[];
    relatedFiles: Array<{
        path: string;
        relationStrength: number;
        relationReason: string;
    }>;
}

export interface CodeFlowAnalysis {
    entryFunction: {
        name: string;
        location: vscode.Location;
    };
    callGraph: CallNode[];
    dataFlow: DataFlowNode[];
    executionPaths: ExecutionPath[];
}

export interface ArchitecturalPatternMap {
    patterns: Array<{
        name: string;
        confidence: number;
        locations: Array<{
            file: string;
            startLine: number;
            endLine: number;
        }>;
    }>;
    architecturalLayers: string[];
    componentRelationships: Array<{
        source: string;
        target: string;
        type: string;
    }>;
}

export interface RelevantFileResult {
    uri: vscode.Uri;
    relevanceScore: number;
    matchReason: string;
    snippets: Array<{
        text: string;
        range: vscode.Range;
    }>;
}

export interface SymbolUsageAnalysis {
    symbolName: string;
    definition: vscode.Location;
    usageCount: number;
    usageLocations: vscode.Location[];
    modificationLocations: vscode.Location[];
    usagePatterns: string[];
}

export interface DependencyGraphResult {
    nodes: Array<{
        id: string;
        type: 'file' | 'directory' | 'package';
        name: string;
        path: string;
    }>;
    edges: Array<{
        source: string;
        target: string;
        type: 'imports' | 'extends' | 'implements' | 'uses';
    }>;
}

export interface ModuleInsights {
    path: string;
    exportedSymbols: string[];
    importedModules: string[];
    usageCount: number;
    complexity: number;
    changeFrequency: number;
    testCoverage?: number;
    documentation: string;
}

export interface FileChange {
    filePath: string;
    lastModified: Date;
    changeFrequency: number;
}

export interface ComplexityHotspot {
    filePath: string;
    startLine: number;
    endLine: number;
    complexity: number;
    reason: string;
}

export interface LanguageDistribution {
    language: string;
    fileCount: number;
    percentage: number;
    totalLines: number;
}

export interface DependencyInsight {
    name: string;
    version: string;
    usageCount: number;
    importLocations: string[];
}

export interface ModuleSummary {
    name: string;
    path: string;
    purpose: string;
    fileCount: number;
    exportedItems: string[];
}

export interface CallNode {
    functionName: string;
    location: vscode.Location;
    callsTo: string[];
    calledBy: string[];
}

export interface DataFlowNode {
    variableName: string;
    definition: vscode.Location;
    usages: vscode.Location[];
    dataType: string;
    scope: string;
}

export interface ExecutionPath {
    path: Array<{
        function: string;
        location: vscode.Location;
    }>;
    conditions: string[];
    probability: number;
} 