import * as vscode from 'vscode';
import * as _path from 'path';
import minimatch from 'minimatch';
import { v4 as uuidv4 } from 'uuid';
import { ExtensionContext } from '../../models/context/extensionContext';

export interface DiagnosticInfo {
  id: string;
  filePath: string;
  range: vscode.Range;
  message: string;
  code?: string | number;
  source: string;
  severity: vscode.DiagnosticSeverity;
  relatedInformation?: vscode.DiagnosticRelatedInformation[];
  timestamp: number;
}

export interface FileWithDiagnostics {
  filePath: string;
  diagnostics: DiagnosticInfo[];
}

export enum DiagnosticsMonitoringEventType {
  DiagnosticsAdded = 'diagnosticsAdded',
  DiagnosticsRemoved = 'diagnosticsRemoved',
  DiagnosticsChanged = 'diagnosticsChanged',
  FileFixed = 'fileFixed',
  FileChanged = 'fileChanged',
}

export interface DiagnosticsMonitoringEvent {
  type: DiagnosticsMonitoringEventType;
  filePath?: string;
  diagnostics?: DiagnosticInfo[];
  previousDiagnostics?: DiagnosticInfo[];
  timestamp: number;
}

export interface DiagnosticsMonitoringOptions {
  includeInformation: boolean;
  includeHints: boolean;
  excludePatterns: string[];
  trackHistory: boolean;
  historyLimit: number;
}

export const defaultDiagnosticsMonitoringOptions: DiagnosticsMonitoringOptions = {
  includeInformation: false,
  includeHints: false,
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
  trackHistory: true,
  historyLimit: 10,
};

export class DiagnosticsMonitoringService implements vscode.Disposable {
  private static instance: DiagnosticsMonitoringService | undefined;

  private readonly context: ExtensionContext;
  private readonly eventEmitter = new vscode.EventEmitter<DiagnosticsMonitoringEvent>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly options: DiagnosticsMonitoringOptions;

  private fileDiagnostics: Map<string, DiagnosticInfo[]> = new Map();
  private diagnosticHistory: Map<string, DiagnosticInfo[][]> = new Map();

  public readonly onDiagnosticsEvent = this.eventEmitter.event;

  private constructor(
    context: ExtensionContext,
    options: Partial<DiagnosticsMonitoringOptions> = {}
  ) {
    this.context = context;
    this.options = {
      ...defaultDiagnosticsMonitoringOptions,
      ...options,
    };

    this.disposables.push(this.eventEmitter);

    // Register event listeners
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(this.processDiagnosticChanges.bind(this))
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(this.processDocumentChanges.bind(this))
    );

    // Collect current diagnostics
    this.collectCurrentDiagnostics();

    context.loggingService.info('DiagnosticsMonitoringService initialized');
  }

  public static getInstance(
    context?: ExtensionContext,
    options?: Partial<DiagnosticsMonitoringOptions>
  ): DiagnosticsMonitoringService {
    if (!DiagnosticsMonitoringService.instance && context) {
      DiagnosticsMonitoringService.instance = new DiagnosticsMonitoringService(context, options);
    }

    if (!DiagnosticsMonitoringService.instance) {
      throw new Error('DiagnosticsMonitoringService not initialized');
    }

    return DiagnosticsMonitoringService.instance;
  }

  private collectCurrentDiagnostics(): void {
    for (const document of vscode.workspace.textDocuments) {
      const uri = document.uri;
      if (uri.scheme === 'file') {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        this.updateFileDiagnostics(uri, diagnostics);
      }
    }
  }

  private processDiagnosticChanges(event: vscode.DiagnosticChangeEvent): void {
    for (const uri of event.uris) {
      if (uri.scheme === 'file') {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        this.updateFileDiagnostics(uri, diagnostics);
      }
    }
  }

  private processDocumentChanges(event: vscode.TextDocumentChangeEvent): void {
    const uri = event.document.uri;

    if (uri.scheme !== 'file') {
      return;
    }

    const filePath = uri.fsPath;

    if (this.isFileExcluded(filePath)) {
      return;
    }

    // Emit file changed event if we have diagnostics for this file
    if (this.fileDiagnostics.has(filePath)) {
      this.emitEvent({
        type: DiagnosticsMonitoringEventType.FileChanged,
        filePath,
      });
    }
  }

  private updateFileDiagnostics(uri: vscode.Uri, newDiagnostics: vscode.Diagnostic[]): void {
    const filePath = uri.fsPath;

    if (this.isFileExcluded(filePath)) {
      return;
    }

    // Filter diagnostics based on options
    const filteredDiagnostics = newDiagnostics.filter((d) => this.shouldIncludeDiagnostic(d));

    // Convert to our internal format
    const diagnosticInfos = filteredDiagnostics.map((d) => this.convertDiagnostic(d, filePath));

    // Get previous diagnostics for this file
    const previousDiagnostics = this.fileDiagnostics.get(filePath) || [];

    // Update diagnostics
    if (diagnosticInfos.length === 0) {
      // Remove file from map if no diagnostics
      this.fileDiagnostics.delete(filePath);

      // If we had diagnostics before, emit removed event
      if (previousDiagnostics.length > 0) {
        this.emitEvent({
          type: DiagnosticsMonitoringEventType.DiagnosticsRemoved,
          filePath,
          previousDiagnostics,
        });

        // If file is now fixed (had errors before)
        const hadErrors = previousDiagnostics.some(
          (d) => d.severity === vscode.DiagnosticSeverity.Error
        );

        if (hadErrors) {
          this.emitEvent({
            type: DiagnosticsMonitoringEventType.FileFixed,
            filePath,
          });
        }
      }
    } else {
      // Store the new diagnostics
      this.fileDiagnostics.set(filePath, diagnosticInfos);

      // Update history if enabled
      if (this.options.trackHistory) {
        this.updateDiagnosticHistory(filePath, diagnosticInfos);
      }

      // Determine the event type
      if (previousDiagnostics.length === 0) {
        this.emitEvent({
          type: DiagnosticsMonitoringEventType.DiagnosticsAdded,
          filePath,
          diagnostics: diagnosticInfos,
        });
      } else {
        this.emitEvent({
          type: DiagnosticsMonitoringEventType.DiagnosticsChanged,
          filePath,
          diagnostics: diagnosticInfos,
          previousDiagnostics,
        });
      }
    }
  }

  private updateDiagnosticHistory(filePath: string, diagnostics: DiagnosticInfo[]): void {
    let history = this.diagnosticHistory.get(filePath) || [];

    // Add new entry at the beginning
    history.unshift([...diagnostics]);

    // Limit the history size
    if (history.length > this.options.historyLimit) {
      history = history.slice(0, this.options.historyLimit);
    }

    this.diagnosticHistory.set(filePath, history);
  }

  private shouldIncludeDiagnostic(diagnostic: vscode.Diagnostic): boolean {
    // Always include errors and warnings
    if (
      diagnostic.severity === vscode.DiagnosticSeverity.Error ||
      diagnostic.severity === vscode.DiagnosticSeverity.Warning
    ) {
      return true;
    }

    // Include information diagnostics if enabled
    if (
      diagnostic.severity === vscode.DiagnosticSeverity.Information &&
      this.options.includeInformation
    ) {
      return true;
    }

    // Include hints if enabled
    if (diagnostic.severity === vscode.DiagnosticSeverity.Hint && this.options.includeHints) {
      return true;
    }

    return false;
  }

  private convertDiagnostic(diagnostic: vscode.Diagnostic, filePath: string): DiagnosticInfo {
    let codeValue: string | number | undefined = undefined;

    if (typeof diagnostic.code === 'string' || typeof diagnostic.code === 'number') {
      codeValue = diagnostic.code;
    } else if (
      diagnostic.code &&
      typeof diagnostic.code === 'object' &&
      'value' in diagnostic.code
    ) {
      const value = diagnostic.code.value;
      if (typeof value === 'string' || typeof value === 'number') {
        codeValue = value;
      }
    }

    return {
      id: uuidv4(),
      filePath,
      range: diagnostic.range,
      message: diagnostic.message,
      code: codeValue,
      source: diagnostic.source || 'unknown',
      severity: diagnostic.severity,
      relatedInformation: diagnostic.relatedInformation,
      timestamp: Date.now(),
    };
  }

  private isFileExcluded(filePath: string): boolean {
    // Check against exclude patterns
    for (const pattern of this.options.excludePatterns) {
      if (this.matchPattern(filePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  private matchPattern(filePath: string, pattern: string): boolean {
    // Normalize path for matching
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Use minimatch for glob pattern matching
    return minimatch(normalizedPath, pattern, { dot: true });
  }

  public getAllDiagnostics(): FileWithDiagnostics[] {
    return Array.from(this.fileDiagnostics.entries()).map(([filePath, diagnostics]) => ({
      filePath,
      diagnostics,
    }));
  }

  public getDiagnosticsForFile(filePath: string): DiagnosticInfo[] {
    return this.fileDiagnostics.get(filePath) || [];
  }

  public getDiagnosticsBySeverity(severity: vscode.DiagnosticSeverity): FileWithDiagnostics[] {
    const result: FileWithDiagnostics[] = [];

    for (const [filePath, diagnostics] of this.fileDiagnostics.entries()) {
      const filteredDiagnostics = diagnostics.filter((d) => d.severity === severity);

      if (filteredDiagnostics.length > 0) {
        result.push({
          filePath,
          diagnostics: filteredDiagnostics,
        });
      }
    }

    return result;
  }

  public getDiagnosticHistory(filePath: string): DiagnosticInfo[][] {
    return this.diagnosticHistory.get(filePath) || [];
  }

  public getErrorCount(): { errors: number; warnings: number; information: number; hints: number } {
    let errors = 0;
    let warnings = 0;
    let information = 0;
    let hints = 0;

    for (const diagnostics of this.fileDiagnostics.values()) {
      for (const diagnostic of diagnostics) {
        switch (diagnostic.severity) {
          case vscode.DiagnosticSeverity.Error:
            errors++;
            break;
          case vscode.DiagnosticSeverity.Warning:
            warnings++;
            break;
          case vscode.DiagnosticSeverity.Information:
            information++;
            break;
          case vscode.DiagnosticSeverity.Hint:
            hints++;
            break;
        }
      }
    }

    return { errors, warnings, information, hints };
  }

  public getFilesWithErrors(): string[] {
    return Array.from(this.fileDiagnostics.entries())
      .filter(([_, diagnostics]) =>
        diagnostics.some((d) => d.severity === vscode.DiagnosticSeverity.Error)
      )
      .map(([filePath, _]) => filePath);
  }

  public getFilesWithWarnings(): string[] {
    return Array.from(this.fileDiagnostics.entries())
      .filter(
        ([_, diagnostics]) =>
          diagnostics.some((d) => d.severity === vscode.DiagnosticSeverity.Warning) &&
          !diagnostics.some((d) => d.severity === vscode.DiagnosticSeverity.Error)
      )
      .map(([filePath, _]) => filePath);
  }

  public monitorFile(filePath: string): vscode.Disposable {
    // Create a listener that specifically watches for events on this file
    const listener = this.onDiagnosticsEvent((event) => {
      if (event.filePath === filePath) {
        // The handler will be added by the consumer
      }
    });

    // Force an update for this file
    const uri = vscode.Uri.file(filePath);
    const diagnostics = vscode.languages.getDiagnostics(uri);
    this.updateFileDiagnostics(uri, diagnostics);

    return listener;
  }

  public updateOptions(options: Partial<DiagnosticsMonitoringOptions>): void {
    Object.assign(this.options, options);

    // Re-collect diagnostics with new options
    this.collectCurrentDiagnostics();
  }

  private emitEvent(event: Omit<DiagnosticsMonitoringEvent, 'timestamp'>): void {
    this.eventEmitter.fire({
      ...event,
      timestamp: Date.now(),
    });
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.fileDiagnostics.clear();
    this.diagnosticHistory.clear();
  }
}
