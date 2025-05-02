import * as vscode from 'vscode';
import * as os from 'os';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';

export interface PerformanceMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  apiCalls?: number;
  tokenUsage?: number;
}

interface ApiMetrics {
  callCount: number;
  tokenUsage: number;
  latency: number;
}

interface TotalMetrics {
  totalApiCalls: number;
  totalTokenUsage: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
  peakCpuUsage: number;
  peakMemoryUsage: number;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  uptime: number;
}

interface EndpointMetrics {
  calls: number;
  tokens: number;
  totalLatency: number;
  minLatency: number;
  maxLatency: number;
  avgLatency: number;
}

interface DetailedMetricsStore {
  [endpoint: string]: EndpointMetrics;
}

export class PerformanceMonitoringService implements vscode.Disposable {
  private static instance: PerformanceMonitoringService;
  private loggingService: LoggingService;
  private extensionContext?: ExtensionContext;
  private metricsHistory: PerformanceMetrics[] = [];
  private apiCallHistory: number[] = [];
  private tokenUsageHistory: number[] = [];
  private updateInterval?: NodeJS.Timeout;
  private totalApiCalls = 0;
  private totalTokens = 0;
  private lastApiCallCount = 0;
  private lastTokenCount = 0;
  private previousCpuInfo: os.CpuInfo[] = os.cpus();
  private onMetricsUpdatedEmitter = new vscode.EventEmitter<PerformanceMetrics>();
  private startTime = Date.now();
  private detailedMetrics: DetailedMetricsStore = {};
  private averageLatency = 0;
  private peakValues = {
    cpu: 0,
    memory: 0,
    apiCallsPerMinute: 0,
    tokensPerMinute: 0
  };

  public readonly onMetricsUpdated = this.onMetricsUpdatedEmitter.event;

  constructor(extensionContext?: ExtensionContext) {
    this.extensionContext = extensionContext;
    this.loggingService = extensionContext?.loggingService || LoggingService.getInstance();
    this.startMonitoring();
  }

  public static getInstance(extensionContext?: ExtensionContext): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService(extensionContext);
    }
    return PerformanceMonitoringService.instance;
  }

  public startMonitoring(): void {
    if (this.updateInterval) {
      return;
    }

    this.loggingService.debug('Starting performance monitoring');
    this.updateInterval = setInterval(() => this.updateMetrics(), 5000);
  }

  public stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
      this.loggingService.debug('Stopped performance monitoring');
    }
  }

  public getLatestMetrics(): { system: SystemMetrics; api: ApiMetrics } | undefined {
    if (this.metricsHistory.length === 0) {
      return undefined;
    }

    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    return {
      system: {
        cpu: latest.cpu,
        memory: latest.memory,
        uptime: (Date.now() - this.startTime) / 1000
      },
      api: {
        callCount: latest.apiCalls || 0,
        tokenUsage: latest.tokenUsage || 0,
        latency: this.averageLatency || 0
      }
    };
  }

  public getTotalMetrics(): TotalMetrics {
    const cpuValues = this.metricsHistory.map(m => m.cpu).filter(v => v > 0);
    const memoryValues = this.metricsHistory.map(m => m.memory).filter(v => v > 0);
    
    return {
      totalApiCalls: this.totalApiCalls,
      totalTokenUsage: this.totalTokens,
      averageCpuUsage: cpuValues.length > 0 
        ? cpuValues.reduce((sum, val) => sum + val, 0) / cpuValues.length
        : 0,
      averageMemoryUsage: memoryValues.length > 0
        ? memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length
        : 0,
      peakCpuUsage: this.peakValues.cpu,
      peakMemoryUsage: this.peakValues.memory
    };
  }

  public getRecentApiActivity(): { apiCalls: number[]; tokenUsage: number[] } {
    // Return the last 30 entries or less if not available
    const apiCalls = this.apiCallHistory.slice(-30);
    const tokenUsage = this.tokenUsageHistory.slice(-30);
    
    return { apiCalls, tokenUsage };
  }

  public getFullMetricsHistory(): {
    apiCallHistory: number[];
    tokenUsageHistory: number[];
    performanceHistory: PerformanceMetrics[];
    detailedMetrics: DetailedMetricsStore;
    averageLatency: number;
  } {
    return {
      apiCallHistory: this.apiCallHistory,
      tokenUsageHistory: this.tokenUsageHistory,
      performanceHistory: this.metricsHistory,
      detailedMetrics: this.detailedMetrics,
      averageLatency: this.averageLatency
    };
  }

  public recordApiCall(tokenCount: number, latencyMs: number, endpoint: string): void {
    this.totalApiCalls++;
    this.totalTokens += tokenCount;
    
    // Record detailed metrics for this call
    const endpointMetrics: EndpointMetrics = this.detailedMetrics[endpoint] || {
      calls: 0,
      tokens: 0,
      totalLatency: 0,
      minLatency: Number.MAX_VALUE,
      maxLatency: 0,
      avgLatency: 0
    };
    
    endpointMetrics.calls++;
    endpointMetrics.tokens += tokenCount;
    endpointMetrics.totalLatency += latencyMs;
    endpointMetrics.minLatency = Math.min(endpointMetrics.minLatency, latencyMs);
    endpointMetrics.maxLatency = Math.max(endpointMetrics.maxLatency, latencyMs);
    endpointMetrics.avgLatency = endpointMetrics.totalLatency / endpointMetrics.calls;
    
    this.detailedMetrics[endpoint] = endpointMetrics;
    
    // Update average latency across all endpoints
    const totalCalls = Object.values(this.detailedMetrics)
      .filter((metrics): metrics is EndpointMetrics => 'calls' in metrics)
      .reduce((sum, metrics) => sum + metrics.calls, 0);
    
    const totalLatency = Object.values(this.detailedMetrics)
      .filter((metrics): metrics is EndpointMetrics => 'totalLatency' in metrics)
      .reduce((sum, metrics) => sum + metrics.totalLatency, 0);
    
    this.averageLatency = totalLatency / totalCalls;
    
    this.loggingService.debug(`Recorded API call: ${endpoint}, ${tokenCount} tokens, ${latencyMs}ms latency`);
  }

  private async updateMetrics(): Promise<void> {
    try {
      // Get CPU usage
      const cpuUsage = this.getCpuUsage();
      
      // Get memory usage
      const memoryUsage = this.getMemoryUsage();
      
      // Get API metrics from extension context if available
      let apiCalls = 0;
      let tokenUsage = 0;
      
      if (this.extensionContext?.apiClient) {
        apiCalls = this.extensionContext.apiClient.getApiCallsSinceLastCheck();
        tokenUsage = this.extensionContext.apiClient.getTokenUsageSinceLastCheck();
      } else {
        // Calculate difference from last check
        const currentApiCalls = this.totalApiCalls;
        const currentTokens = this.totalTokens;
        
        apiCalls = currentApiCalls - this.lastApiCallCount;
        tokenUsage = currentTokens - this.lastTokenCount;
        
        this.lastApiCallCount = currentApiCalls;
        this.lastTokenCount = currentTokens;
      }
      
      // Update historical arrays
      this.apiCallHistory.push(apiCalls);
      this.tokenUsageHistory.push(tokenUsage);
      
      // Update peak values
      this.peakValues.cpu = Math.max(this.peakValues.cpu, cpuUsage);
      this.peakValues.memory = Math.max(this.peakValues.memory, memoryUsage);
      
      // Calculate API calls per minute
      const recentApiCalls = this.apiCallHistory.slice(-12).reduce((sum, val) => sum + val, 0);
      const apiCallsPerMinute = recentApiCalls * (60 / 5); // 12 samples at 5 second intervals = 1 minute
      
      this.peakValues.apiCallsPerMinute = Math.max(this.peakValues.apiCallsPerMinute, apiCallsPerMinute);
      
      // Create metrics record
      const metrics: PerformanceMetrics = {
        timestamp: new Date().toISOString(),
        cpu: cpuUsage,
        memory: memoryUsage,
        apiCalls,
        tokenUsage
      };
      
      // Add to history and limit history size
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 360) { // Store about 30 minutes of history
        this.metricsHistory.shift();
      }
      
      // Limit size of API history arrays
      if (this.apiCallHistory.length > 720) { // 1 hour of history
        this.apiCallHistory.shift();
      }
      
      if (this.tokenUsageHistory.length > 720) {
        this.tokenUsageHistory.shift();
      }
      
      // Emit metrics updated event
      this.onMetricsUpdatedEmitter.fire(metrics);
      
      // Log metrics at debug level
      this.loggingService.debug(
        `Performance metrics: CPU: ${cpuUsage.toFixed(1)}%, Memory: ${memoryUsage.toFixed(1)}%, ` +
        `API calls: ${apiCalls}, Tokens: ${tokenUsage}`
      );
    } catch (error) {
      this.loggingService.error(`Failed to update performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getCpuUsage(): number {
    try {
      const currentCpuInfo = os.cpus();
      
      if (!currentCpuInfo.length || !this.previousCpuInfo.length) {
        return 0;
      }
      
      let totalIdle = 0;
      let totalTick = 0;
      
      let prevTotalIdle = 0;
      let prevTotalTick = 0;
      
      // Calculate current values
      for (const cpu of currentCpuInfo) {
        totalIdle += cpu.times.idle;
        totalTick += cpu.times.user + cpu.times.sys + cpu.times.idle + cpu.times.nice + cpu.times.irq;
      }
      
      // Calculate previous values
      for (const cpu of this.previousCpuInfo) {
        prevTotalIdle += cpu.times.idle;
        prevTotalTick += cpu.times.user + cpu.times.sys + cpu.times.idle + cpu.times.nice + cpu.times.irq;
      }
      
      // Calculate deltas
      const deltaTotal = totalTick - prevTotalTick;
      const deltaIdle = totalIdle - prevTotalIdle;
      
      // Calculate CPU usage as percentage
      const cpuPercent = deltaTotal === 0 ? 0 : 100 * (1 - deltaIdle / deltaTotal);
      
      // Update previous info for next calculation
      this.previousCpuInfo = currentCpuInfo;
      
      return parseFloat(cpuPercent.toFixed(1));
    } catch (error) {
      this.loggingService.error(`Failed to get CPU usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  private getMemoryUsage(): number {
    try {
      // Get system memory information
      const totalSystemMemory = os.totalmem();
      const freeSystemMemory = os.freemem();
      const systemMemoryUsed = totalSystemMemory - freeSystemMemory;
      const systemMemoryPercentage = (systemMemoryUsed / totalSystemMemory) * 100;
      
      return parseFloat(systemMemoryPercentage.toFixed(1));
    } catch (error) {
      this.loggingService.error(`Failed to get memory usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  public dispose(): void {
    this.stopMonitoring();
    this.onMetricsUpdatedEmitter.dispose();
  }
} 