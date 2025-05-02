import * as vscode from 'vscode';

export class DiagnosticsViewProvider implements vscode.TreeDataProvider<DiagnosticItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DiagnosticItem | undefined | null | void> = new vscode.EventEmitter<DiagnosticItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DiagnosticItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private diagnosticItems: DiagnosticItem[] = [];
  private disposables: vscode.Disposable[] = [];

  constructor() {
    // Listen for diagnostic changes
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(this.updateDiagnostics, this)
    );
    
    // Initial diagnostics update
    this.updateDiagnostics();
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
  }

  refresh(): void {
    this.updateDiagnostics();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DiagnosticItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DiagnosticItem): DiagnosticItem[] {
    if (!element) {
      return this.diagnosticItems;
    }
    return element.children;
  }

  private updateDiagnostics() {
    this.diagnosticItems = [];
    
    // Clear existing diagnostics
    vscode.languages.getLanguages().then(languages => {
      for (const language of languages) {
        // Get all diagnostics for all open files
        if (vscode.window.activeTextEditor) {
          const diagnostics = vscode.languages.getDiagnostics();
          
          for (const [uri, fileDiagnostics] of diagnostics) {
            if (fileDiagnostics.length > 0) {
              // Create a file item that will hold all diagnostics for this file
              const fileItem = new DiagnosticItem(
                uri.fsPath.split('/').pop() || uri.fsPath,
                uri.fsPath,
                uri,
                vscode.TreeItemCollapsibleState.Collapsed
              );
              
              // Process each diagnostic for this file
              for (const diagnostic of fileDiagnostics) {
                const severityLabel = this.getSeverityLabel(diagnostic.severity);
                const lineNumber = diagnostic.range.start.line + 1;
                const message = diagnostic.message.replace(/\r?\n/g, ' ');
                
                const diagnosticItem = new DiagnosticItem(
                  `[${severityLabel}] Line ${lineNumber}: ${message}`,
                  message,
                  uri,
                  vscode.TreeItemCollapsibleState.None,
                  {
                    command: 'vscode.open',
                    title: 'Go to Diagnostic',
                    arguments: [
                      uri,
                      { 
                        selection: new vscode.Range(
                          diagnostic.range.start, 
                          diagnostic.range.end
                        ) 
                      }
                    ]
                  }
                );
                
                // Set icon based on severity
                diagnosticItem.iconPath = this.getSeverityIcon(diagnostic.severity);
                
                // Add diagnostic to file item's children
                fileItem.addChild(diagnosticItem);
              }
              
              // Add file to the root list
              this.diagnosticItems.push(fileItem);
            }
          }
        }
      }
      
      // Notify tree view that data has changed
      this._onDidChangeTreeData.fire();
    });
  }
  
  private getSeverityLabel(severity?: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'Error';
      case vscode.DiagnosticSeverity.Warning:
        return 'Warning';
      case vscode.DiagnosticSeverity.Information:
        return 'Info';
      case vscode.DiagnosticSeverity.Hint:
        return 'Hint';
      default:
        return 'Unknown';
    }
  }
  
  private getSeverityIcon(severity?: vscode.DiagnosticSeverity): vscode.ThemeIcon {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return new vscode.ThemeIcon('error');
      case vscode.DiagnosticSeverity.Warning:
        return new vscode.ThemeIcon('warning');
      case vscode.DiagnosticSeverity.Information:
        return new vscode.ThemeIcon('info');
      case vscode.DiagnosticSeverity.Hint:
        return new vscode.ThemeIcon('lightbulb');
      default:
        return new vscode.ThemeIcon('question');
    }
  }
}

class DiagnosticItem extends vscode.TreeItem {
  public children: DiagnosticItem[] = [];

  constructor(
    public readonly label: string,
    public readonly tooltip: string,
    public readonly resourceUri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }

  addChild(item: DiagnosticItem) {
    this.children.push(item);
  }
} 