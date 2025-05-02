import * as vscode from 'vscode';
import * as os from 'os';
import { TelemetryService } from '../services/telemetry/telemetryService';
import { ApiClient } from '../api/apiClient';
import { ExtensionContext } from '../models/context/extensionContext';
import { LoggingService } from '../utils/logging/loggingService';
import { PerformanceMonitoringService } from '../services/performance/performanceMonitoringService';
import { ConfigurationService } from '../services/configuration/configurationService';

export class PerformanceViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'm31-agent.performanceView';
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _updateInterval?: NodeJS.Timeout;
  private _extensionContext?: ExtensionContext;
  private _apiCallData: number[] = Array(30).fill(0);
  private _tokenUsageData: number[] = Array(30).fill(0);
  private _cpuUsageData: number[] = Array(30).fill(0);
  private _memoryUsageData: number[] = Array(30).fill(0);
  private _previousCpuInfo: os.CpuInfo[] = [];
  private _telemetryService: TelemetryService | undefined;
  private _apiClient: ApiClient | undefined;
  private _loggingService: LoggingService | undefined;
  private _performanceMonitoringService: PerformanceMonitoringService | undefined;
  private _configService: ConfigurationService | undefined;
  private _lastCpuUsage = 0;

  constructor(extensionUri: vscode.Uri, extensionContext?: ExtensionContext) {
    this._extensionUri = extensionUri;
    this._extensionContext = extensionContext;
    
    // Get services from extension context if available
    if (extensionContext) {
      this._telemetryService = extensionContext.telemetryService;
      this._apiClient = extensionContext.apiClient;
      this._loggingService = extensionContext.loggingService;
      this._performanceMonitoringService = extensionContext.performanceMonitoringService;
      this._configService = extensionContext.configurationService;
    } else {
      // Get singletons if context not provided
      this._telemetryService = TelemetryService.getInstance();
      this._loggingService = LoggingService.getInstance();
      this._performanceMonitoringService = PerformanceMonitoringService.getInstance();
      this._configService = ConfigurationService.getInstance();
    }
    
    // Initialize CPU measurements
    this._previousCpuInfo = os.cpus();
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
        case 'startMonitoring':
          this.startMonitoring();
          break;
        case 'stopMonitoring':
          this.stopMonitoring();
          break;
        case 'clearData':
          this.clearData();
          break;
        case 'exportData':
          this.exportPerformanceData();
          break;
      }
    });

    webviewView.onDidDispose(() => {
      this.stopMonitoring();
    });

    this.startMonitoring();
  }

  private startMonitoring(): void {
    if (this._updateInterval) {
      return;
    }

    this._updateInterval = setInterval(() => {
      this.updatePerformanceData();
    }, 2000);
  }

  private stopMonitoring(): void {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = undefined;
    }
  }

  private clearData(): void {
    this._apiCallData = Array(30).fill(0);
    this._tokenUsageData = Array(30).fill(0);
    this._cpuUsageData = Array(30).fill(0);
    this._memoryUsageData = Array(30).fill(0);

    if (this._view) {
      this._view.webview.postMessage({
        command: 'clearCharts'
      });
    }
  }

  private async updatePerformanceData(): Promise<void> {
    if (!this._view) {
      return;
    }

    try {
      // Get actual API usage metrics from our enhanced getApiMetrics method
      const { apiCalls, tokenUsage } = await this.getApiMetrics();
      
      // Get real system metrics
      const cpuUsage = this.getCpuUsage();
      const memoryUsage = this.getMemoryUsage();
      
      // Update data arrays (shift and add new value)
      this._apiCallData.shift();
      this._apiCallData.push(apiCalls);
      
      this._tokenUsageData.shift();
      this._tokenUsageData.push(tokenUsage);
      
      this._cpuUsageData.shift();
      this._cpuUsageData.push(cpuUsage);
      
      this._memoryUsageData.shift();
      this._memoryUsageData.push(memoryUsage);
      
      // Calculate actual aggregate values from real services
      let totalApiCalls = 0;
      let totalTokens = 0;
      
      // Try to get these values from the most accurate source available
      if (this._performanceMonitoringService) {
        const totalMetrics = this._performanceMonitoringService.getTotalMetrics();
        totalApiCalls = totalMetrics.totalApiCalls;
        totalTokens = totalMetrics.totalTokenUsage;
      } else if (this._apiClient) {
        totalApiCalls = this._apiClient.getTotalApiCalls(); 
        totalTokens = this._apiClient.getTotalTokenUsage();
      } else {
        // If no service available, calculate from our tracked data
        totalApiCalls = this._apiCallData.reduce((sum, value) => sum + value, 0);
        totalTokens = this._tokenUsageData.reduce((sum, value) => sum + value, 0);
      }
      
      // Calculate average CPU usage from non-zero values
      const nonZeroCpuValues = this._cpuUsageData.filter(v => v > 0);
      const avgCpuUsage = nonZeroCpuValues.length > 0 
        ? nonZeroCpuValues.reduce((sum, value) => sum + value, 0) / nonZeroCpuValues.length 
        : 0;
      
      // Send data to webview
      this._view.webview.postMessage({
        command: 'updatePerformanceData',
        data: {
          apiCallData: this._apiCallData,
          tokenUsageData: this._tokenUsageData,
          cpuUsageData: this._cpuUsageData,
          memoryUsageData: this._memoryUsageData,
          totals: {
            apiCalls: totalApiCalls,
            tokens: totalTokens,
            avgCpu: avgCpuUsage.toFixed(1),
            memory: memoryUsage.toFixed(1)
          }
        }
      });
      
      // Log performance data to telemetry if enabled
      if (this._telemetryService && this._configService?.get('enableTelemetry', true)) {
        this._telemetryService.trackEvent('performance_metrics', {
          cpuUsage: cpuUsage.toString(),
          memoryUsage: memoryUsage.toString(),
          apiCalls: apiCalls.toString(),
          tokenUsage: tokenUsage.toString(),
          timestamp: new Date().toISOString()
        });
      }
      
      // Log detailed performance data at debug level
      this._loggingService?.debug(`Performance update: CPU ${cpuUsage.toFixed(1)}%, Memory ${memoryUsage.toFixed(1)}%, API calls ${apiCalls}, Tokens ${tokenUsage}`);
    } catch (error) {
      // Log error
      this._loggingService?.error(`Failed to update performance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Show error in UI
      if (this._view) {
        this._view.webview.postMessage({
          command: 'showError',
          message: `Failed to update performance data: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
  }

  private async getApiMetrics(): Promise<{ apiCalls: number, tokenUsage: number }> {
    // First try to get metrics from PerformanceMonitoringService - most accurate source
    if (this._performanceMonitoringService) {
      const metrics = this._performanceMonitoringService.getLatestMetrics();
      if (metrics && metrics.api) {
        return {
          apiCalls: metrics.api.callCount || 0,
          tokenUsage: metrics.api.tokenUsage || 0
        };
      }
    }
    
    // Then try ApiClient - direct source of metrics
    if (this._apiClient) {
      try {
        const apiCallsSinceLastCheck = this._apiClient.getApiCallsSinceLastCheck();
        const tokenUsageSinceLastCheck = this._apiClient.getTokenUsageSinceLastCheck();
        
        // Log successful metrics retrieval
        this._loggingService?.debug(`Retrieved API metrics: ${apiCallsSinceLastCheck} calls, ${tokenUsageSinceLastCheck} tokens`);
        
        return {
          apiCalls: apiCallsSinceLastCheck,
          tokenUsage: tokenUsageSinceLastCheck
        };
      } catch (error) {
        this._loggingService?.error(`Failed to get API metrics from ApiClient: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // If no metrics source available or all failed, try to get from diagnostics data
    if (this._extensionContext?.diagnosticsMonitoringService) {
      try {
        // Diagnostics service doesn't have a specific API metrics method,
        // so we'll get counts from the diagnostics data instead
        const errorCount = this._extensionContext.diagnosticsMonitoringService.getErrorCount();
        
        // Use error count as a proxy for API calls (not accurate but better than nothing)
        this._loggingService?.debug(`Using diagnostics as proxy for metrics: ${errorCount.errors} errors, ${errorCount.warnings} warnings`);
        
        return {
          apiCalls: errorCount.errors || 0,
          tokenUsage: errorCount.warnings || 0 // Using warnings as proxy for token usage
        };
      } catch (error) {
        this._loggingService?.error(`Failed to get metrics from DiagnosticsMonitoringService: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // If all attempts failed, return zeros and log the issue
    this._loggingService?.warn('Unable to get API metrics from any source, returning zeros');
    return {
      apiCalls: 0,
      tokenUsage: 0
    };
  }

  private getCpuUsage(): number {
    try {
      const currentCpuInfo = os.cpus();
      
      if (!currentCpuInfo.length || !this._previousCpuInfo.length) {
        return this._lastCpuUsage;
      }
      
      let totalUser = 0;
      let totalSystem = 0;
      let totalIdle = 0;
      let totalTick = 0;
      
      let prevTotalUser = 0;
      let prevTotalSystem = 0;
      let prevTotalIdle = 0;
      let prevTotalTick = 0;
      
      // Calculate current values
      for (const cpu of currentCpuInfo) {
        totalUser += cpu.times.user;
        totalSystem += cpu.times.sys;
        totalIdle += cpu.times.idle;
        totalTick += cpu.times.user + cpu.times.sys + cpu.times.idle + cpu.times.nice + cpu.times.irq;
      }
      
      // Calculate previous values
      for (const cpu of this._previousCpuInfo) {
        prevTotalUser += cpu.times.user;
        prevTotalSystem += cpu.times.sys;
        prevTotalIdle += cpu.times.idle;
        prevTotalTick += cpu.times.user + cpu.times.sys + cpu.times.idle + cpu.times.nice + cpu.times.irq;
      }
      
      // Calculate deltas
      const deltaTotal = totalTick - prevTotalTick;
      const deltaIdle = totalIdle - prevTotalIdle;
      
      // Calculate CPU usage as percentage
      const cpuPercent = deltaTotal === 0 ? 0 : 100 * (1 - deltaIdle / deltaTotal);
      
      // Update previous info for next calculation
      this._previousCpuInfo = currentCpuInfo;
      this._lastCpuUsage = parseFloat(cpuPercent.toFixed(1));
      
      return this._lastCpuUsage;
    } catch (error) {
      // In case of error, return last known value or 0
      return this._lastCpuUsage || 0;
    }
  }

  private getMemoryUsage(): number {
    try {
      // Get actual VM memory usage for this process
      const processMemoryUsage = process.memoryUsage();
      const heapUsed = processMemoryUsage.heapUsed;
      const heapTotal = processMemoryUsage.heapTotal;
      
      // Calculate percentage of heap used
      const heapPercentage = (heapUsed / heapTotal) * 100;
      
      // Get overall system memory information
      const totalSystemMemory = os.totalmem();
      const freeSystemMemory = os.freemem();
      const systemMemoryUsed = totalSystemMemory - freeSystemMemory;
      const systemMemoryPercentage = (systemMemoryUsed / totalSystemMemory) * 100;
      
      // Return system memory usage as it's more relevant for user
      return parseFloat(systemMemoryPercentage.toFixed(1));
    } catch (error) {
      // In case of error, return 0
      return 0;
    }
  }

  private async exportPerformanceData(): Promise<void> {
    try {
      // Initialize data structures
      let apiCallHistory = [];
      let tokenUsageHistory = [];
      let performanceHistory = [];
      let detailedMetrics = {};
      
      // Get comprehensive data from the most accurate source available
      if (this._performanceMonitoringService) {
        const fullMetrics = this._performanceMonitoringService.getFullMetricsHistory();
        apiCallHistory = fullMetrics.apiCallHistory || [];
        tokenUsageHistory = fullMetrics.tokenUsageHistory || [];
        performanceHistory = fullMetrics.performanceHistory || [];
        detailedMetrics = fullMetrics.detailedMetrics || {};
      } else if (this._apiClient) {
        apiCallHistory = this._apiClient.getApiCallHistory();
        tokenUsageHistory = this._apiClient.getTokenUsageHistory();
      }
      
      // Get extension version if available
      const extensionVersion = this._extensionContext?.vscodeContext.extension?.packageJSON?.version || 'unknown';
      
      // Get user settings (without sensitive data)
      const configService = this._extensionContext?.configurationService;
      const userSettings = configService ? {
        modelId: configService.get('modelId', 'unknown'),
        maxTokens: configService.get('maxTokens', 0),
        temperature: configService.get('temperature', 0),
        logLevel: configService.get('logLevel', 'info'),
        enableTelemetry: configService.get('enableTelemetry', false)
      } : {};
      
      // Compile complete data payload
      const data = {
        exportVersion: '1.1.0',
        timestamp: new Date().toISOString(),
        extension: {
          version: extensionVersion,
          uptime: process.uptime()
        },
        settings: userSettings,
        apiCalls: {
          recent: this._apiCallData,
          history: apiCallHistory,
          total: this._performanceMonitoringService?.getTotalMetrics().totalApiCalls || 
                this._apiClient?.getTotalApiCalls() || 0
        },
        tokenUsage: {
          recent: this._tokenUsageData,
          history: tokenUsageHistory,
          total: this._performanceMonitoringService?.getTotalMetrics().totalTokenUsage || 
                this._apiClient?.getTotalTokenUsage() || 0
        },
        systemResources: {
          cpu: {
            current: this._cpuUsageData[this._cpuUsageData.length - 1] || 0,
            history: this._cpuUsageData,
            cores: os.cpus().length
          },
          memory: {
            current: this._memoryUsageData[this._memoryUsageData.length - 1] || 0,
            history: this._memoryUsageData,
            total: os.totalmem(),
            free: os.freemem()
          }
        },
        processInfo: {
          uptime: process.uptime(),
          pid: process.pid,
          memoryUsage: process.memoryUsage()
        },
        performanceHistory,
        detailedMetrics,
        systemInfo: {
          platform: process.platform,
          architecture: process.arch,
          nodeVersion: process.version,
          osRelease: os.release(),
          cpuInfo: os.cpus().map(cpu => ({
            model: cpu.model,
            speed: cpu.speed
          })).slice(0, 1) // Just include the first CPU to avoid excessive data
        }
      };
      
      // Convert to JSON
      const json = JSON.stringify(data, null, 2);
      
      // Ask user where to save the file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`m31_performance_${timestamp}.json`),
        filters: {
          'JSON Files': ['json']
        }
      });
      
      // Write file if location was selected
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf8'));
        vscode.window.showInformationMessage('Performance data exported successfully');
        
        // Log export to telemetry
        this._telemetryService?.trackEvent('performance_data_exported', {
          dataSize: json.length.toString(),
          metricsCount: (apiCallHistory.length + tokenUsageHistory.length + performanceHistory.length).toString()
        });
        
        // Log success
        this._loggingService?.info(`Performance data exported to ${uri.fsPath}`);
      }
    } catch (error) {
      // Log error
      this._loggingService?.error(`Failed to export performance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Show error to user
      vscode.window.showErrorMessage(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>M31 Agent Performance</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 0;
            margin: 0;
          }
          
          .header {
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .header h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
          }
          
          .controls {
            display: flex;
            gap: 8px;
          }
          
          .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
          }
          
          .button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          
          .button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          
          .button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
          }
          
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            padding: 16px;
          }
          
          .metric-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            padding: 16px;
            position: relative;
          }
          
          .metric-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
          }
          
          .metric-title {
            font-size: 14px;
            font-weight: 500;
            margin: 0;
          }
          
          .metric-value {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          
          .metric-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
          }
          
          .chart-container {
            height: 120px;
            position: relative;
            margin-top: 16px;
            display: flex;
            align-items: flex-end;
          }
          
          .chart-item {
            flex: 1;
            background-color: var(--vscode-charts-blue);
            border-radius: 1px 1px 0 0;
            min-width: 3px;
            margin-right: 1px;
            transition: height 0.2s ease;
          }
          
          .chart-item.api {
            background-color: #4e94ce;
          }
          
          .chart-item.token {
            background-color: #3fb950;
          }
          
          .chart-item.cpu {
            background-color: #f78166;
          }
          
          .chart-item.memory {
            background-color: #b180d7;
          }
          
          .chart-baseline {
            position: absolute;
            width: 100%;
            height: 1px;
            background-color: var(--vscode-panel-border);
            bottom: 0;
          }
          
          .resource-monitors {
            margin-top: 24px;
            padding: 0 16px 16px;
          }
          
          .monitor-row {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
          }
          
          .monitor-label {
            width: 100px;
            font-size: 12px;
          }
          
          .monitor-bar-container {
            flex-grow: 1;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
          }
          
          .monitor-bar {
            height: 100%;
            transition: width 0.2s ease;
          }
          
          .monitor-bar.cpu {
            background-color: #f78166;
          }
          
          .monitor-bar.memory {
            background-color: #b180d7;
          }
          
          .monitor-value {
            width: 50px;
            text-align: right;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-left: 8px;
          }
          
          .error-text {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 8px;
            margin: 16px;
            border-radius: 4px;
            font-size: 12px;
            display: none;
          }
          
          .error-text.active {
            display: block;
          }
          
          .footer {
            padding: 8px 16px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
            border-top: 1px solid var(--vscode-panel-border);
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Performance Metrics</h2>
          <div class="controls">
            <button id="monitor-toggle" class="button">Pause</button>
            <button id="clear-data" class="button secondary">Clear</button>
            <button id="export-data" class="button secondary">Export</button>
          </div>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <h3 class="metric-title">API Calls</h3>
            </div>
            <div class="metric-value" id="api-calls-value">0</div>
            <div class="metric-label">Total API requests</div>
            <div class="chart-container">
              <div class="chart-baseline"></div>
              <div id="api-calls-chart" class="chart"></div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-header">
              <h3 class="metric-title">Token Usage</h3>
            </div>
            <div class="metric-value" id="token-usage-value">0</div>
            <div class="metric-label">Total tokens</div>
            <div class="chart-container">
              <div class="chart-baseline"></div>
              <div id="token-usage-chart" class="chart"></div>
            </div>
          </div>
        </div>
        
        <div class="resource-monitors">
          <div class="monitor-row">
            <div class="monitor-label">CPU Usage</div>
            <div class="monitor-bar-container">
              <div id="cpu-bar" class="monitor-bar cpu" style="width: 0%"></div>
            </div>
            <div id="cpu-value" class="monitor-value">0%</div>
          </div>
          
          <div class="monitor-row">
            <div class="monitor-label">Memory Usage</div>
            <div class="monitor-bar-container">
              <div id="memory-bar" class="monitor-bar memory" style="width: 0%"></div>
            </div>
            <div id="memory-value" class="monitor-value">0%</div>
          </div>
        </div>
        
        <div class="error-text" id="error-message"></div>
        
        <div class="footer">
          Monitoring system resources and API usage in real-time
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          let isMonitoring = true;
          
          // Elements
          const monitorToggle = document.getElementById('monitor-toggle');
          const clearDataButton = document.getElementById('clear-data');
          const exportDataButton = document.getElementById('export-data');
          const errorMessageElement = document.getElementById('error-message');
          
          // Metric values
          const apiCallsValue = document.getElementById('api-calls-value');
          const tokenUsageValue = document.getElementById('token-usage-value');
          
          // Charts
          const apiCallsChart = document.getElementById('api-calls-chart');
          const tokenUsageChart = document.getElementById('token-usage-chart');
          
          // Resource monitors
          const cpuBar = document.getElementById('cpu-bar');
          const cpuValue = document.getElementById('cpu-value');
          const memoryBar = document.getElementById('memory-bar');
          const memoryValue = document.getElementById('memory-value');
          
          // Monitor toggle button
          monitorToggle.addEventListener('click', () => {
            if (isMonitoring) {
              vscode.postMessage({ command: 'stopMonitoring' });
              monitorToggle.textContent = 'Resume';
            } else {
              vscode.postMessage({ command: 'startMonitoring' });
              monitorToggle.textContent = 'Pause';
            }
            
            isMonitoring = !isMonitoring;
          });
          
          // Clear data button
          clearDataButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'clearData' });
          });
          
          // Export data button
          exportDataButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'exportData' });
          });
          
          // Generate chart items
          function generateChartItems(container, data, className) {
            container.innerHTML = '';
            
            // Find the max value for scaling
            const maxValue = Math.max(...data, 1);
            
            data.forEach(value => {
              const height = value === 0 ? 0 : Math.max((value / maxValue) * 100, 1);
              
              const item = document.createElement('div');
              item.className = \`chart-item \${className}\`;
              item.style.height = \`\${height}%\`;
              
              container.appendChild(item);
            });
          }
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'updatePerformanceData':
                const { apiCallData, tokenUsageData, cpuUsageData, memoryUsageData, totals } = message.data;
                
                // Update metrics
                apiCallsValue.textContent = totals.apiCalls;
                tokenUsageValue.textContent = totals.tokens;
                
                // Update charts
                generateChartItems(apiCallsChart, apiCallData, 'api');
                generateChartItems(tokenUsageChart, tokenUsageData, 'token');
                
                // Update resource monitors
                const cpuUsage = parseFloat(totals.avgCpu);
                const memUsage = parseFloat(totals.memory);
                
                cpuBar.style.width = \`\${cpuUsage}%\`;
                cpuValue.textContent = \`\${cpuUsage}%\`;
                
                memoryBar.style.width = \`\${memUsage}%\`;
                memoryValue.textContent = \`\${memUsage}%\`;
                break;
                
              case 'clearCharts':
                apiCallsValue.textContent = '0';
                tokenUsageValue.textContent = '0';
                
                apiCallsChart.innerHTML = '';
                tokenUsageChart.innerHTML = '';
                
                cpuBar.style.width = '0%';
                cpuValue.textContent = '0%';
                
                memoryBar.style.width = '0%';
                memoryValue.textContent = '0%';
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
            command: 'startMonitoring'
          });
        </script>
      </body>
      </html>`;
  }
} 