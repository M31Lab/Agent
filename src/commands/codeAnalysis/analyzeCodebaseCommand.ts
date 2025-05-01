import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';

export class AnalyzeCodebaseCommand {
    constructor(private context: ExtensionContext) {}

    public register(): vscode.Disposable {
        return vscode.commands.registerCommand('m31-agent.codeAnalysis.analyzeCodebase', async () => {
            try {
                const codebaseUnderstandingService = this.context.codebaseUnderstandingService;
                
                if (!codebaseUnderstandingService) {
                    throw new Error('Codebase understanding service not initialized');
                }
                
                vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: 'Analyzing codebase...',
                        cancellable: false
                    },
                    async (progress) => {
                        try {
                            progress.report({ message: 'Starting analysis...' });
                            
                            // Full codebase analysis
                            progress.report({ message: 'Analyzing codebase structure...' });
                            const analysisResult = await codebaseUnderstandingService.analyzeFullCodebase();
                            
                            progress.report({ message: 'Generating overview...' });
                            const overview = await codebaseUnderstandingService.generateCodebaseOverview();
                            
                            progress.report({ message: 'Extracting architecture...' });
                            const architecture = await codebaseUnderstandingService.extractArchitecturalPatterns();
                            
                            progress.report({ message: 'Building dependency graph...' });
                            const dependencyGraph = await codebaseUnderstandingService.getDependencyGraph();
                            
                            // Display results in a webview
                            this.showAnalysisResults(overview, architecture, analysisResult, dependencyGraph);
                            
                            return 'Codebase analysis complete';
                        } catch (error) {
                            this.context.loggingService.error('Error analyzing codebase', error);
                            throw error;
                        }
                    }
                );
            } catch (error) {
                this.context.loggingService.error('Failed to run codebase analysis', error);
                vscode.window.showErrorMessage(`Failed to analyze codebase: ${error.message}`);
            }
        });
    }

    private showAnalysisResults(
        overview: any,
        architecture: any, 
        analysisResult: any,
        dependencyGraph: any
    ): void {
        // Create webview panel
        const panel = vscode.window.createWebviewPanel(
            'codebaseAnalysis',
            'Codebase Analysis',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        // Generate HTML content to display the analysis results
        panel.webview.html = this.generateResultsHtml(overview, architecture, analysisResult, dependencyGraph);
        
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'showFileDependencies':
                        this.showFileDependencies(message.file);
                        return;
                    case 'showModuleInsights':
                        this.showModuleInsights(message.module);
                        return;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private async showFileDependencies(filePath: string): Promise<void> {
        try {
            const codebaseUnderstandingService = this.context.codebaseUnderstandingService;
            
            if (!codebaseUnderstandingService) {
                throw new Error('Codebase understanding service not initialized');
            }
            
            const relationships = await codebaseUnderstandingService.findRelationships(filePath);
            
            // Create webview to show relationships
            const panel = vscode.window.createWebviewPanel(
                'fileDependencies',
                `Dependencies: ${filePath}`,
                vscode.ViewColumn.Two,
                { enableScripts: true }
            );
            
            panel.webview.html = this.generateFileDependenciesHtml(relationships);
        } catch (error) {
            this.context.loggingService.error(`Error showing file dependencies for ${filePath}`, error);
            vscode.window.showErrorMessage(`Failed to analyze file dependencies: ${error.message}`);
        }
    }

    private async showModuleInsights(modulePath: string): Promise<void> {
        try {
            const codebaseUnderstandingService = this.context.codebaseUnderstandingService;
            
            if (!codebaseUnderstandingService) {
                throw new Error('Codebase understanding service not initialized');
            }
            
            const insights = await codebaseUnderstandingService.getModuleInsights(modulePath);
            
            // Create webview to show insights
            const panel = vscode.window.createWebviewPanel(
                'moduleInsights',
                `Module Insights: ${modulePath}`,
                vscode.ViewColumn.Two,
                { enableScripts: true }
            );
            
            panel.webview.html = this.generateModuleInsightsHtml(insights);
        } catch (error) {
            this.context.loggingService.error(`Error showing module insights for ${modulePath}`, error);
            vscode.window.showErrorMessage(`Failed to analyze module insights: ${error.message}`);
        }
    }

    private generateResultsHtml(
        overview: any,
        architecture: any,
        analysisResult: any,
        dependencyGraph: any
    ): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Codebase Analysis</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                    }
                    .container {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .card {
                        background-color: var(--vscode-input-background);
                        border-radius: 4px;
                        padding: 16px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    h1, h2, h3 {
                        color: var(--vscode-editor-foreground);
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        text-align: left;
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-input-border);
                    }
                    th {
                        background-color: var(--vscode-editor-selectionBackground);
                    }
                    .file-link {
                        color: var(--vscode-textLink-foreground);
                        cursor: pointer;
                        text-decoration: underline;
                    }
                    .module-link {
                        color: var(--vscode-textLink-foreground);
                        cursor: pointer;
                        text-decoration: underline;
                    }
                    .hotspot {
                        color: var(--vscode-errorForeground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <h1>Codebase Overview</h1>
                        <table>
                            <tr>
                                <td>Project Name</td>
                                <td>${overview.projectName}</td>
                            </tr>
                            <tr>
                                <td>Project Type</td>
                                <td>${overview.projectType}</td>
                            </tr>
                            <tr>
                                <td>Architecture</td>
                                <td>${overview.architectureType}</td>
                            </tr>
                            <tr>
                                <td>Build System</td>
                                <td>${overview.buildSystem}</td>
                            </tr>
                            <tr>
                                <td>Total Files</td>
                                <td>${overview.fileCount}</td>
                            </tr>
                            <tr>
                                <td>Total Lines</td>
                                <td>${overview.totalLineCount.toLocaleString()}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="card">
                        <h2>Language Distribution</h2>
                        <table>
                            <tr>
                                <th>Language</th>
                                <th>Files</th>
                                <th>Lines</th>
                                <th>Percentage</th>
                            </tr>
                            ${overview.languageSummary.map(lang => `
                                <tr>
                                    <td>${lang.language}</td>
                                    <td>${lang.fileCount}</td>
                                    <td>${lang.totalLines.toLocaleString()}</td>
                                    <td>${lang.percentage.toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                    
                    <div class="card">
                        <h2>Main Modules</h2>
                        <table>
                            <tr>
                                <th>Name</th>
                                <th>Path</th>
                                <th>Purpose</th>
                                <th>Files</th>
                                <th>Actions</th>
                            </tr>
                            ${overview.mainModules.map(module => `
                                <tr>
                                    <td>${module.name}</td>
                                    <td>${module.path}</td>
                                    <td>${module.purpose}</td>
                                    <td>${module.fileCount}</td>
                                    <td>
                                        <span class="module-link" onclick="showModuleInsights('${module.path}')">
                                            View Insights
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                    
                    <div class="card">
                        <h2>Complexity Hotspots</h2>
                        <table>
                            <tr>
                                <th>File</th>
                                <th>Lines</th>
                                <th>Complexity</th>
                                <th>Reason</th>
                            </tr>
                            ${analysisResult.complexityHotspots.slice(0, 10).map(hotspot => `
                                <tr class="hotspot">
                                    <td class="file-link" onclick="showFileDependencies('${hotspot.filePath}')">
                                        ${hotspot.filePath}
                                    </td>
                                    <td>${hotspot.startLine}-${hotspot.endLine}</td>
                                    <td>${hotspot.complexity}</td>
                                    <td>${hotspot.reason}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                    
                    <div class="card">
                        <h2>Architectural Patterns</h2>
                        <table>
                            <tr>
                                <th>Pattern</th>
                                <th>Confidence</th>
                                <th>Locations</th>
                            </tr>
                            ${architecture.patterns.map(pattern => `
                                <tr>
                                    <td>${pattern.name}</td>
                                    <td>${(pattern.confidence * 100).toFixed(0)}%</td>
                                    <td>${pattern.locations.length} files</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function showFileDependencies(file) {
                        vscode.postMessage({
                            command: 'showFileDependencies',
                            file: file
                        });
                    }
                    
                    function showModuleInsights(module) {
                        vscode.postMessage({
                            command: 'showModuleInsights',
                            module: module
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    private generateFileDependenciesHtml(relationships: any): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>File Dependencies</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                    }
                    .container {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .card {
                        background-color: var(--vscode-input-background);
                        border-radius: 4px;
                        padding: 16px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    h1, h2, h3 {
                        color: var(--vscode-editor-foreground);
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        text-align: left;
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-input-border);
                    }
                    th {
                        background-color: var(--vscode-editor-selectionBackground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <h1>File Dependencies: ${relationships.file}</h1>
                        
                        <h2>Imports (${relationships.imports.length})</h2>
                        <table>
                            <tr>
                                <th>Module/File</th>
                            </tr>
                            ${relationships.imports.map(imp => `
                                <tr>
                                    <td>${imp}</td>
                                </tr>
                            `).join('')}
                        </table>
                        
                        <h2>Imported By (${relationships.importedBy.length})</h2>
                        <table>
                            <tr>
                                <th>File</th>
                            </tr>
                            ${relationships.importedBy.map(imp => `
                                <tr>
                                    <td>${imp}</td>
                                </tr>
                            `).join('')}
                        </table>
                        
                        <h2>Related Files</h2>
                        <table>
                            <tr>
                                <th>File</th>
                                <th>Relationship</th>
                                <th>Strength</th>
                            </tr>
                            ${relationships.relatedFiles.map(related => `
                                <tr>
                                    <td>${related.path}</td>
                                    <td>${related.relationReason}</td>
                                    <td>${related.relationStrength}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    private generateModuleInsightsHtml(insights: any): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Module Insights</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                    }
                    .container {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .card {
                        background-color: var(--vscode-input-background);
                        border-radius: 4px;
                        padding: 16px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    h1, h2, h3 {
                        color: var(--vscode-editor-foreground);
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        text-align: left;
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-input-border);
                    }
                    th {
                        background-color: var(--vscode-editor-selectionBackground);
                    }
                    .stats {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                    }
                    .stat-item {
                        flex: 1;
                        min-width: 120px;
                        margin: 10px;
                        padding: 15px;
                        background-color: var(--vscode-badge-background);
                        border-radius: 4px;
                        text-align: center;
                    }
                    .stat-value {
                        font-size: 24px;
                        font-weight: bold;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <h1>Module Insights: ${insights.path}</h1>
                        
                        <div class="stats">
                            <div class="stat-item">
                                <div>Complexity</div>
                                <div class="stat-value">${insights.complexity.toFixed(1)}</div>
                            </div>
                            <div class="stat-item">
                                <div>Usage Count</div>
                                <div class="stat-value">${insights.usageCount}</div>
                            </div>
                            <div class="stat-item">
                                <div>Change Frequency</div>
                                <div class="stat-value">${insights.changeFrequency.toFixed(1)}</div>
                            </div>
                        </div>
                        
                        <h2>Exported Symbols (${insights.exportedSymbols.length})</h2>
                        <table>
                            <tr>
                                <th>Symbol</th>
                            </tr>
                            ${insights.exportedSymbols.map(symbol => `
                                <tr>
                                    <td>${symbol}</td>
                                </tr>
                            `).join('')}
                        </table>
                        
                        <h2>Imported Modules</h2>
                        <table>
                            <tr>
                                <th>Module</th>
                            </tr>
                            ${insights.importedModules.map(module => `
                                <tr>
                                    <td>${module}</td>
                                </tr>
                            `).join('')}
                        </table>
                        
                        <h2>Documentation</h2>
                        <pre>${insights.documentation}</pre>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
} 