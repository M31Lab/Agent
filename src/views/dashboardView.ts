import * as vscode from 'vscode';
import { PanelManager } from '../components/panelManager';

export class DashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'm31-agent.dashboardView';
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _panelManager?: PanelManager;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  public setPanelManager(panelManager: PanelManager): void {
    this._panelManager = panelManager;
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
        case 'launchFeature':
          this.handleFeatureLaunch(message.featureId);
          break;
        case 'refreshData':
          await this.refreshDashboardData();
          break;
        case 'openSettings':
          vscode.commands.executeCommand('m31-agent.configureSettings');
          break;
      }
    });
  }

  private async handleFeatureLaunch(featureId: string): Promise<void> {
    switch (featureId) {
      case 'chat':
        vscode.commands.executeCommand('m31-agent.showChat');
        break;
      case 'codeExplorer':
        vscode.commands.executeCommand('m31-agent.navigateCodebase');
        break;
      case 'diagnostics':
        vscode.commands.executeCommand('m31-agent.diagnostics.showAll');
        break;
      case 'modelConfig':
        vscode.commands.executeCommand('m31-agent.selectModel');
        break;
      case 'quickChat':
        vscode.commands.executeCommand('m31-agent.quickChat');
        break;
      case 'generateCode':
        vscode.commands.executeCommand('m31-agent.generateCode');
        break;
      case 'explainCode':
        vscode.commands.executeCommand('m31-agent.explainCode');
        break;
      case 'webSearch':
        vscode.commands.executeCommand('m31-agent.webSearch.search');
        break;
    }
  }

  private async refreshDashboardData(): Promise<void> {
    try {
      const extensionConfig = vscode.workspace.getConfiguration('m31-agent');
      const selectedModel = extensionConfig.get<string>('modelId', 'Unknown');
      const hasApiKey = extensionConfig.get<string>('apiKey', '') !== '';
      
      const diagnostics = vscode.languages.getDiagnostics();
      const errorCount = diagnostics.reduce((count, [_, fileDiagnostics]) => {
        return count + fileDiagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
      }, 0);
      
      const warningCount = diagnostics.reduce((count, [_, fileDiagnostics]) => {
        return count + fileDiagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
      }, 0);

      this._view?.webview.postMessage({
        command: 'updateDashboardData',
        data: {
          currentModel: selectedModel,
          apiConfigured: hasApiKey,
          diagnosticsSummary: {
            errors: errorCount,
            warnings: warningCount
          },
          recentActivity: this.getRecentActivityData()
        }
      });
    } catch (error) {
      this._view?.webview.postMessage({
        command: 'showError',
        message: `Failed to refresh dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private getRecentActivityData() {
    return [
      { 
        type: 'chat', 
        timestamp: new Date().getTime() - 3600000, 
        description: 'Code explanation session' 
      },
      { 
        type: 'code', 
        timestamp: new Date().getTime() - 7200000, 
        description: 'Generated test suite' 
      },
      { 
        type: 'diagnostic', 
        timestamp: new Date().getTime() - 14400000, 
        description: 'Fixed 3 linting errors' 
      }
    ];
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>M31 Agent Dashboard</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 0;
            margin: 0;
          }
          
          .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            padding: 16px;
          }
          
          .header {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .header h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 400;
          }
          
          .refresh-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
          }
          
          .refresh-button:hover {
            background: var(--vscode-button-hoverBackground);
          }
          
          .card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            min-height: 120px;
          }
          
          .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            background-color: var(--vscode-editor-selectionBackground);
          }
          
          .card-icon {
            width: 40px;
            height: 40px;
            margin-bottom: 12px;
            opacity: 0.8;
          }
          
          .card-title {
            font-size: 14px;
            font-weight: 500;
            margin: 0;
            margin-bottom: 6px;
          }
          
          .card-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin: 0;
          }
          
          .status-section {
            margin-top: 24px;
            padding: 0 16px 16px;
          }
          
          .status-title {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 12px;
            color: var(--vscode-editor-foreground);
          }
          
          .status-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .status-label {
            font-size: 12px;
          }
          
          .status-value {
            font-size: 12px;
            font-weight: 500;
          }
          
          .activity-list {
            margin-top: 24px;
            padding: 0 16px 16px;
          }
          
          .activity-item {
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 4px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            font-size: 12px;
          }
          
          .activity-time {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
          }
          
          .settings-button {
            width: 100%;
            margin-top: 16px;
            padding: 8px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          }
          
          .settings-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>M31 Agent Dashboard</h1>
          <button class="refresh-button" id="refresh-button">Refresh</button>
        </div>
        
        <div class="dashboard">
          <div class="card" data-feature="chat">
            <span class="card-icon">💬</span>
            <h3 class="card-title">AI Chat</h3>
            <p class="card-description">Get help from your AI assistant</p>
          </div>
          
          <div class="card" data-feature="codeExplorer">
            <span class="card-icon">🔍</span>
            <h3 class="card-title">Code Explorer</h3>
            <p class="card-description">Navigate your codebase</p>
          </div>
          
          <div class="card" data-feature="diagnostics">
            <span class="card-icon">🔧</span>
            <h3 class="card-title">Diagnostics</h3>
            <p class="card-description">View issues and fixes</p>
          </div>
          
          <div class="card" data-feature="modelConfig">
            <span class="card-icon">⚙️</span>
            <h3 class="card-title">AI Models</h3>
            <p class="card-description">Configure AI settings</p>
          </div>
          
          <div class="card" data-feature="quickChat">
            <span class="card-icon">⚡</span>
            <h3 class="card-title">Quick Chat</h3>
            <p class="card-description">Rapid AI assistance</p>
          </div>
          
          <div class="card" data-feature="generateCode">
            <span class="card-icon">✨</span>
            <h3 class="card-title">Generate Code</h3>
            <p class="card-description">Create new code with AI</p>
          </div>
          
          <div class="card" data-feature="explainCode">
            <span class="card-icon">📖</span>
            <h3 class="card-title">Explain Code</h3>
            <p class="card-description">Understand complex code</p>
          </div>
          
          <div class="card" data-feature="webSearch">
            <span class="card-icon">🔎</span>
            <h3 class="card-title">Web Search</h3>
            <p class="card-description">Search the web for solutions</p>
          </div>
        </div>
        
        <div class="status-section">
          <h2 class="status-title">System Status</h2>
          <div class="status-item">
            <span class="status-label">Current AI Model</span>
            <span class="status-value" id="current-model">Loading...</span>
          </div>
          <div class="status-item">
            <span class="status-label">API Configuration</span>
            <span class="status-value" id="api-status">Loading...</span>
          </div>
          <div class="status-item">
            <span class="status-label">Errors</span>
            <span class="status-value" id="error-count">Loading...</span>
          </div>
          <div class="status-item">
            <span class="status-label">Warnings</span>
            <span class="status-value" id="warning-count">Loading...</span>
          </div>
        </div>
        
        <div class="activity-list">
          <h2 class="status-title">Recent Activity</h2>
          <div id="activity-container"></div>
        </div>
        
        <div style="padding: 0 16px 16px">
          <button class="settings-button" id="settings-button">Open Settings</button>
        </div>
        
        <div class="error-text" id="error-message"></div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          // Elements
          const refreshButton = document.getElementById('refresh-button');
          const featureCards = document.querySelectorAll('.card');
          const settingsButton = document.getElementById('settings-button');
          const currentModelElement = document.getElementById('current-model');
          const apiStatusElement = document.getElementById('api-status');
          const errorCountElement = document.getElementById('error-count');
          const warningCountElement = document.getElementById('warning-count');
          const activityContainer = document.getElementById('activity-container');
          const errorMessageElement = document.getElementById('error-message');
          
          // Feature card click handlers
          featureCards.forEach(card => {
            card.addEventListener('click', () => {
              const featureId = card.getAttribute('data-feature');
              vscode.postMessage({
                command: 'launchFeature',
                featureId
              });
            });
          });
          
          // Refresh button click handler
          refreshButton.addEventListener('click', () => {
            vscode.postMessage({
              command: 'refreshData'
            });
          });
          
          // Settings button click handler
          settingsButton.addEventListener('click', () => {
            vscode.postMessage({
              command: 'openSettings'
            });
          });
          
          // Format timestamp to relative time
          function formatRelativeTime(timestamp) {
            const now = new Date().getTime();
            const diffMinutes = Math.floor((now - timestamp) / (1000 * 60));
            
            if (diffMinutes < 1) {
              return 'Just now';
            } else if (diffMinutes < 60) {
              return \`\${diffMinutes} minute\${diffMinutes > 1 ? 's' : ''} ago\`;
            } else {
              const diffHours = Math.floor(diffMinutes / 60);
              return \`\${diffHours} hour\${diffHours > 1 ? 's' : ''} ago\`;
            }
          }
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'updateDashboardData':
                const { currentModel, apiConfigured, diagnosticsSummary, recentActivity } = message.data;
                
                currentModelElement.textContent = currentModel;
                apiStatusElement.textContent = apiConfigured ? 'Configured ✓' : 'Not configured ✗';
                errorCountElement.textContent = diagnosticsSummary.errors;
                warningCountElement.textContent = diagnosticsSummary.warnings;
                
                // Update activity list
                activityContainer.innerHTML = '';
                recentActivity.forEach(activity => {
                  const activityElement = document.createElement('div');
                  activityElement.className = 'activity-item';
                  activityElement.innerHTML = \`
                    <div>\${activity.description}</div>
                    <div class="activity-time">\${formatRelativeTime(activity.timestamp)}</div>
                  \`;
                  activityContainer.appendChild(activityElement);
                });
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
            command: 'refreshData'
          });
        </script>
      </body>
      </html>`;
  }
} 