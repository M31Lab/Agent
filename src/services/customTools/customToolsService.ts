import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as childProcess from 'child_process';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  CustomTool,
  _CustomToolAuth,
  CustomToolEndpoint,
  CustomToolInvocation,
  CustomToolResponse,
  ToolManifest,
} from '../../models/customTool';

export class CustomToolsService {
  private tools: Map<string, CustomTool> = new Map();
  private servers: Map<string, http.Server> = new Map();
  private readonly serverPort = 8642; // Default port for local MCP servers

  private readonly eventEmitter = new vscode.EventEmitter<CustomToolEvent>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly storageDir: string;

  public readonly onCustomToolEvent = this.eventEmitter.event;

  constructor(context: vscode.ExtensionContext) {
    this.disposables.push(this.eventEmitter);

    this.storageDir = path.join(context.globalStoragePath, 'custom-tools');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }

    this.loadTools();
  }

  public async createTool(
    name: string,
    description: string,
    serverCode: string,
    endpoints: CustomToolEndpoint[],
    options: {
      author?: string;
      icon?: string;
      autoStart?: boolean;
    } = {}
  ): Promise<CustomTool> {
    const toolId = uuidv4();
    const scriptPath = path.join(this.storageDir, `${toolId}.js`);

    fs.writeFileSync(scriptPath, serverCode, 'utf8');

    const tool: CustomTool = {
      id: toolId,
      name,
      description,
      version: '1.0.0',
      author: options.author,
      icon: options.icon,
      enabled: true,
      serverUrl: `http://localhost:${this.serverPort}`,
      endpoints,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tools.set(toolId, tool);
    this.saveTools();

    this.emitEvent({
      type: 'toolCreated',
      toolId,
      name,
      timestamp: Date.now(),
    });

    if (options.autoStart) {
      await this.startToolServer(toolId);
    }

    return tool;
  }

  public async startToolServer(toolId: string): Promise<boolean> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    if (this.servers.has(toolId)) {
      return true; // Server already running
    }

    try {
      const scriptPath = path.join(this.storageDir, `${toolId}.js`);

      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Server script for tool ${tool.name} not found`);
      }

      this.emitEvent({
        type: 'serverStarting',
        toolId,
        name: tool.name,
        timestamp: Date.now(),
      });

      // This is a simplified approach to start the server, but in a real
      // implementation, you'd use proper process spawning and management
      const server = await this.spawnServer(scriptPath, this.serverPort);

      this.servers.set(toolId, server);

      this.emitEvent({
        type: 'serverStarted',
        toolId,
        name: tool.name,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.emitEvent({
        type: 'serverFailed',
        toolId,
        name: tool.name,
        error: errorMessage,
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  public async stopToolServer(toolId: string): Promise<boolean> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const server = this.servers.get(toolId);
    if (!server) {
      return false; // Server not running
    }

    try {
      server.close();
      this.servers.delete(toolId);

      this.emitEvent({
        type: 'serverStopped',
        toolId,
        name: tool.name,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.emitEvent({
        type: 'error',
        toolId,
        name: tool.name,
        error: errorMessage,
        timestamp: Date.now(),
      });

      return false;
    }
  }

  public async invokeTool(
    toolId: string,
    endpointId: string,
    parameters: Record<string, unknown>
  ): Promise<CustomToolResponse> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const endpoint = tool.endpoints.find((e) => e.id === endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint ${endpointId} not found for tool ${tool.name}`);
    }

    const _invocation: CustomToolInvocation = {
      toolId,
      endpointId,
      parameters,
      timestamp: Date.now(),
    };

    this.emitEvent({
      type: 'invocationStarted',
      toolId,
      name: tool.name,
      endpoint: endpoint.name,
      parameters,
      timestamp: Date.now(),
    });

    try {
      if (!this.servers.has(toolId)) {
        await this.startToolServer(toolId);
      }

      const startTime = Date.now();

      const response = await axios({
        method: endpoint.method,
        url: `${tool.serverUrl}${endpoint.path}`,
        data: endpoint.method !== 'GET' ? parameters : undefined,
        params: endpoint.method === 'GET' ? parameters : undefined,
        headers: this.getAuthHeaders(tool),
        timeout: 30000, // 30 seconds timeout
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const result: CustomToolResponse = {
        status: response.status,
        data: response.data,
        executionTime,
      };

      this.emitEvent({
        type: 'invocationCompleted',
        toolId,
        name: tool.name,
        endpoint: endpoint.name,
        parameters,
        result: result.data,
        executionTime,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const result: CustomToolResponse = {
        status: 500,
        data: null,
        error: errorMessage,
        executionTime: 0,
      };

      this.emitEvent({
        type: 'invocationFailed',
        toolId,
        name: tool.name,
        endpoint: endpoint.name,
        parameters,
        error: errorMessage,
        timestamp: Date.now(),
      });

      return result;
    }
  }

  public async installExternalTool(url: string): Promise<CustomTool> {
    try {
      this.emitEvent({
        type: 'toolInstalling',
        url,
        timestamp: Date.now(),
      });

      const response = await axios.get(`${url}/manifest.json`, {
        timeout: 10000,
      });

      const manifest = response.data as ToolManifest;

      if (!manifest.name || !manifest.version || !manifest.endpoints) {
        throw new Error('Invalid tool manifest');
      }

      const toolId = uuidv4();

      const endpoints: CustomToolEndpoint[] = [];

      for (const [endpointPath, endpointInfo] of Object.entries(manifest.endpoints)) {
        const [method, path] = endpointPath.split(' ');

        if (!method || !path) {
          continue;
        }

        endpoints.push({
          id: uuidv4(),
          name: endpointInfo.description,
          description: endpointInfo.description,
          path,
          method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
          parameters: Object.entries(endpointInfo.parameters).map(([paramName, paramInfo]) => ({
            name: paramName,
            description: paramInfo.description,
            type: paramInfo.type,
            required: paramInfo.required,
            defaultValue: paramInfo.defaultValue,
            options: paramInfo.options,
          })),
          requiresAuth: false,
        });
      }

      const tool: CustomTool = {
        id: toolId,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        enabled: true,
        serverUrl: url,
        endpoints,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.tools.set(toolId, tool);
      this.saveTools();

      this.emitEvent({
        type: 'toolInstalled',
        toolId,
        name: tool.name,
        timestamp: Date.now(),
      });

      return tool;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.emitEvent({
        type: 'toolInstallFailed',
        url,
        error: errorMessage,
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  public async uninstallTool(toolId: string): Promise<boolean> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return false;
    }

    if (this.servers.has(toolId)) {
      await this.stopToolServer(toolId);
    }

    const scriptPath = path.join(this.storageDir, `${toolId}.js`);
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }

    this.tools.delete(toolId);
    this.saveTools();

    this.emitEvent({
      type: 'toolUninstalled',
      toolId,
      name: tool.name,
      timestamp: Date.now(),
    });

    return true;
  }

  public getAllTools(): CustomTool[] {
    return Array.from(this.tools.values());
  }

  public getTool(toolId: string): CustomTool | undefined {
    return this.tools.get(toolId);
  }

  public getRunningTools(): string[] {
    return Array.from(this.servers.keys());
  }

  private getAuthHeaders(tool: CustomTool): Record<string, string> {
    if (!tool.auth) {
      return {};
    }

    const headers: Record<string, string> = {};

    switch (tool.auth.type) {
      case 'apiKey':
        if (tool.auth.headerName && tool.auth.keyName) {
          headers[tool.auth.headerName] = tool.auth.keyName;
        }
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${tool.auth.keyName || ''}`;
        break;
      case 'basic':
        if (tool.auth.keyName) {
          headers['Authorization'] = `Basic ${Buffer.from(tool.auth.keyName).toString('base64')}`;
        }
        break;
    }

    return headers;
  }

  private spawnServer(scriptPath: string, port: number): Promise<http.Server> {
    return new Promise((resolve, reject) => {
      try {
        const node = childProcess.spawn('node', [scriptPath], {
          env: {
            ...process.env,
            PORT: port.toString(),
          },
        });

        let startupOutput = '';

        node.stdout.on('data', (data: Buffer) => {
          startupOutput += data.toString();
          if (startupOutput.includes('Server listening')) {
            // Need proper implementation here based on your server design
            resolve(node as unknown as http.Server);
          }
        });

        node.stderr.on('data', (data: Buffer) => {
          startupOutput += data.toString();
        });

        node.on('error', (err: Error) => {
          reject(err);
        });

        node.on('exit', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Server exited with code ${code}: ${startupOutput}`));
          }
        });

        // Timeout if server doesn't start in 10 seconds
        setTimeout(() => {
          reject(new Error(`Server startup timed out: ${startupOutput}`));
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  private saveTools(): void {
    const toolsData = Array.from(this.tools.values());
    fs.writeFileSync(
      path.join(this.storageDir, 'tools.json'),
      JSON.stringify(toolsData, null, 2),
      'utf8'
    );
  }

  private loadTools(): void {
    try {
      const toolsFile = path.join(this.storageDir, 'tools.json');

      if (fs.existsSync(toolsFile)) {
        const data = fs.readFileSync(toolsFile, 'utf8');
        const tools = JSON.parse(data) as CustomTool[];

        for (const tool of tools) {
          this.tools.set(tool.id, tool);
        }
      }
    } catch (error) {
      console.error('Error loading custom tools:', error);
    }
  }

  private emitEvent(event: CustomToolEvent): void {
    this.eventEmitter.fire(event);
  }

  public dispose(): void {
    for (const [toolId, server] of this.servers.entries()) {
      try {
        server.close();
      } catch (error) {
        console.error(`Error closing server for tool ${toolId}:`, error);
      }
    }

    this.servers.clear();
    this.disposables.forEach((d) => d.dispose());
  }
}

export type CustomToolEventType =
  | 'toolCreated'
  | 'toolInstalling'
  | 'toolInstalled'
  | 'toolInstallFailed'
  | 'toolUninstalled'
  | 'serverStarting'
  | 'serverStarted'
  | 'serverStopped'
  | 'serverFailed'
  | 'invocationStarted'
  | 'invocationCompleted'
  | 'invocationFailed'
  | 'error';

export interface CustomToolEvent {
  type: CustomToolEventType;
  toolId?: string;
  name?: string;
  url?: string;
  endpoint?: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  executionTime?: number;
  error?: string;
  timestamp: number;
}
