import * as vscode from 'vscode';
import * as path from 'path';

export class CodeExplorerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'm31-agent.codeExplorerView';
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _fileWatcher?: vscode.FileSystemWatcher;
  private _currentWorkspaceRoot: vscode.Uri | undefined;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    
    // Initialize workspace root
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      this._currentWorkspaceRoot = vscode.workspace.workspaceFolders[0].uri;
      this.setupFileWatcher();
    }
    
    // Handle workspace folder changes
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        this._currentWorkspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        this.setupFileWatcher();
        this.refreshExplorer();
      }
    });
  }

  private setupFileWatcher(): void {
    if (this._fileWatcher) {
      this._fileWatcher.dispose();
    }
    
    if (this._currentWorkspaceRoot) {
      this._fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(this._currentWorkspaceRoot, '**/*')
      );
      
      this._fileWatcher.onDidChange(() => this.refreshExplorer());
      this._fileWatcher.onDidCreate(() => this.refreshExplorer());
      this._fileWatcher.onDidDelete(() => this.refreshExplorer());
    }
  }

  private async refreshExplorer(): Promise<void> {
    if (!this._view) {
      return;
    }
    
    try {
      const workspaceStructure = await this.getWorkspaceStructure();
      const codeMetrics = await this.getCodeMetrics();
      const languageSummary = await this.getLanguageSummary();
      
      this._view.webview.postMessage({
        command: 'updateExplorer',
        data: {
          workspace: workspaceStructure,
          metrics: codeMetrics,
          languages: languageSummary
        }
      });
    } catch (error) {
      this._view.webview.postMessage({
        command: 'showError',
        message: `Failed to update explorer: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private async getWorkspaceStructure(): Promise<any> {
    if (!this._currentWorkspaceRoot) {
      return null;
    }
    
    try {
      return await this.scanDirectory(this._currentWorkspaceRoot);
    } catch (error) {
      console.error('Failed to scan workspace', error);
      return null;
    }
  }

  private async scanDirectory(uri: vscode.Uri, depth = 0, maxDepth = 3): Promise<any> {
    if (depth > maxDepth) {
      return { name: path.basename(uri.fsPath), type: 'directory', collapsed: true };
    }
    
    const files = await vscode.workspace.fs.readDirectory(uri);
    const items = await Promise.all(
      files.map(async ([name, type]) => {
        const filePath = vscode.Uri.joinPath(uri, name);
        
        // Skip node_modules and other large directories
        if (name === 'node_modules' || name === '.git' || name.startsWith('.')) {
          return { 
            name, 
            type: 'directory', 
            collapsed: true,
            size: 0,
            children: [] 
          };
        }
        
        if (type === vscode.FileType.Directory) {
          return await this.scanDirectory(filePath, depth + 1, maxDepth);
        } else {
          return { 
            name, 
            type: 'file', 
            extension: path.extname(name).slice(1),
            path: filePath.fsPath
          };
        }
      })
    );
    
    return {
      name: path.basename(uri.fsPath),
      type: 'directory',
      collapsed: depth > 0,
      children: items.filter(Boolean)
    };
  }

  private async getCodeMetrics(): Promise<any> {
    // This would typically involve actual code analysis
    // For demo purposes, using placeholder metrics
    return {
      totalFiles: 120,
      totalLines: 15000,
      avgComplexity: 4.2,
      fileTypes: [
        { type: 'ts', count: 45 },
        { type: 'js', count: 20 },
        { type: 'json', count: 15 },
        { type: 'md', count: 10 },
        { type: 'html', count: 5 }
      ]
    };
  }

  private async getLanguageSummary(): Promise<any> {
    // This would typically involve scanning workspace files
    // For demo purposes, using placeholder data
    return [
      { language: 'TypeScript', percentage: 65 },
      { language: 'JavaScript', percentage: 15 },
      { language: 'JSON', percentage: 10 },
      { language: 'HTML', percentage: 5 },
      { language: 'Markdown', percentage: 5 }
    ];
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refreshExplorer':
          await this.refreshExplorer();
          break;
        case 'openFile':
          this.openFile(message.path);
          break;
        case 'analyzeStructure':
          // This would trigger a more detailed analysis
          vscode.commands.executeCommand('m31-agent.codeAnalysis.analyzeCodebase');
          break;
      }
    });
    
    // Initial load
    this.refreshExplorer();
  }

  private openFile(filePath: string): void {
    try {
      const fileUri = vscode.Uri.file(filePath);
      vscode.workspace.openTextDocument(fileUri).then(document => {
        vscode.window.showTextDocument(document);
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>M31 Code Explorer</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 0;
            margin: 0;
            overflow-x: hidden;
          }
          
          .header {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .header h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 400;
          }
          
          .action-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
          }
          
          .action-button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          
          .tabs {
            display: flex;
            background-color: var(--vscode-tab-inactiveBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .tab {
            padding: 8px 16px;
            cursor: pointer;
            font-size: 13px;
            border: none;
            background: none;
            color: var(--vscode-tab-inactiveForeground);
          }
          
          .tab.active {
            background-color: var(--vscode-tab-activeBackground);
            color: var(--vscode-tab-activeForeground);
            border-bottom: 2px solid var(--vscode-tab-activeBorderTop);
          }
          
          .tab-content {
            display: none;
            padding: 16px;
            height: calc(100vh - 100px);
            overflow: auto;
          }
          
          .tab-content.active {
            display: block;
          }
          
          .tree-view {
            font-size: 13px;
          }
          
          .tree-item {
            padding: 4px 0;
            cursor: pointer;
            white-space: nowrap;
            display: flex;
            align-items: center;
          }
          
          .tree-item:hover {
            background-color: var(--vscode-list-hoverBackground);
          }
          
          .tree-toggle {
            display: inline-block;
            width: 16px;
            height: 16px;
            text-align: center;
            line-height: 16px;
            margin-right: 4px;
          }
          
          .tree-label {
            flex-grow: 1;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .tree-children {
            padding-left: 20px;
            display: none;
          }
          
          .tree-children.expanded {
            display: block;
          }
          
          .file-icon {
            margin-right: 4px;
            width: 16px;
            height: 16px;
            display: inline-block;
            text-align: center;
          }
          
          .metrics-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          
          .metric-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            padding: 16px;
            text-align: center;
          }
          
          .metric-value {
            font-size: 24px;
            font-weight: 500;
            margin: 8px 0;
          }
          
          .metric-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
          }
          
          .chart-container {
            margin-top: 24px;
            height: 200px;
            position: relative;
          }
          
          .bar-chart {
            display: flex;
            height: 100%;
            align-items: flex-end;
            gap: 8px;
          }
          
          .bar {
            flex-grow: 1;
            background-color: var(--vscode-charts-blue);
            position: relative;
            min-width: 30px;
          }
          
          .bar-label {
            position: absolute;
            top: -20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 12px;
          }
          
          .bar-value {
            position: absolute;
            top: -40px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 13px;
            font-weight: 500;
          }
          
          .progress-chart {
            margin-top: 24px;
          }
          
          .progress-item {
            margin-bottom: 16px;
          }
          
          .progress-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 12px;
          }
          
          .progress-bar {
            height: 8px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
          }
          
          .progress-fill {
            height: 100%;
            background-color: var(--vscode-progressBar-background);
          }
          
          .error-text {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 8px;
            margin: 16px;
            border-radius: 4px;
            display: none;
          }
          
          .error-text.active {
            display: block;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: 500;
            margin: 24px 0 16px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Code Explorer</h2>
          <button class="action-button" id="refresh-button">Refresh</button>
        </div>
        
        <div class="tabs">
          <button class="tab active" data-tab="structure">Structure</button>
          <button class="tab" data-tab="metrics">Metrics</button>
          <button class="tab" data-tab="languages">Languages</button>
        </div>
        
        <div class="tab-content active" id="structure-tab">
          <div id="tree-view" class="tree-view"></div>
        </div>
        
        <div class="tab-content" id="metrics-tab">
          <div class="metrics-container">
            <div class="metric-card">
              <div class="metric-value" id="total-files">-</div>
              <div class="metric-label">Total Files</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" id="total-lines">-</div>
              <div class="metric-label">Lines of Code</div>
            </div>
            <div class="metric-card">
              <div class="metric-value" id="avg-complexity">-</div>
              <div class="metric-label">Avg. Complexity</div>
            </div>
          </div>
          
          <h3 class="section-title">File Types</h3>
          <div class="chart-container">
            <div class="bar-chart" id="file-types-chart"></div>
          </div>
          
          <button class="action-button" id="analyze-button" style="margin-top: 24px; width: 100%;">
            Analyze Code Structure
          </button>
        </div>
        
        <div class="tab-content" id="languages-tab">
          <h3 class="section-title">Language Distribution</h3>
          <div class="progress-chart" id="language-chart"></div>
        </div>
        
        <div class="error-text" id="error-message"></div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          // Elements
          const tabs = document.querySelectorAll('.tab');
          const tabContents = document.querySelectorAll('.tab-content');
          const refreshButton = document.getElementById('refresh-button');
          const analyzeButton = document.getElementById('analyze-button');
          const errorMessageElement = document.getElementById('error-message');
          const treeView = document.getElementById('tree-view');
          const totalFilesElement = document.getElementById('total-files');
          const totalLinesElement = document.getElementById('total-lines');
          const avgComplexityElement = document.getElementById('avg-complexity');
          const fileTypesChart = document.getElementById('file-types-chart');
          const languageChart = document.getElementById('language-chart');
          
          // Tab switching
          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              tabs.forEach(t => t.classList.remove('active'));
              tabContents.forEach(c => c.classList.remove('active'));
              
              tab.classList.add('active');
              const tabId = \`\${tab.getAttribute('data-tab')}-tab\`;
              document.getElementById(tabId).classList.add('active');
            });
          });
          
          // Refresh button click handler
          refreshButton.addEventListener('click', () => {
            vscode.postMessage({
              command: 'refreshExplorer'
            });
          });
          
          // Analyze button click handler
          analyzeButton.addEventListener('click', () => {
            vscode.postMessage({
              command: 'analyzeStructure'
            });
          });
          
          // File icons lookup
          function getFileIcon(extension) {
            const iconMap = {
              ts: '📘',
              js: '📙',
              json: '📒',
              md: '📝',
              html: '🌐',
              css: '🎨',
              svg: '🖼️',
              png: '🖼️',
              jpg: '🖼️',
              default: '📄'
            };
            
            return iconMap[extension] || iconMap.default;
          }
          
          // Tree view generation
          function generateTreeView(node, container) {
            if (!node) return;
            
            if (node.type === 'directory') {
              const itemElement = document.createElement('div');
              itemElement.className = 'tree-item';
              
              const toggleElement = document.createElement('span');
              toggleElement.className = 'tree-toggle';
              toggleElement.textContent = node.collapsed ? '▶' : '▼';
              
              const labelElement = document.createElement('span');
              labelElement.className = 'tree-label';
              labelElement.textContent = node.name;
              
              itemElement.appendChild(toggleElement);
              itemElement.appendChild(labelElement);
              container.appendChild(itemElement);
              
              const childrenContainer = document.createElement('div');
              childrenContainer.className = \`tree-children \${node.collapsed ? '' : 'expanded'}\`;
              container.appendChild(childrenContainer);
              
              if (node.children && node.children.length) {
                node.children.forEach(child => {
                  generateTreeView(child, childrenContainer);
                });
              }
              
              toggleElement.addEventListener('click', (e) => {
                e.stopPropagation();
                node.collapsed = !node.collapsed;
                toggleElement.textContent = node.collapsed ? '▶' : '▼';
                childrenContainer.classList.toggle('expanded');
              });
            } else {
              const itemElement = document.createElement('div');
              itemElement.className = 'tree-item';
              
              const iconElement = document.createElement('span');
              iconElement.className = 'file-icon';
              iconElement.textContent = getFileIcon(node.extension);
              
              const labelElement = document.createElement('span');
              labelElement.className = 'tree-label';
              labelElement.textContent = node.name;
              
              itemElement.appendChild(iconElement);
              itemElement.appendChild(labelElement);
              container.appendChild(itemElement);
              
              itemElement.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'openFile',
                  path: node.path
                });
              });
            }
          }
          
          // Bar chart generation
          function generateBarChart(data, container) {
            container.innerHTML = '';
            
            data.forEach(item => {
              const barContainer = document.createElement('div');
              barContainer.className = 'bar';
              barContainer.style.height = \`\${(item.count / Math.max(...data.map(d => d.count))) * 100}%\`;
              
              const valueElement = document.createElement('div');
              valueElement.className = 'bar-value';
              valueElement.textContent = item.count;
              
              const labelElement = document.createElement('div');
              labelElement.className = 'bar-label';
              labelElement.textContent = item.type;
              
              barContainer.appendChild(valueElement);
              barContainer.appendChild(labelElement);
              container.appendChild(barContainer);
            });
          }
          
          // Progress chart generation
          function generateProgressChart(data, container) {
            container.innerHTML = '';
            
            data.forEach(item => {
              const itemElement = document.createElement('div');
              itemElement.className = 'progress-item';
              
              const labelContainer = document.createElement('div');
              labelContainer.className = 'progress-label';
              
              const nameElement = document.createElement('span');
              nameElement.textContent = item.language;
              
              const valueElement = document.createElement('span');
              valueElement.textContent = \`\${item.percentage}%\`;
              
              labelContainer.appendChild(nameElement);
              labelContainer.appendChild(valueElement);
              
              const barElement = document.createElement('div');
              barElement.className = 'progress-bar';
              
              const fillElement = document.createElement('div');
              fillElement.className = 'progress-fill';
              fillElement.style.width = \`\${item.percentage}%\`;
              
              // Assign different colors based on language
              const colors = {
                'TypeScript': '#007ACC',
                'JavaScript': '#F7DF1E',
                'HTML': '#E34F26',
                'CSS': '#1572B6',
                'JSON': '#CCCCCC',
                'Markdown': '#083FA1'
              };
              
              fillElement.style.backgroundColor = colors[item.language] || '#007ACC';
              
              barElement.appendChild(fillElement);
              
              itemElement.appendChild(labelContainer);
              itemElement.appendChild(barElement);
              container.appendChild(itemElement);
            });
          }
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'updateExplorer':
                const { workspace, metrics, languages } = message.data;
                
                // Update tree view
                treeView.innerHTML = '';
                generateTreeView(workspace, treeView);
                
                // Update metrics
                totalFilesElement.textContent = metrics.totalFiles;
                totalLinesElement.textContent = metrics.totalLines.toLocaleString();
                avgComplexityElement.textContent = metrics.avgComplexity;
                
                // Update file types chart
                generateBarChart(metrics.fileTypes, fileTypesChart);
                
                // Update languages chart
                generateProgressChart(languages, languageChart);
                break;
                
              case 'showError':
                errorMessageElement.textContent = message.message;
                errorMessageElement.classList.add('active');
                setTimeout(() => {
                  errorMessageElement.classList.remove('active');
                }, 5000);
                break;
            }
          });
          
          // Request initial data
          vscode.postMessage({
            command: 'refreshExplorer'
          });
        </script>
      </body>
      </html>`;
  }
} 