import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LanguageSupportService } from '../languageSupport/languageSupportService';
import { CodebaseAnalysisService } from './codebaseAnalysisService';
import {
  ICodebaseUnderstandingService,
  CodebaseAnalysisResult,
  CodebaseOverview,
  FileRelationshipMap,
  CodeFlowAnalysis,
  ArchitecturalPatternMap,
  RelevantFileResult,
  SymbolUsageAnalysis,
  DependencyGraphResult,
  ModuleInsights,
  FileChange,
  ComplexityHotspot,
  LanguageDistribution,
  DependencyInsight,
  ModuleSummary,
  CallNode,
  DataFlowNode,
  ExecutionPath,
} from './interfaces/codebaseUnderstandingInterface';

export class CodebaseUnderstandingService
  implements ICodebaseUnderstandingService, vscode.Disposable
{
  private context: ExtensionContext;
  private subscriptions: vscode.Disposable[] = [];
  private languageSupport: LanguageSupportService;
  private codebaseAnalysis: CodebaseAnalysisService;
  private lastFullAnalysisTimestamp: number = 0;
  private fullAnalysisCache: CodebaseAnalysisResult | null = null;
  private relationshipCache: Map<string, FileRelationshipMap> = new Map();
  private dependencyGraphCache: DependencyGraphResult | null = null;
  private static readonly CACHE_EXPIRY_MS = 600000; // 10 minutes

  constructor(context: ExtensionContext) {
    this.context = context;
    this.languageSupport = new LanguageSupportService(context);
    this.codebaseAnalysis = new CodebaseAnalysisService(context);
  }

  public async initialize(): Promise<void> {
    this.context.loggingService.info('Initializing codebase understanding service');

    await this.languageSupport.initialize();
    await this.codebaseAnalysis.initialize();

    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');

    fileWatcher.onDidCreate(() => this.invalidateCache());
    fileWatcher.onDidChange(() => this.invalidateCache());
    fileWatcher.onDidDelete(() => this.invalidateCache());

    this.subscriptions.push(fileWatcher);
    this.subscriptions.push(this.languageSupport);
    this.subscriptions.push(this.codebaseAnalysis);

    vscode.workspace.onDidChangeWorkspaceFolders(() => this.invalidateCache());

    this.context.loggingService.info('Codebase understanding service initialized');
  }

  public async analyzeFullCodebase(): Promise<CodebaseAnalysisResult> {
    const currentTimestamp = Date.now();

    if (
      this.fullAnalysisCache &&
      currentTimestamp - this.lastFullAnalysisTimestamp <
        CodebaseUnderstandingService.CACHE_EXPIRY_MS
    ) {
      return this.fullAnalysisCache;
    }

    this.context.loggingService.info('Running full codebase analysis');

    try {
      const baseAnalysis = await this.codebaseAnalysis.analyzeWorkspace();

      const recentChanges = await this.getRecentFileChanges();
      const complexityHotspots = await this.findComplexityHotspots(
        baseAnalysis.files.map((f) => f.path)
      );
      const languageDistribution = this.calculateLanguageDistribution(baseAnalysis);
      const dependencyInsights = await this.analyzeDependencies();

      const result: CodebaseAnalysisResult = {
        ...baseAnalysis,
        recentChanges,
        complexityHotspots,
        languageDistribution,
        dependencyInsights,
      };

      this.fullAnalysisCache = result;
      this.lastFullAnalysisTimestamp = currentTimestamp;

      this.context.loggingService.info('Full codebase analysis complete');

      return result;
    } catch (error) {
      this.context.loggingService.error('Failed to analyze full codebase', error);
      throw error;
    }
  }

  public async generateCodebaseOverview(): Promise<CodebaseOverview> {
    try {
      const analysis = await this.analyzeFullCodebase();
      const mainPackageJson = await this.findMainPackageJson();

      const projectName =
        mainPackageJson?.name ||
        path.basename(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
      const buildSystem = this.determineBuildSystem(analysis.files.map((f) => f.path));
      const projectType = this.determineProjectType(
        analysis.files.map((f) => f.path),
        mainPackageJson
      );
      const entryPoints = this.findEntryPoints(
        analysis.files.map((f) => f.path),
        projectType
      );
      const mainModules = await this.analyzeMainModules(entryPoints);

      const result: CodebaseOverview = {
        projectName,
        rootFolders: analysis.rootFolders,
        fileCount: analysis.files.length,
        totalSize: analysis.totalSize,
        totalLineCount: analysis.totalLines,
        languageSummary: analysis.languageDistribution,
        mainModules,
        entryPoints,
        projectType,
        architectureType: this.determineArchitectureType(analysis.files.map((f) => f.path)),
        buildSystem,
      };

      return result;
    } catch (error) {
      this.context.loggingService.error('Failed to generate codebase overview', error);
      throw error;
    }
  }

  public async findRelationships(filePath: string): Promise<FileRelationshipMap> {
    if (this.relationshipCache.has(filePath)) {
      return this.relationshipCache.get(filePath)!;
    }

    try {
      const fileUri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(fileUri);

      const imports = await this.extractImports(document);
      const importedBy = await this.findFilesImporting(filePath);

      const relatedFiles = await this.findRelatedFiles(filePath, imports, importedBy);

      const result: FileRelationshipMap = {
        file: filePath,
        imports,
        importedBy,
        relatedFiles,
      };

      this.relationshipCache.set(filePath, result);

      return result;
    } catch (error) {
      this.context.loggingService.error(`Failed to find relationships for ${filePath}`, error);
      throw error;
    }
  }

  public async analyzeCodeFlow(functionName: string): Promise<CodeFlowAnalysis> {
    try {
      const definition = await this.findFunctionDefinition(functionName);

      if (!definition) {
        throw new Error(`Function ${functionName} not found in codebase`);
      }

      const document = await vscode.workspace.openTextDocument(definition.uri);
      const functionRange = definition.range;

      // Extract function calls first
      await this.extractFunctionCalls(document.getText(), document);

      const callGraph = await this.buildCallGraph(functionName, definition);
      const dataFlow = await this.analyzeDataFlow(document, functionRange);
      const executionPaths = await this.analyzeExecutionPaths(callGraph);

      return {
        entryFunction: {
          name: functionName,
          location: definition,
        },
        callGraph,
        dataFlow,
        executionPaths,
      };
    } catch (error) {
      this.context.loggingService.error(`Failed to analyze code flow for ${functionName}`, error);
      throw error;
    }
  }

  public async extractArchitecturalPatterns(): Promise<ArchitecturalPatternMap> {
    try {
      const analysis = await this.analyzeFullCodebase();
      const filesByFolder = this.groupFilesByFolder(analysis.files.map((f) => f.path));

      const patterns = await this.detectPatterns(filesByFolder);
      const layers = this.detectArchitecturalLayers(filesByFolder);
      const components = await this.detectComponentRelationships(filesByFolder);

      return {
        patterns,
        architecturalLayers: layers,
        componentRelationships: components,
      };
    } catch (error) {
      this.context.loggingService.error('Failed to extract architectural patterns', error);
      throw error;
    }
  }

  public async getContextAwareCompletion(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    try {
      const wordRange = document.getWordRangeAtPosition(position);
      const word = wordRange ? document.getText(wordRange) : '';

      // Find imports in the current file
      const imports = await this.extractImports(document);

      // Find symbols in current scope
      const symbols =
        (await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
          'vscode.executeDocumentSymbolProvider',
          document.uri
        )) || [];

      const completionItems: vscode.CompletionItem[] = [];

      // Add imported symbols
      for (const importPath of imports) {
        try {
          const importUri = await this.resolveImportPath(document.uri, importPath);
          if (importUri) {
            const importSymbols =
              (await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
                'vscode.executeDocumentSymbolProvider',
                importUri
              )) || [];

            for (const symbol of importSymbols) {
              if (symbol.name.startsWith(word)) {
                const item = new vscode.CompletionItem(
                  symbol.name,
                  this.symbolKindToCompletionItemKind(symbol.kind)
                );
                item.detail = `${symbol.name} (from ${path.basename(importPath)})`;
                item.documentation = `Imported from ${importPath}`;
                completionItems.push(item);
              }
            }
          }
        } catch (error) {
          this.context.loggingService.error(`Error resolving import: ${importPath}`, error);
        }
      }

      // Add local symbols
      for (const symbol of symbols) {
        if (symbol.name.startsWith(word)) {
          const item = new vscode.CompletionItem(
            symbol.name,
            this.symbolKindToCompletionItemKind(symbol.kind)
          );
          item.detail = symbol.name;
          completionItems.push(item);
        }
      }

      return completionItems;
    } catch (error) {
      this.context.loggingService.error('Failed to get context-aware completion', error);
      return [];
    }
  }

  public async getRelevantFilesForTask(taskDescription: string): Promise<RelevantFileResult[]> {
    try {
      const analysis = await this.analyzeFullCodebase();
      const relevantFiles: RelevantFileResult[] = [];

      for (const file of analysis.files) {
        try {
          const uri = vscode.Uri.file(file.path);
          const content = await this.readFile(file.path);

          // Basic relevance calculation based on keyword matching
          const keywords = taskDescription.toLowerCase().split(/\s+/);

          let relevanceScore = 0;
          const matchingLines: Array<{ text: string; line: number }> = [];

          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lowerLine = line.toLowerCase();

            for (const keyword of keywords) {
              if (lowerLine.includes(keyword)) {
                relevanceScore += 1;
                matchingLines.push({ text: line, line: i });
                break;
              }
            }
          }

          // Use filename relevance as well
          const filename = path.basename(file.path).toLowerCase();
          for (const keyword of keywords) {
            if (filename.includes(keyword)) {
              relevanceScore += 5; // Filename matches are more relevant
            }
          }

          if (relevanceScore > 0) {
            const snippets = matchingLines.map((ml) => ({
              text: ml.text,
              range: new vscode.Range(ml.line, 0, ml.line, ml.text.length),
            }));

            relevantFiles.push({
              uri,
              relevanceScore,
              matchReason: `Contains ${matchingLines.length} lines matching search terms`,
              snippets,
            });
          }
        } catch (error) {
          this.context.loggingService.error(
            `Error analyzing file for task relevance: ${file.path}`,
            error
          );
        }
      }

      // Sort by relevance score descending
      return relevantFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      this.context.loggingService.error('Failed to get relevant files for task', error);
      throw error;
    }
  }

  public async getSymbolUsageAnalysis(symbolName: string): Promise<SymbolUsageAnalysis> {
    try {
      const locations =
        (await vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeReferenceProvider',
          vscode.window.activeTextEditor?.document.uri,
          vscode.window.activeTextEditor?.selection.active
        )) || [];

      // Find definition
      const definitions =
        (await vscode.commands.executeCommand<vscode.Location[]>(
          'vscode.executeDefinitionProvider',
          vscode.window.activeTextEditor?.document.uri,
          vscode.window.activeTextEditor?.selection.active
        )) || [];

      const definition = definitions.length > 0 ? definitions[0] : undefined;

      if (!definition) {
        throw new Error(`Definition for symbol ${symbolName} not found`);
      }

      // Separate usage into read and write operations
      const modificationLocations: vscode.Location[] = [];
      const usageLocations: vscode.Location[] = [];

      for (const location of locations) {
        const document = await vscode.workspace.openTextDocument(location.uri);
        const line = document.lineAt(location.range.start.line);
        const isModification = this.isSymbolModified(
          line.text,
          symbolName,
          location.range.start.character
        );

        if (isModification) {
          modificationLocations.push(location);
        } else {
          usageLocations.push(location);
        }
      }

      // Analyze usage patterns
      const usagePatterns = this.analyzeUsagePatterns(
        symbolName,
        usageLocations,
        modificationLocations
      );

      return {
        symbolName,
        definition: definition!,
        usageCount: locations.length,
        usageLocations,
        modificationLocations,
        usagePatterns,
      };
    } catch (error) {
      this.context.loggingService.error(`Failed to analyze symbol usage for ${symbolName}`, error);
      throw error;
    }
  }

  public async getDependencyGraph(): Promise<DependencyGraphResult> {
    if (this.dependencyGraphCache !== null) {
      return this.dependencyGraphCache;
    }

    try {
      const analysis = await this.analyzeFullCodebase();

      const nodes: DependencyGraphResult['nodes'] = [];
      const edges: DependencyGraphResult['edges'] = [];

      // Add all files as nodes
      for (const file of analysis.files) {
        const fileId = this.getNodeId(file.path);
        nodes.push({
          id: fileId,
          type: 'file',
          name: path.basename(file.path),
          path: file.path,
        });
      }

      // Add directories as nodes
      const directories = this.getAllDirectories(analysis.files.map((f) => f.path));
      for (const dir of directories) {
        const dirId = this.getNodeId(dir);
        nodes.push({
          id: dirId,
          type: 'directory',
          name: path.basename(dir),
          path: dir,
        });
      }

      // Add package dependencies
      if (analysis.dependencyInsights) {
        for (const dep of analysis.dependencyInsights) {
          const depId = `pkg:${dep.name}`;
          nodes.push({
            id: depId,
            type: 'package',
            name: dep.name,
            path: '',
          });

          // Connect package dependencies to files
          for (const location of dep.importLocations) {
            edges.push({
              source: this.getNodeId(location),
              target: depId,
              type: 'imports',
            });
          }
        }
      }

      // Add edges for imports between files
      for (const file of analysis.files) {
        try {
          const fileRelationships = await this.findRelationships(file.path);
          const fileId = this.getNodeId(file.path);

          for (const importedFile of fileRelationships.imports) {
            const resolvedPath = await this.resolveRelativePath(file.path, importedFile);
            if (resolvedPath) {
              const importedId = this.getNodeId(resolvedPath);
              edges.push({
                source: fileId,
                target: importedId,
                type: 'imports',
              });
            }
          }
        } catch (error) {
          this.context.loggingService.error(
            `Error building dependency graph for ${file.path}`,
            error
          );
        }
      }

      const result: DependencyGraphResult = { nodes, edges };
      this.dependencyGraphCache = result;

      return result;
    } catch (error) {
      this.context.loggingService.error('Failed to generate dependency graph', error);
      throw error;
    }
  }

  public async getModuleInsights(modulePath: string): Promise<ModuleInsights> {
    try {
      const directory = path.isAbsolute(modulePath)
        ? modulePath
        : path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, modulePath);

      if (!fs.existsSync(directory)) {
        throw new Error(`Module path ${modulePath} does not exist`);
      }

      const files = await this.findFilesInDirectory(directory);

      const exportedSymbols: string[] = [];
      const importedModules: string[] = [];
      let complexity = 0;
      let usageCount = 0;
      let changeFrequency = 0;

      for (const file of files) {
        try {
          const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));

          // Extract exports
          const fileExports = await this.extractExports(document);
          exportedSymbols.push(...fileExports);

          // Extract imports
          const fileImports = await this.extractImports(document);
          importedModules.push(...fileImports);

          // Calculate complexity
          complexity += await this.calculateFileComplexity(document);

          // Find usage count
          usageCount += await this.getFileUsageCount(file);

          // Get change frequency
          const changes = await this.getFileChangeFrequency(file);
          changeFrequency += changes;
        } catch (error) {
          this.context.loggingService.error(
            `Error analyzing file for module insights: ${file}`,
            error
          );
        }
      }

      // Generate documentation summary
      const documentation = this.generateModuleDocumentation(directory, files, exportedSymbols);

      return {
        path: modulePath,
        exportedSymbols: [...new Set(exportedSymbols)],
        importedModules: [...new Set(importedModules)],
        usageCount,
        complexity: complexity / Math.max(1, files.length),
        changeFrequency: changeFrequency / Math.max(1, files.length),
        documentation,
      };
    } catch (error) {
      this.context.loggingService.error(`Failed to get module insights for ${modulePath}`, error);
      throw error;
    }
  }

  private async findFunctionDefinition(functionName: string): Promise<vscode.Location | undefined> {
    try {
      const analysis = await this.analyzeFullCodebase();

      for (const file of analysis.files) {
        try {
          const uri = vscode.Uri.file(file.path);
          const document = await vscode.workspace.openTextDocument(uri);

          const functionRegex = new RegExp(
            `\\b(function|async\\s+function|const|let|var)\\s+${functionName}\\b|\\b${functionName}\\s*=\\s*(async\\s*)?\\([^)]*\\)\\s*=>|\\bclass\\s+${functionName}\\b`,
            'g'
          );
          const text = document.getText();
          let match;

          while ((match = functionRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            return new vscode.Location(uri, new vscode.Range(startPos, endPos));
          }
        } catch (error) {
          this.context.loggingService.error(`Error searching for function in ${file.path}`, error);
        }
      }

      return undefined;
    } catch (error) {
      this.context.loggingService.error(
        `Failed to find function definition for ${functionName}`,
        error
      );
      throw error;
    }
  }

  private isSymbolModified(lineText: string, symbolName: string, position: number): boolean {
    const beforeSymbol = lineText.substring(0, position);
    // Check if there's an assignment operator or increment/decrement before or after the symbol
    const hasModifierBefore = /=|\+=|-=|\*=|\/=|%=|\+\+|--/.test(beforeSymbol);
    const hasModifierAfter = lineText
      .substring(position)
      .match(new RegExp(`${symbolName}\\s*(\\+\\+|--)`));

    return hasModifierBefore || !!hasModifierAfter;
  }

  private analyzeUsagePatterns(
    symbolName: string,
    usageLocations: vscode.Location[],
    modificationLocations: vscode.Location[]
  ): string[] {
    const patterns: string[] = [];

    if (modificationLocations.length === 0 && usageLocations.length > 0) {
      patterns.push(`Read-only usage of "${symbolName}"`);
    }

    if (modificationLocations.length > 0 && usageLocations.length === 0) {
      patterns.push(`Write-only usage of "${symbolName}"`);
    }

    if (modificationLocations.length > 0 && usageLocations.length > 0) {
      patterns.push(`Read-write usage of "${symbolName}"`);
    }

    return patterns;
  }

  private symbolKindToCompletionItemKind(kind: vscode.SymbolKind): vscode.CompletionItemKind {
    switch (kind) {
      case vscode.SymbolKind.Function:
      case vscode.SymbolKind.Method:
        return vscode.CompletionItemKind.Function;
      case vscode.SymbolKind.Class:
        return vscode.CompletionItemKind.Class;
      case vscode.SymbolKind.Interface:
        return vscode.CompletionItemKind.Interface;
      case vscode.SymbolKind.Variable:
        return vscode.CompletionItemKind.Variable;
      case vscode.SymbolKind.Constant:
        return vscode.CompletionItemKind.Constant;
      case vscode.SymbolKind.Property:
        return vscode.CompletionItemKind.Property;
      default:
        return vscode.CompletionItemKind.Text;
    }
  }

  public dispose(): void {
    this.subscriptions.forEach((disposable) => disposable.dispose());
    this.subscriptions = [];
  }

  private invalidateCache(): void {
    this.fullAnalysisCache = null;
    this.relationshipCache.clear();
    this.dependencyGraphCache = null;
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      return content.toString();
    } catch (error) {
      this.context.loggingService.error(`Failed to read file: ${filePath}`, error);
      throw error;
    }
  }

  private getNodeId(path: string): string {
    return `file:${path}`;
  }

  private async findMainPackageJson(): Promise<unknown | null> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return null;
    }

    const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const packageJsonPath = path.join(rootPath, 'package.json');

    try {
      const content = await this.readFile(packageJsonPath);
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  private async findFilesInDirectory(directory: string): Promise<string[]> {
    const results: string[] = [];

    await this.traverseDirectory(directory, results);

    return results;
  }

  private async traverseDirectory(dirPath: string, results: string[]): Promise<void> {
    try {
      const files = await fs.promises.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.promises.stat(filePath);

        if (stat.isDirectory()) {
          await this.traverseDirectory(filePath, results);
        } else {
          results.push(filePath);
        }
      }
    } catch (error) {
      this.context.loggingService.error(`Error traversing directory ${dirPath}`, error);
    }
  }

  private async getRecentFileChanges(): Promise<FileChange[]> {
    try {
      const changes: FileChange[] = [];

      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return changes;
      }

      const analysis = await this.codebaseAnalysis.analyzeWorkspace();

      for (const file of analysis.files) {
        try {
          const uri = vscode.Uri.file(file.path);
          const stat = await vscode.workspace.fs.stat(uri);

          // Get Git history if available
          let changeFrequency = 0;
          try {
            const gitExecResult = await vscode.commands.executeCommand<{
              stdout: string;
              stderr: string;
            }>(
              'vscode.executeCommand',
              'git.execute',
              `log --format="%h" --follow -- "${file.path}"`
            );

            if (gitExecResult && gitExecResult.stdout) {
              changeFrequency = gitExecResult.stdout
                .split('\n')
                .filter((line) => line.trim().length > 0).length;
            }
          } catch (error) {
            // Git might not be available or file not tracked
            changeFrequency = 0;
          }

          changes.push({
            filePath: file.path,
            lastModified: new Date(stat.mtime),
            changeFrequency,
          });
        } catch (error) {
          this.context.loggingService.error(`Error getting file stats: ${file.path}`, error);
        }
      }

      // Sort by most recently modified
      return changes.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    } catch (error) {
      this.context.loggingService.error('Failed to get recent file changes', error);
      return [];
    }
  }

  private async findComplexityHotspots(filePaths: string[]): Promise<ComplexityHotspot[]> {
    const hotspots: ComplexityHotspot[] = [];

    for (const filePath of filePaths) {
      try {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);

        // Look for complex code patterns
        const text = document.getText();
        const lines = text.split('\n');

        // Find deeply nested code blocks
        let nestingLevel = 0;
        let blockStartLine = -1;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Count opening and closing braces to track nesting
          const openingBraces = (line.match(/{/g) || []).length;
          const closingBraces = (line.match(/}/g) || []).length;

          nestingLevel += openingBraces - closingBraces;

          // Start tracking a complex block
          if (nestingLevel >= 4 && blockStartLine === -1) {
            blockStartLine = i;
          }

          // End of a complex block
          if (nestingLevel < 4 && blockStartLine !== -1) {
            if (i - blockStartLine > 10) {
              hotspots.push({
                filePath,
                startLine: blockStartLine,
                endLine: i,
                complexity: i - blockStartLine,
                reason: 'Deeply nested code block',
              });
            }
            blockStartLine = -1;
          }
        }

        // Find long functions (more than 50 lines)
        const functionRegex =
          /function\s+\w+\s*\([^)]*\)\s*{|(\w+)\s*[=:]\s*(?:async\s*)?\([^)]*\)\s*(?:=>)?\s*{|\bclass\s+(\w+)(?:\s+extends\s+\w+)?\s*{/g;
        let match;
        let functionStartLine = -1;
        let functionName = '';

        while ((match = functionRegex.exec(text)) !== null) {
          const startPosition = document.positionAt(match.index);
          functionStartLine = startPosition.line;
          functionName = match[1] || match[2] || 'anonymous';

          // Find the closing brace
          let braceCount = 1;
          let pos = match.index + match[0].length;

          while (braceCount > 0 && pos < text.length) {
            if (text[pos] === '{') braceCount++;
            if (text[pos] === '}') braceCount--;
            pos++;
          }

          if (braceCount === 0) {
            const endPosition = document.positionAt(pos);
            const functionEndLine = endPosition.line;

            if (functionEndLine - functionStartLine > 50) {
              hotspots.push({
                filePath,
                startLine: functionStartLine,
                endLine: functionEndLine,
                complexity: functionEndLine - functionStartLine,
                reason: `Long function: ${functionName}`,
              });
            }
          }
        }

        // Find complex conditions
        const complexConditionRegex =
          /if\s*\([^()]*&&[^()]*&&[^()]*\)|if\s*\([^()]*\|\|[^()]*\|\|[^()]*\)/g;

        while ((match = complexConditionRegex.exec(text)) !== null) {
          const position = document.positionAt(match.index);
          hotspots.push({
            filePath,
            startLine: position.line,
            endLine: position.line,
            complexity: 5,
            reason: 'Complex conditional logic',
          });
        }
      } catch (error) {
        this.context.loggingService.error(`Error analyzing complexity for ${filePath}`, error);
      }
    }

    // Sort by complexity (highest first)
    return hotspots.sort((a, b) => b.complexity - a.complexity);
  }

  private calculateLanguageDistribution(analysis: {
    files: {
      path: string;
      language: string;
      size: number;
      lineCount: number;
    }[];
  }): LanguageDistribution[] {
    const languageDistribution: LanguageDistribution[] = [];
    const languageCounts = new Map<string, { files: number; lines: number }>();

    for (const file of analysis.files) {
      const language = file.language || 'unknown';
      const current = languageCounts.get(language) || { files: 0, lines: 0 };

      languageCounts.set(language, {
        files: current.files + 1,
        lines: current.lines + file.lineCount,
      });
    }

    const totalFiles = analysis.files.length;

    for (const [language, counts] of languageCounts.entries()) {
      languageDistribution.push({
        language,
        fileCount: counts.files,
        percentage: (counts.files / totalFiles) * 100,
        totalLines: counts.lines,
      });
    }

    // Sort by file count (most common first)
    return languageDistribution.sort((a, b) => b.fileCount - a.fileCount);
  }

  private async analyzeDependencies(): Promise<DependencyInsight[]> {
    const dependencies: DependencyInsight[] = [];

    try {
      // Look for package.json files in workspace
      const packageJsonFiles = await vscode.workspace.findFiles(
        '**/package.json',
        '**/node_modules/**'
      );

      for (const packageJsonUri of packageJsonFiles) {
        try {
          const content = await this.readFile(packageJsonUri.fsPath);
          const packageData = JSON.parse(content);

          // Process dependencies
          const allDeps = {
            ...(packageData.dependencies || {}),
            ...(packageData.devDependencies || {}),
          };

          for (const [name, version] of Object.entries(allDeps)) {
            let existingDep = dependencies.find((d) => d.name === name);

            if (!existingDep) {
              existingDep = {
                name,
                version: version as string,
                usageCount: 0,
                importLocations: [],
              };
              dependencies.push(existingDep);
            }
          }
        } catch (error) {
          this.context.loggingService.error(
            `Error parsing package.json: ${packageJsonUri.fsPath}`,
            error
          );
        }
      }

      // For each dependency, find imports in code
      if (dependencies.length > 0) {
        const jsTsFiles = await vscode.workspace.findFiles(
          '**/*.{js,jsx,ts,tsx}',
          '**/node_modules/**'
        );

        for (const fileUri of jsTsFiles) {
          try {
            const document = await vscode.workspace.openTextDocument(fileUri);
            const content = document.getText();

            for (const dependency of dependencies) {
              // Check for import statements
              const importRegex = new RegExp(
                `(?:import|require)\\s*\\(?[^)]*['"]${dependency.name}(?:/.+)?['"]`,
                'g'
              );

              if (importRegex.test(content)) {
                dependency.usageCount++;
                dependency.importLocations.push(fileUri.fsPath);
              }
            }
          } catch (error) {
            this.context.loggingService.error(`Error analyzing imports: ${fileUri.fsPath}`, error);
          }
        }
      }

      // Look for other dependency types (e.g., cargo.toml for Rust)
      const cargoTomlFiles = await vscode.workspace.findFiles('**/Cargo.toml', '**/target/**');

      for (const cargoUri of cargoTomlFiles) {
        try {
          const content = await this.readFile(cargoUri.fsPath);
          const depStart = content.indexOf('[dependencies]');

          if (depStart !== -1) {
            const lines = content.slice(depStart).split('\n');

            for (const line of lines) {
              const match = line.match(/^(\w+)\s*=\s*"([^"]+)"/);
              if (match) {
                const [_, name, version] = match;

                dependencies.push({
                  name,
                  version,
                  usageCount: 0,
                  importLocations: [],
                });
              }
            }
          }
        } catch (error) {
          this.context.loggingService.error(`Error parsing Cargo.toml: ${cargoUri.fsPath}`, error);
        }
      }

      return dependencies.sort((a, b) => b.usageCount - a.usageCount);
    } catch (error) {
      this.context.loggingService.error('Failed to analyze dependencies', error);
      return [];
    }
  }

  private determineBuildSystem(filePaths: string[]): string {
    // Check for build system files
    const fileNames = filePaths.map((f) => path.basename(f).toLowerCase());

    if (fileNames.includes('webpack.config.js')) return 'Webpack';
    if (fileNames.includes('rollup.config.js')) return 'Rollup';
    if (fileNames.includes('package.json')) return 'npm/yarn';
    if (fileNames.includes('cargo.toml')) return 'Cargo';
    if (fileNames.includes('makefile')) return 'Make';
    if (fileNames.includes('cmakelist.txt')) return 'CMake';
    if (fileNames.includes('build.gradle')) return 'Gradle';
    if (fileNames.includes('pom.xml')) return 'Maven';
    if (fileNames.includes('build.sbt')) return 'SBT';
    if (fileNames.includes('gulpfile.js')) return 'Gulp';
    if (fileNames.includes('gruntfile.js')) return 'Grunt';

    // Look for directories
    const directories = new Set(filePaths.map((f) => path.dirname(f)));
    if (directories.has('gradle') || directories.has('.gradle')) return 'Gradle';
    if (directories.has('maven') || directories.has('.maven')) return 'Maven';

    return 'Unknown';
  }

  private determineProjectType(filePaths: string[], packageJson: unknown[] | null): string {
    if (packageJson) {
      // Check for framework-specific dependencies
      const allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      const depNames = Object.keys(allDeps);

      if (depNames.includes('react')) return 'React';
      if (depNames.includes('next')) return 'Next.js';
      if (depNames.includes('@angular/core')) return 'Angular';
      if (depNames.includes('vue')) return 'Vue.js';
      if (depNames.includes('express')) return 'Express';
      if (depNames.includes('koa')) return 'Koa';
      if (depNames.includes('fastify')) return 'Fastify';
      if (depNames.includes('nest')) return 'NestJS';
      if (depNames.includes('electron')) return 'Electron';
      if (depNames.includes('vscode')) return 'VS Code Extension';
    }

    // Check for file patterns
    const fileNames = filePaths.map((f) => path.basename(f).toLowerCase());
    const fileExtensions = filePaths.map((f) => path.extname(f).toLowerCase());

    if (fileNames.includes('androidmanifest.xml')) return 'Android App';
    if (fileNames.includes('info.plist') && fileExtensions.includes('.swift')) return 'iOS App';
    if (fileNames.includes('cargo.toml')) return 'Rust Project';
    if (fileNames.includes('go.mod')) return 'Go Project';
    if (fileNames.includes('pom.xml')) return 'Java/Maven Project';
    if (fileNames.includes('build.gradle')) return 'Java/Gradle Project';
    if (fileExtensions.includes('.cs') && fileNames.includes('program.cs'))
      return '.NET Console App';
    if (fileExtensions.includes('.cs') && fileNames.some((f) => f.includes('controller')))
      return 'ASP.NET App';
    if (fileExtensions.includes('.py') && fileNames.includes('manage.py')) return 'Django App';
    if (fileExtensions.includes('.py') && fileNames.includes('app.py')) return 'Flask App';

    // Default detection based on primary language
    const languageCounts = new Map<string, number>();

    for (const filePath of filePaths) {
      const ext = path.extname(filePath).toLowerCase();

      let language = 'unknown';
      if (ext === '.js' || ext === '.jsx') language = 'JavaScript';
      if (ext === '.ts' || ext === '.tsx') language = 'TypeScript';
      if (ext === '.py') language = 'Python';
      if (ext === '.java') language = 'Java';
      if (ext === '.c' || ext === '.cpp' || ext === '.h') language = 'C/C++';
      if (ext === '.cs') language = 'C#';
      if (ext === '.go') language = 'Go';
      if (ext === '.rs') language = 'Rust';
      if (ext === '.rb') language = 'Ruby';
      if (ext === '.php') language = 'PHP';

      languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
    }

    let maxCount = 0;
    let primaryLanguage = 'Unknown';

    for (const [language, count] of languageCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        primaryLanguage = language;
      }
    }

    return `${primaryLanguage} Project`;
  }

  private findEntryPoints(filePaths: string[], projectType: string): string[] {
    const entryPoints: string[] = [];

    // Find common entry points based on project type
    switch (projectType) {
      case 'React':
        entryPoints.push(
          ...filePaths.filter(
            (f) =>
              f.endsWith('index.js') ||
              f.endsWith('index.tsx') ||
              f.endsWith('App.tsx') ||
              f.endsWith('App.jsx')
          )
        );
        break;

      case 'Node.js':
        entryPoints.push(
          ...filePaths.filter(
            (f) => f.endsWith('index.js') || f.endsWith('server.js') || f.endsWith('app.js')
          )
        );
        break;

      case 'Angular':
        entryPoints.push(
          ...filePaths.filter((f) => f.endsWith('main.ts') || f.endsWith('app.module.ts'))
        );
        break;

      case 'Vue.js':
        entryPoints.push(
          ...filePaths.filter(
            (f) => f.endsWith('main.js') || f.endsWith('main.ts') || f.endsWith('App.vue')
          )
        );
        break;

      case 'VS Code Extension':
        entryPoints.push(
          ...filePaths.filter(
            (f) =>
              f.endsWith('extension.ts') ||
              f.endsWith('extension.js') ||
              f.endsWith('activationEvents.json')
          )
        );
        break;

      default:
        // Generic entry point detection
        entryPoints.push(
          ...filePaths.filter(
            (f) =>
              f.endsWith('index.js') ||
              f.endsWith('index.ts') ||
              f.endsWith('main.js') ||
              f.endsWith('main.ts') ||
              f.endsWith('app.js') ||
              f.endsWith('app.ts') ||
              f.endsWith('program.cs') ||
              f.endsWith('Main.java') ||
              f.endsWith('main.py') ||
              f.endsWith('main.go') ||
              f.endsWith('main.rs')
          )
        );
        break;
    }

    return entryPoints;
  }

  private async analyzeMainModules(entryPoints: string[]): Promise<ModuleSummary[]> {
    const moduleSummaries: ModuleSummary[] = [];
    const directories = new Set<string>();

    // First, discover main directories from entry points
    for (const entryPoint of entryPoints) {
      const directory = path.dirname(entryPoint);
      directories.add(directory);

      // Also add parent "src" or "lib" directory if it exists
      const parentDir = path.dirname(directory);
      const parentName = path.basename(parentDir).toLowerCase();

      if (parentName === 'src' || parentName === 'lib' || parentName === 'app') {
        directories.add(parentDir);
      }
    }

    // Find module directories with many files (common modules)
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return moduleSummaries;
    }

    const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const srcDirPattern = path.join(rootPath, 'src');
    const libDirPattern = path.join(rootPath, 'lib');

    try {
      if (fs.existsSync(srcDirPattern)) {
        const srcDirs = fs.readdirSync(srcDirPattern);

        for (const dir of srcDirs) {
          const fullPath = path.join(srcDirPattern, dir);
          if (fs.statSync(fullPath).isDirectory()) {
            directories.add(fullPath);
          }
        }
      }

      if (fs.existsSync(libDirPattern)) {
        const libDirs = fs.readdirSync(libDirPattern);

        for (const dir of libDirs) {
          const fullPath = path.join(libDirPattern, dir);
          if (fs.statSync(fullPath).isDirectory()) {
            directories.add(fullPath);
          }
        }
      }
    } catch (error) {
      this.context.loggingService.error('Error scanning source directories', error);
    }

    // Analyze each module directory
    for (const directory of directories) {
      try {
        const directoryName = path.basename(directory);
        const files = await this.findFilesInDirectory(directory);

        if (files.length === 0) continue;

        // Find exported items
        const exportedItems: string[] = [];

        for (const file of files) {
          try {
            const ext = path.extname(file).toLowerCase();
            if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
              const uri = vscode.Uri.file(file);
              const document = await vscode.workspace.openTextDocument(uri);

              const fileExports = await this.extractExports(document);
              exportedItems.push(...fileExports);
            }
          } catch (error) {
            this.context.loggingService.error(`Error analyzing exports: ${file}`, error);
          }
        }

        // Infer module purpose
        const purpose = this.inferModulePurpose(directoryName, files, exportedItems);

        moduleSummaries.push({
          name: directoryName,
          path: directory,
          purpose,
          fileCount: files.length,
          exportedItems: exportedItems.slice(0, 10), // Limit to top 10 exports
        });
      } catch (error) {
        this.context.loggingService.error(`Error analyzing module: ${directory}`, error);
      }
    }

    // Sort by file count (largest modules first)
    return moduleSummaries.sort((a, b) => b.fileCount - a.fileCount);
  }

  private async extractImports(document: vscode.TextDocument): Promise<string[]> {
    const imports: string[] = [];
    const content = document.getText();
    const languageId = document.languageId;

    try {
      // JavaScript/TypeScript imports
      if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId)) {
        // ES6 imports
        const es6ImportRegex = /import\s+(?:{[^}]*}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/g;
        let match;

        while ((match = es6ImportRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }

        // CommonJS require
        const requireRegex =
          /(?:const|let|var)\s+(?:{[^}]*}|[\w*]+)\s+=\s+require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

        while ((match = requireRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }

        // Dynamic imports
        const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

        while ((match = dynamicImportRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }
      }

      // Python imports
      else if (languageId === 'python') {
        // Standard imports
        const pythonImportRegex = /^\s*import\s+([\w.]+)/gm;
        let match;

        while ((match = pythonImportRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }

        // From imports
        const fromImportRegex = /^\s*from\s+([\w.]+)\s+import/gm;

        while ((match = fromImportRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }
      }

      // Java imports
      else if (languageId === 'java') {
        const javaImportRegex = /^\s*import\s+([\w.]+(?:\*)?);/gm;
        let match;

        while ((match = javaImportRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }
      }

      // C# using statements
      else if (languageId === 'csharp') {
        const csharpUsingRegex = /^\s*using\s+([\w.]+);/gm;
        let match;

        while ((match = csharpUsingRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }
      }

      // Go imports
      else if (languageId === 'go') {
        const goImportRegex = /import\s+\(\s*((?:"[^"]+"\s*)+)\)/g;
        let match;

        while ((match = goImportRegex.exec(content)) !== null) {
          const importBlock = match[1];
          const importLines = importBlock.match(/"([^"]+)"/g) || [];

          for (const importLine of importLines) {
            imports.push(importLine.replace(/"/g, ''));
          }
        }

        // Single imports
        const goSingleImportRegex = /import\s+"([^"]+)"/g;

        while ((match = goSingleImportRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }
      }

      // Rust imports
      else if (languageId === 'rust') {
        const rustUseRegex = /^\s*use\s+([\w:]+)(?:{[^}]*})?;/gm;
        let match;

        while ((match = rustUseRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }
      }

      // C/C++ includes
      else if (['c', 'cpp'].includes(languageId)) {
        const cIncludeRegex = /#include\s+[<"]([^>"]+)[>"]/g;
        let match;

        while ((match = cIncludeRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }
      }
    } catch (error) {
      this.context.loggingService.error(
        `Error extracting imports from ${document.uri.fsPath}`,
        error
      );
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  private async findFilesImporting(filePath: string): Promise<string[]> {
    const importingFiles: string[] = [];
    try {
      const importingFilesPattern = '**/*.{js,jsx,ts,tsx,py,java,cs,go,rs,c,cpp,h,hpp}';
      const files = await vscode.workspace.findFiles(importingFilesPattern, '**/node_modules/**');

      const fileName = path.basename(filePath, path.extname(filePath));

      for (const file of files) {
        // Skip the file itself
        if (file.fsPath === filePath) {
          continue;
        }

        try {
          const document = await vscode.workspace.openTextDocument(file);
          const imports = await this.extractImports(document);

          for (const importPath of imports) {
            // Check for various import formats that might reference this file
            if (
              importPath === fileName ||
              importPath.endsWith(`/${fileName}`) ||
              // Relative path imports
              (await this.resolveImportPathMatches(file.fsPath, importPath, filePath))
            ) {
              importingFiles.push(file.fsPath);
              break;
            }
          }
        } catch (error) {
          this.context.loggingService.error(`Error checking imports in ${file.fsPath}`, error);
        }
      }
    } catch (error) {
      this.context.loggingService.error(`Error finding files importing ${filePath}`, error);
    }

    return importingFiles;
  }

  private async findRelatedFiles(
    filePath: string,
    imports: string[],
    importedBy: string[]
  ): Promise<Array<{ path: string; relationStrength: number; relationReason: string }>> {
    const relatedFiles: Array<{ path: string; relationStrength: number; relationReason: string }> =
      [];
    try {
      // Direct imports are strongly related
      for (const importPath of imports) {
        try {
          const resolvedPath = await this.resolveRelativePath(filePath, importPath);
          if (resolvedPath) {
            relatedFiles.push({
              path: resolvedPath,
              relationStrength: 5,
              relationReason: 'Directly imported',
            });
          }
        } catch (error) {
          this.context.loggingService.error(`Error resolving import: ${importPath}`, error);
        }
      }

      // Files importing this one are strongly related
      for (const importingFile of importedBy) {
        relatedFiles.push({
          path: importingFile,
          relationStrength: 4,
          relationReason: 'Imports this file',
        });
      }

      // Files in same directory are somewhat related
      const directoryPath = path.dirname(filePath);
      const filesInDirectory = await this.findFilesInDirectory(directoryPath);

      for (const dirFile of filesInDirectory) {
        if (dirFile !== filePath && !relatedFiles.some((rf) => rf.path === dirFile)) {
          relatedFiles.push({
            path: dirFile,
            relationStrength: 2,
            relationReason: 'Same directory',
          });
        }
      }

      // Files with similar names might be related
      const fileName = path.basename(filePath, path.extname(filePath));
      const analysis = await this.codebaseAnalysis.analyzeWorkspace();

      for (const file of analysis.files.map((f) => f.path)) {
        if (file === filePath) continue;

        const otherFileName = path.basename(file, path.extname(file));

        // Check for similar names (test files, etc.)
        if (
          otherFileName === `${fileName}.test` ||
          otherFileName === `${fileName}.spec` ||
          otherFileName === `test_${fileName}` ||
          otherFileName === `${fileName}Test` ||
          fileName === `${otherFileName}.test` ||
          fileName === `${otherFileName}.spec` ||
          fileName === `test_${otherFileName}` ||
          fileName === `${otherFileName}Test`
        ) {
          if (!relatedFiles.some((rf) => rf.path === file)) {
            relatedFiles.push({
              path: file,
              relationStrength: 3,
              relationReason: 'Test or related by naming',
            });
          }
        }
      }

      // Look for files with common imports
      for (const file of analysis.files.map((f) => f.path)) {
        if (file === filePath || relatedFiles.some((rf) => rf.path === file)) continue;

        try {
          const uri = vscode.Uri.file(file);
          const document = await vscode.workspace.openTextDocument(uri);
          const otherImports = await this.extractImports(document);

          // Count common imports
          const commonImports = imports.filter((imp) => otherImports.includes(imp));

          if (commonImports.length >= 3) {
            relatedFiles.push({
              path: file,
              relationStrength: commonImports.length,
              relationReason: `${commonImports.length} common imports`,
            });
          }
        } catch (error) {
          this.context.loggingService.error(`Error analyzing common imports: ${file}`, error);
        }
      }
    } catch (error) {
      this.context.loggingService.error(`Error finding related files for ${filePath}`, error);
    }

    // Sort by relation strength (highest first)
    return relatedFiles.sort((a, b) => b.relationStrength - a.relationStrength);
  }

  private async extractFunctionCalls(
    functionText: string,
    document: vscode.TextDocument
  ): Promise<string[]> {
    const calls: string[] = [];
    const languageId = document.languageId;

    try {
      // JavaScript/TypeScript function calls
      if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId)) {
        // Method and function calls
        const callRegex = /\b([a-zA-Z_$][\w$]*)\s*\(/g;
        let match;

        while ((match = callRegex.exec(functionText)) !== null) {
          const functionName = match[1];
          // Exclude common keywords and built-ins
          if (!['if', 'for', 'while', 'switch', 'catch'].includes(functionName)) {
            calls.push(functionName);
          }
        }
      }
      // Python function calls
      else if (languageId === 'python') {
        const callRegex = /\b([a-zA-Z_][\w]*)\s*\(/g;
        let match;

        while ((match = callRegex.exec(functionText)) !== null) {
          calls.push(match[1]);
        }
      }
      // Java/C# method calls
      else if (['java', 'csharp'].includes(languageId)) {
        const callRegex = /\b([a-zA-Z_][\w]*)\s*\(/g;
        let match;

        while ((match = callRegex.exec(functionText)) !== null) {
          calls.push(match[1]);
        }

        // Method calls on objects
        const objectCallRegex = /\.([a-zA-Z_][\w]*)\s*\(/g;

        while ((match = objectCallRegex.exec(functionText)) !== null) {
          calls.push(match[1]);
        }
      }
      // Rust function calls
      else if (languageId === 'rust') {
        const callRegex = /\b([a-zA-Z_][\w]*)\s*\(/g;
        let match;

        while ((match = callRegex.exec(functionText)) !== null) {
          calls.push(match[1]);
        }

        // Method calls
        const methodCallRegex = /\.([a-zA-Z_][\w]*)\s*\(/g;

        while ((match = methodCallRegex.exec(functionText)) !== null) {
          calls.push(match[1]);
        }
      }
    } catch (error) {
      this.context.loggingService.error('Error extracting function calls', error);
    }

    return [...new Set(calls)]; // Remove duplicates
  }

  private async buildCallGraph(
    functionName: string,
    definition: vscode.Location
  ): Promise<CallNode[]> {
    const callGraph: CallNode[] = [];
    const visited = new Set<string>();

    // Start with the root function
    await this.buildCallGraphRecursive(functionName, definition, callGraph, visited, 0);

    return callGraph;
  }

  private async buildCallGraphRecursive(
    functionName: string,
    location: vscode.Location,
    callGraph: CallNode[],
    visited: Set<string>,
    depth: number
  ): Promise<void> {
    // Prevent infinite recursion and limit depth
    if (visited.has(functionName) || depth > 3) {
      return;
    }

    visited.add(functionName);

    try {
      const document = await vscode.workspace.openTextDocument(location.uri);
      const functionText = document.getText(location.range);

      // Extract function calls
      const calls = await this.extractFunctionCalls(functionText, document);

      // Create node for this function
      const node: CallNode = {
        functionName,
        location,
        callsTo: calls,
        calledBy: [],
      };

      callGraph.push(node);

      // Recursively process called functions
      for (const calledFunction of calls) {
        try {
          const calledFunctionLocation = await this.findFunctionDefinition(calledFunction);

          if (calledFunctionLocation) {
            // Update called function's calledBy list
            const existingNode = callGraph.find((n) => n.functionName === calledFunction);

            if (existingNode) {
              existingNode.calledBy.push(functionName);
            } else {
              // Process the called function recursively
              await this.buildCallGraphRecursive(
                calledFunction,
                calledFunctionLocation,
                callGraph,
                visited,
                depth + 1
              );
            }
          }
        } catch (error) {
          this.context.loggingService.error(
            `Error processing function call: ${calledFunction}`,
            error
          );
        }
      }
    } catch (error) {
      this.context.loggingService.error(`Error building call graph for ${functionName}`, error);
    }
  }

  private async analyzeDataFlow(
    document: vscode.TextDocument,
    functionRange: vscode.Range
  ): Promise<DataFlowNode[]> {
    const dataFlow: DataFlowNode[] = [];
    const functionText = document.getText(functionRange);
    const languageId = document.languageId;

    try {
      // Extract variable declarations and usages
      if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId)) {
        // Variable declarations
        const varDeclarationRegex = /\b(const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*([^;]+);/g;
        let match;

        while ((match = varDeclarationRegex.exec(functionText)) !== null) {
          const varName = match[2];
          const initialValue = match[3].trim();
          const startPos = document.positionAt(functionRange.start.character + match.index);
          const endPos = document.positionAt(
            functionRange.start.character + match.index + match[0].length
          );
          const location = new vscode.Location(document.uri, new vscode.Range(startPos, endPos));

          // Get variable type if possible
          let dataType = 'unknown';
          if (initialValue.startsWith('"') || initialValue.startsWith("'")) {
            dataType = 'string';
          } else if (!isNaN(Number(initialValue))) {
            dataType = 'number';
          } else if (initialValue === 'true' || initialValue === 'false') {
            dataType = 'boolean';
          } else if (initialValue.startsWith('[')) {
            dataType = 'array';
          } else if (initialValue.startsWith('{')) {
            dataType = 'object';
          }

          // Find usages of this variable
          const usages: vscode.Location[] = [];
          const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
          let usageMatch;

          while ((usageMatch = usageRegex.exec(functionText)) !== null) {
            // Skip the declaration itself
            if (usageMatch.index === match.index + match[1].length + 1) {
              continue;
            }

            const usageStartPos = document.positionAt(
              functionRange.start.character + usageMatch.index
            );
            const usageEndPos = document.positionAt(
              functionRange.start.character + usageMatch.index + varName.length
            );
            usages.push(
              new vscode.Location(document.uri, new vscode.Range(usageStartPos, usageEndPos))
            );
          }

          dataFlow.push({
            variableName: varName,
            definition: location,
            usages,
            dataType,
            scope: 'function',
          });
        }

        // Function parameters
        const functionHeaderRegex = /\([^)]*\)/;
        const headerMatch = functionHeaderRegex.exec(functionText);

        if (headerMatch) {
          const params = headerMatch[0].slice(1, -1).split(',');

          for (let i = 0; i < params.length; i++) {
            const param = params[i].trim();
            if (!param) continue;

            // Handle simple and destructured parameters
            let paramName = param;

            // Remove type annotations for TypeScript
            if (paramName.includes(':')) {
              paramName = paramName.split(':')[0].trim();
            }

            // Handle default values
            if (paramName.includes('=')) {
              paramName = paramName.split('=')[0].trim();
            }

            // Skip destructuring for simplicity
            if (paramName.includes('{') || paramName.includes('[')) {
              continue;
            }

            // Find the parameter in the function header
            const paramIndex = functionText.indexOf(param);
            const startPos = document.positionAt(functionRange.start.character + paramIndex);
            const endPos = document.positionAt(
              functionRange.start.character + paramIndex + param.length
            );
            const location = new vscode.Location(document.uri, new vscode.Range(startPos, endPos));

            // Find usages
            const usages: vscode.Location[] = [];
            const usageRegex = new RegExp(`\\b${paramName}\\b`, 'g');
            let usageMatch;

            while ((usageMatch = usageRegex.exec(functionText)) !== null) {
              // Skip the declaration
              if (usageMatch.index >= paramIndex && usageMatch.index <= paramIndex + param.length) {
                continue;
              }

              const usageStartPos = document.positionAt(
                functionRange.start.character + usageMatch.index
              );
              const usageEndPos = document.positionAt(
                functionRange.start.character + usageMatch.index + paramName.length
              );
              usages.push(
                new vscode.Location(document.uri, new vscode.Range(usageStartPos, usageEndPos))
              );
            }

            dataFlow.push({
              variableName: paramName,
              definition: location,
              usages,
              dataType: 'parameter',
              scope: 'function',
            });
          }
        }
      }
    } catch (error) {
      this.context.loggingService.error('Error analyzing data flow', error);
    }

    return dataFlow;
  }

  private async analyzeExecutionPaths(callGraph: CallNode[]): Promise<ExecutionPath[]> {
    const paths: ExecutionPath[] = [];

    try {
      if (callGraph.length === 0) {
        return paths;
      }

      // Start with the first function in the call graph
      const rootFunction = callGraph[0];

      // Identify main execution branches
      this.findExecutionPaths(rootFunction.functionName, callGraph, [], paths);

      // Analyze branches in code for each function
      for (const path of paths) {
        const conditions: string[] = [];

        for (const node of path.path) {
          try {
            const document = await vscode.workspace.openTextDocument(node.location.uri);
            const functionText = document.getText(node.location.range);

            // Look for if statements and conditions
            const ifRegex = /if\s*\(([^)]+)\)/g;
            let match;

            while ((match = ifRegex.exec(functionText)) !== null) {
              conditions.push(`${node.function}: ${match[1].trim()}`);
            }
          } catch (error) {
            this.context.loggingService.error(
              `Error analyzing conditions in ${node.function}`,
              error
            );
          }
        }

        path.conditions = conditions;

        // Set a rough probability based on path length and conditions
        path.probability = 1.0 / (path.path.length + conditions.length);
      }
    } catch (error) {
      this.context.loggingService.error('Error analyzing execution paths', error);
    }

    return paths;
  }

  private findExecutionPaths(
    currentFunction: string,
    callGraph: CallNode[],
    currentPath: Array<{ function: string; location: vscode.Location }>,
    allPaths: ExecutionPath[],
    depth: number = 0,
    maxDepth: number = 5
  ): void {
    // Prevent infinite recursion and limit path depth
    if (depth >= maxDepth || currentPath.length > 10) {
      const completePath = [...currentPath];

      if (completePath.length > 0) {
        allPaths.push({
          path: completePath,
          conditions: [],
          probability: 0,
        });
      }

      return;
    }

    const node = callGraph.find((n) => n.functionName === currentFunction);

    if (!node) {
      // End of path
      const completePath = [...currentPath];

      if (completePath.length > 0) {
        allPaths.push({
          path: completePath,
          conditions: [],
          probability: 0,
        });
      }

      return;
    }

    // Add current function to path
    const newPath = [
      ...currentPath,
      {
        function: currentFunction,
        location: node.location,
      },
    ];

    // If no more function calls, end the path
    if (node.callsTo.length === 0) {
      allPaths.push({
        path: newPath,
        conditions: [],
        probability: 0,
      });
      return;
    }

    // Explore each function call as a potential path
    for (const calledFunction of node.callsTo) {
      // Avoid cycles
      if (currentPath.some((p) => p.function === calledFunction)) {
        continue;
      }

      this.findExecutionPaths(calledFunction, callGraph, newPath, allPaths, depth + 1, maxDepth);
    }
  }

  private async resolveImportPath(
    documentUri: vscode.Uri,
    importPath: string
  ): Promise<vscode.Uri | undefined> {
    try {
      // Handle relative paths
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const basePath = path.dirname(documentUri.fsPath);
        const resolvedPath = path.join(basePath, importPath);

        // Try with different extensions if no extension specified
        if (!path.extname(resolvedPath)) {
          for (const ext of ['.js', '.jsx', '.ts', '.tsx', '.json']) {
            const pathWithExt = resolvedPath + ext;
            if (fs.existsSync(pathWithExt)) {
              return vscode.Uri.file(pathWithExt);
            }
          }

          // Try as directory with index file
          for (const indexFile of ['index.js', 'index.ts', 'index.jsx', 'index.tsx']) {
            const indexPath = path.join(resolvedPath, indexFile);
            if (fs.existsSync(indexPath)) {
              return vscode.Uri.file(indexPath);
            }
          }
        }

        // Check if path exists as is
        if (fs.existsSync(resolvedPath)) {
          return vscode.Uri.file(resolvedPath);
        }
      }

      // Try workspace node_modules for package imports
      else if (!importPath.startsWith('/')) {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
          return undefined;
        }

        const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const packageName = importPath.split('/')[0];

        // Check for TypeScript path mappings in tsconfig.json
        try {
          const tsconfigPath = path.join(rootPath, 'tsconfig.json');
          if (fs.existsSync(tsconfigPath)) {
            const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
            const paths = tsconfig.compilerOptions?.paths;

            if (paths) {
              for (const [key, value] of Object.entries(paths)) {
                const keyPattern = key.replace('/*', '');
                if (importPath.startsWith(keyPattern)) {
                  const targetPaths = value as string[];
                  if (targetPaths.length > 0) {
                    const targetPath = targetPaths[0].replace('/*', '');
                    const resolvedPath = path.join(
                      rootPath,
                      importPath.replace(keyPattern, targetPath)
                    );

                    if (fs.existsSync(resolvedPath)) {
                      return vscode.Uri.file(resolvedPath);
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          this.context.loggingService.error('Error parsing tsconfig.json', error);
        }

        // Check in node_modules
        const nodeModulesPath = path.join(rootPath, 'node_modules', packageName);
        if (fs.existsSync(nodeModulesPath)) {
          return vscode.Uri.file(nodeModulesPath);
        }
      }

      return undefined;
    } catch (error) {
      this.context.loggingService.error(`Error resolving import path: ${importPath}`, error);
      return undefined;
    }
  }

  private async resolveImportPathMatches(
    sourceFilePath: string,
    importPath: string,
    targetFilePath: string
  ): Promise<boolean> {
    try {
      const resolvedPath = await this.resolveRelativePath(sourceFilePath, importPath);

      if (!resolvedPath) {
        return false;
      }

      return resolvedPath === targetFilePath;
    } catch (error) {
      return false;
    }
  }

  private async resolveRelativePath(
    sourceFilePath: string,
    importPath: string
  ): Promise<string | undefined> {
    try {
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const sourceDirPath = path.dirname(sourceFilePath);
        const resolvedPath = path.resolve(sourceDirPath, importPath);

        // If no extension, try to find matching file
        if (!path.extname(resolvedPath)) {
          for (const ext of ['.js', '.jsx', '.ts', '.tsx', '.json']) {
            const pathWithExt = resolvedPath + ext;
            if (fs.existsSync(pathWithExt)) {
              return pathWithExt;
            }
          }

          // Try as directory with index file
          for (const indexFile of ['index.js', 'index.ts', 'index.jsx', 'index.tsx']) {
            const indexPath = path.join(resolvedPath, indexFile);
            if (fs.existsSync(indexPath)) {
              return indexPath;
            }
          }
        }

        // Check if path exists as is
        if (fs.existsSync(resolvedPath)) {
          return resolvedPath;
        }
      }

      return undefined;
    } catch (error) {
      this.context.loggingService.error(`Error resolving relative path: ${importPath}`, error);
      return undefined;
    }
  }

  private async extractExports(document: vscode.TextDocument): Promise<string[]> {
    const exports: string[] = [];
    const content = document.getText();
    const languageId = document.languageId;

    try {
      // JavaScript/TypeScript exports
      if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId)) {
        // Named exports
        const namedExportRegex =
          /export\s+(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][\w$]*)/g;
        let match;

        while ((match = namedExportRegex.exec(content)) !== null) {
          exports.push(match[1]);
        }

        // Export statements
        const exportStmtRegex = /export\s+{\s*((?:[a-zA-Z_$][\w$]*\s*,?\s*)+)}/g;

        while ((match = exportStmtRegex.exec(content)) !== null) {
          const exportList = match[1].split(',').map((e) => e.trim());
          exports.push(...exportList);
        }

        // Default exports
        const defaultExportRegex = /export\s+default\s+(?:function|class)?\s*([a-zA-Z_$][\w$]*)?/g;

        while ((match = defaultExportRegex.exec(content)) !== null) {
          if (match[1]) {
            exports.push(`default (${match[1]})`);
          } else {
            exports.push('default (anonymous)');
          }
        }
      }

      // Python exports
      else if (languageId === 'python') {
        // Functions and classes (potential exports)
        const defRegex = /^\s*(def|class)\s+([a-zA-Z_][\w]*)/gm;
        let match;

        while ((match = defRegex.exec(content)) !== null) {
          // Only include public members (not starting with underscore)
          if (!match[2].startsWith('_')) {
            exports.push(match[2]);
          }
        }

        // __all__ special variable
        const allRegex = /__all__\s*=\s*\[(.*?)\]/s;
        const allMatch = allRegex.exec(content);

        if (allMatch) {
          const allItems = allMatch[1].match(/'[^']*'|"[^"]*"/g);
          if (allItems) {
            allItems.forEach((item) => {
              exports.push(item.slice(1, -1)); // Remove quotes
            });
          }
        }
      }

      // Java/C# public classes and methods
      else if (['java', 'csharp'].includes(languageId)) {
        // Public classes
        const classRegex = /public\s+(?:class|interface|enum)\s+([a-zA-Z_][\w]*)/g;
        let match;

        while ((match = classRegex.exec(content)) !== null) {
          exports.push(match[1]);
        }

        // Public methods
        const methodRegex =
          /public\s+(?:static\s+)?(?:[a-zA-Z_<>][\w<>]*)\s+([a-zA-Z_][\w]*)\s*\(/g;

        while ((match = methodRegex.exec(content)) !== null) {
          exports.push(match[1]);
        }
      }

      // Rust public items
      else if (languageId === 'rust') {
        // Public functions and structs
        const publicItemRegex = /pub\s+(?:fn|struct|enum|trait|type)\s+([a-zA-Z_][\w]*)/g;
        let match;

        while ((match = publicItemRegex.exec(content)) !== null) {
          exports.push(match[1]);
        }
      }
    } catch (error) {
      this.context.loggingService.error(
        `Error extracting exports from ${document.uri.fsPath}`,
        error
      );
    }

    return [...new Set(exports)]; // Remove duplicates
  }

  private determineArchitectureType(filePaths: string[]): string {
    const folderNames = filePaths
      .map((f) => path.dirname(f).toLowerCase())
      .filter((f) => f !== '.' && f !== './');

    // Check for specific architecture patterns
    if (
      folderNames.includes('controllers') &&
      folderNames.includes('models') &&
      folderNames.includes('views')
    ) {
      return 'MVC';
    }

    if (folderNames.includes('components') && folderNames.includes('containers')) {
      return 'React Container/Component';
    }

    if (
      folderNames.includes('components') &&
      folderNames.includes('pages') &&
      folderNames.includes('stores')
    ) {
      return 'Flux/Redux';
    }

    if (folderNames.includes('services') && folderNames.includes('components')) {
      return 'Service-Oriented';
    }

    if (
      folderNames.includes('api') &&
      folderNames.includes('components') &&
      folderNames.includes('hooks')
    ) {
      return 'Modern React w/ Hooks';
    }

    if (folderNames.includes('modules') && folderNames.includes('services')) {
      return 'Modular Architecture';
    }

    if (
      folderNames.includes('entities') &&
      folderNames.includes('repositories') &&
      folderNames.includes('services')
    ) {
      return 'Domain-Driven Design';
    }

    if (folderNames.includes('handlers') && folderNames.includes('models')) {
      return 'Event-Driven';
    }

    if (folderNames.includes('plugins') || folderNames.includes('extensions')) {
      return 'Plugin-Based';
    }

    // Default
    return 'Custom Architecture';
  }

  private inferModulePurpose(directoryName: string, files: string[], exports: string[]): string {
    const dirNameLower = directoryName.toLowerCase();

    // Common module types based on name
    if (dirNameLower === 'api' || dirNameLower === 'apis') return 'API communication';
    if (dirNameLower === 'components') return 'UI components';
    if (dirNameLower === 'hooks') return 'React hooks';
    if (dirNameLower === 'models' || dirNameLower === 'types') return 'Data types and models';
    if (dirNameLower === 'utils' || dirNameLower === 'helpers') return 'Utility functions';
    if (dirNameLower === 'services') return 'Business logic services';
    if (dirNameLower === 'store' || dirNameLower === 'stores') return 'State management';
    if (dirNameLower === 'context') return 'Context providers';
    if (dirNameLower === 'config') return 'Configuration';
    if (dirNameLower === 'constants') return 'Constants and enumerations';
    if (dirNameLower === 'middleware') return 'Request/response middleware';
    if (dirNameLower === 'controllers') return 'API request handlers';
    if (dirNameLower === 'routes') return 'Routing definitions';
    if (dirNameLower === 'pages') return 'Page components';
    if (dirNameLower === 'actions') return 'Redux/Flux actions';
    if (dirNameLower === 'reducers') return 'Redux/Flux reducers';
    if (dirNameLower === 'lib') return 'Library functions';
    if (dirNameLower === 'assets') return 'Static assets';
    if (dirNameLower === 'styles') return 'Styling';
    if (dirNameLower === 'tests' || dirNameLower === '__tests__') return 'Test files';

    // Infer from exports
    if (exports.length > 0) {
      if (exports.some((e) => e.endsWith('Provider'))) return 'Context providers';
      if (exports.some((e) => e.endsWith('Service'))) return 'Services';
      if (exports.some((e) => e.endsWith('Hook'))) return 'React hooks';
      if (exports.some((e) => e.endsWith('Component'))) return 'UI components';
      if (exports.some((e) => e.endsWith('Utils'))) return 'Utility functions';
      if (exports.some((e) => e.endsWith('Types'))) return 'Data types and models';
      if (exports.some((e) => e.endsWith('Controller'))) return 'Controllers';
      if (exports.some((e) => e.endsWith('Route'))) return 'Routing';
    }

    // Infer from file types
    const fileExts = files.map((f) => path.extname(f).toLowerCase());
    if (fileExts.some((e) => ['.css', '.scss', '.less', '.styl'].includes(e))) return 'Styling';
    if (fileExts.some((e) => ['.svg', '.png', '.jpg', '.gif'].includes(e))) return 'Assets';
    if (
      fileExts.some(
        (e) => e === '.test.js' || e === '.test.ts' || e === '.spec.js' || e === '.spec.ts'
      )
    )
      return 'Tests';

    return 'Module';
  }

  private groupFilesByFolder(filePaths: string[]): Record<string, string[]> {
    const filesByFolder: Record<string, string[]> = {};

    for (const filePath of filePaths) {
      const folderPath = path.dirname(filePath);

      if (!filesByFolder[folderPath]) {
        filesByFolder[folderPath] = [];
      }

      filesByFolder[folderPath].push(filePath);
    }

    return filesByFolder;
  }

  private async detectPatterns(filesByFolder: Record<string, string[]>): Promise<unknown[][]> {
    // Simplistic pattern detection based on folder structure and naming patterns
    const patterns: Array<{
      name: string;
      confidence: number;
      locations: Array<{ file: string; startLine: number; endLine: number }>;
    }> = [];

    // Collect folder names for analysis
    const folderNames = Object.keys(filesByFolder).map((folder) =>
      path.basename(folder).toLowerCase()
    );

    // Detect MVC pattern
    if (
      folderNames.includes('models') &&
      folderNames.includes('views') &&
      folderNames.includes('controllers')
    ) {
      patterns.push({
        name: 'MVC',
        confidence: 0.9,
        locations: [
          ...this.getFilesInFolder(filesByFolder, 'models'),
          ...this.getFilesInFolder(filesByFolder, 'views'),
          ...this.getFilesInFolder(filesByFolder, 'controllers'),
        ],
      });
    }

    // Detect Container/Component pattern
    if (folderNames.includes('containers') && folderNames.includes('components')) {
      patterns.push({
        name: 'Container/Component',
        confidence: 0.85,
        locations: [
          ...this.getFilesInFolder(filesByFolder, 'containers'),
          ...this.getFilesInFolder(filesByFolder, 'components'),
        ],
      });
    }

    // Detect Service pattern
    if (folderNames.includes('services')) {
      const serviceFiles = this.getFilesInFolder(filesByFolder, 'services');
      patterns.push({
        name: 'Service Pattern',
        confidence: 0.8,
        locations: serviceFiles,
      });
    }

    // Detect Repository pattern
    if (folderNames.includes('repositories')) {
      const repoFiles = this.getFilesInFolder(filesByFolder, 'repositories');
      patterns.push({
        name: 'Repository Pattern',
        confidence: 0.8,
        locations: repoFiles,
      });
    }

    // Detect Factory pattern by looking at file contents
    const factoryFiles: Array<{ file: string; startLine: number; endLine: number }> = [];

    for (const folder in filesByFolder) {
      for (const file of filesByFolder[folder]) {
        try {
          const ext = path.extname(file).toLowerCase();

          if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
            const content = await this.readFile(file);

            // Simple check for factory pattern
            if (
              content.includes('factory') ||
              content.includes('createFactory') ||
              content.includes('Factory')
            ) {
              // Find the approximate location of the factory pattern
              const lines = content.split('\n');
              let factoryLineIndex = -1;

              for (let i = 0; i < lines.length; i++) {
                if (
                  lines[i].includes('factory') ||
                  lines[i].includes('createFactory') ||
                  lines[i].includes('Factory')
                ) {
                  factoryLineIndex = i;
                  break;
                }
              }

              if (factoryLineIndex !== -1) {
                factoryFiles.push({
                  file,
                  startLine: Math.max(0, factoryLineIndex - 2),
                  endLine: Math.min(lines.length - 1, factoryLineIndex + 10),
                });
              }
            }
          }
        } catch (error) {
          this.context.loggingService.error(
            `Error analyzing file for factory pattern: ${file}`,
            error
          );
        }
      }
    }

    if (factoryFiles.length > 0) {
      patterns.push({
        name: 'Factory Pattern',
        confidence: 0.7,
        locations: factoryFiles,
      });
    }

    return patterns;
  }

  private getFilesInFolder(
    filesByFolder: Record<string, string[]>,
    targetFolderName: string
  ): Array<{ file: string; startLine: number; endLine: number }> {
    const result: Array<{ file: string; startLine: number; endLine: number }> = [];

    for (const folder in filesByFolder) {
      const folderName = path.basename(folder).toLowerCase();

      if (folderName === targetFolderName.toLowerCase()) {
        for (const file of filesByFolder[folder]) {
          result.push({
            file,
            startLine: 0,
            endLine: 0,
          });
        }
      }
    }

    return result;
  }

  private detectArchitecturalLayers(filesByFolder: Record<string, string[]>): string[] {
    const layers: string[] = [];
    const folderNames = Object.keys(filesByFolder).map((folder) =>
      path.basename(folder).toLowerCase()
    );

    // Common layer names
    const possibleLayers = [
      'presentation',
      'ui',
      'components',
      'views',
      'pages',
      'domain',
      'business',
      'models',
      'entities',
      'data',
      'repository',
      'dao',
      'storage',
      'infrastructure',
      'services',
      'utils',
      'helpers',
      'api',
      'network',
      'remote',
    ];

    for (const layer of possibleLayers) {
      if (folderNames.includes(layer)) {
        layers.push(layer);
      }
    }

    return layers;
  }

  private async detectComponentRelationships(
    filesByFolder: Record<string, string[]>
  ): Promise<Array<{ source: string; target: string; type: string }>> {
    const relationships: Array<{ source: string; target: string; type: string }> = [];

    // Components are folders
    const components = Object.keys(filesByFolder).map((folder) => path.basename(folder));

    // Detect relationships based on imports
    for (const folder in filesByFolder) {
      const sourceComponent = path.basename(folder);

      for (const file of filesByFolder[folder]) {
        try {
          const uri = vscode.Uri.file(file);
          const document = await vscode.workspace.openTextDocument(uri);
          const imports = await this.extractImports(document);

          for (const importPath of imports) {
            // Try to determine which component the import is from
            for (const targetComponent of components) {
              if (targetComponent === sourceComponent) continue;

              if (importPath.includes(targetComponent)) {
                // Determine relationship type based on component and file names
                let relationType = 'uses';

                if (
                  importPath.toLowerCase().includes('interface') ||
                  importPath.includes('contract')
                ) {
                  relationType = 'implements';
                } else if (file.toLowerCase().includes('extends') || importPath.includes('base')) {
                  relationType = 'extends';
                }

                relationships.push({
                  source: sourceComponent,
                  target: targetComponent,
                  type: relationType,
                });

                break;
              }
            }
          }
        } catch (error) {
          this.context.loggingService.error(
            `Error detecting component relationships: ${file}`,
            error
          );
        }
      }
    }

    return relationships;
  }

  private async calculateFileComplexity(document: vscode.TextDocument): Promise<number> {
    try {
      const text = document.getText();
      let complexity = 0;

      // Count logical branches
      const conditionals = (text.match(/if\s*\(/g) || []).length;
      const loops =
        (text.match(/for\s*\(/g) || []).length + (text.match(/while\s*\(/g) || []).length;
      const switchCases = (text.match(/case\s+/g) || []).length;
      const ternaries = (text.match(/\?/g) || []).length;

      // Count function definitions
      const functions =
        (text.match(/function\s+\w+\s*\(/g) || []).length +
        (text.match(/\w+\s*:\s*function\s*\(/g) || []).length +
        (text.match(/\w+\s*=\s*function\s*\(/g) || []).length +
        (text.match(/\w+\s*=\s*\([^)]*\)\s*=>/g) || []).length +
        (text.match(/\w+\s*\([^)]*\)\s*{/g) || []).length;

      // Cyclomatic complexity approximation
      complexity = 1 + conditionals + loops + switchCases + ternaries;

      // Add points for long file
      const lineCount = document.lineCount;
      if (lineCount > 500) complexity += 5;
      else if (lineCount > 300) complexity += 3;
      else if (lineCount > 200) complexity += 2;

      // Add points for many functions
      if (functions > 20) complexity += 5;
      else if (functions > 10) complexity += 3;
      else if (functions > 5) complexity += 1;

      return complexity;
    } catch (error) {
      this.context.loggingService.error(
        `Error calculating complexity for ${document.uri.fsPath}`,
        error
      );
      return 1;
    }
  }

  private async getFileUsageCount(filePath: string): Promise<number> {
    try {
      const fileName = path.basename(filePath, path.extname(filePath));

      // Use workspace.findFiles to find files that might contain references
      const files = await vscode.workspace.findFiles(
        '**/*.{js,jsx,ts,tsx,py,java,cs,go,rs,c,cpp,h,hpp}',
        '**/node_modules/**'
      );

      let count = 0;

      // Check each file for references to the target file
      for (const fileUri of files) {
        // Skip the file itself
        if (fileUri.fsPath === filePath) {
          continue;
        }

        try {
          const document = await vscode.workspace.openTextDocument(fileUri);
          const content = document.getText();

          // Count occurrences in the file (rough estimate)
          const regex = new RegExp(fileName, 'g');
          const matches = content.match(regex);

          if (matches) {
            count += matches.length;
          }
        } catch (error) {
          this.context.loggingService.error(
            `Error checking references in ${fileUri.fsPath}`,
            error
          );
        }
      }

      return count;
    } catch (error) {
      this.context.loggingService.error(`Error finding usage count: ${filePath}`, error);
      return 0;
    }
  }

  private async getFileChangeFrequency(filePath: string): Promise<number> {
    try {
      // Try to use Git history if available
      try {
        const gitExecResult = await vscode.commands.executeCommand<{
          stdout: string;
          stderr: string;
        }>(
          'vscode.executeCommand',
          'git.execute',
          `log --follow --format=oneline --max-count=30 -- "${filePath}"`
        );

        if (gitExecResult && gitExecResult.stdout) {
          return gitExecResult.stdout.split('\n').filter((line) => line.trim().length > 0).length;
        }
      } catch (error) {
        // Git might not be available or file not tracked
      }

      // Fallback: use file modification time and size as a heuristic
      const stat = await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      const now = new Date().getTime();
      const fileAge = now - stat.mtime;

      // Files modified recently might have higher change frequency
      if (fileAge < 24 * 60 * 60 * 1000) {
        // Less than 1 day old
        return 3;
      } else if (fileAge < 7 * 24 * 60 * 60 * 1000) {
        // Less than 1 week old
        return 2;
      }

      return 1;
    } catch (error) {
      this.context.loggingService.error(`Error getting change frequency: ${filePath}`, error);
      return 0;
    }
  }

  private generateModuleDocumentation(
    directory: string,
    files: string[],
    exportedSymbols: string[]
  ): string {
    const dirName = path.basename(directory);

    // Generate simple documentation
    return (
      `Module: ${dirName}\n` +
      `Files: ${files.length}\n` +
      `Exports: ${exportedSymbols.length > 0 ? exportedSymbols.join(', ') : 'None'}\n`
    );
  }

  private getAllDirectories(filePaths: string[]): string[] {
    const directories = new Set<string>();

    for (const filePath of filePaths) {
      let currentDir = path.dirname(filePath);

      while (currentDir && currentDir !== '.' && currentDir !== '/') {
        directories.add(currentDir);
        currentDir = path.dirname(currentDir);
      }
    }

    return [...directories];
  }
}
