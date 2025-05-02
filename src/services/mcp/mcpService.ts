import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as http from 'http';
import _axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ExtensionContext } from '../../models/context/extensionContext';
import {
    McpToolDefinition,
    McpEndpoint,
    McpParameter,
    _McpToolInvocation,
    McpToolResponse,
    McpServerConfig,
    McpEventType,
    createNewMcpToolDefinition
} from '../../models/mcpTool';

export interface McpEvent {
    type: McpEventType;
    toolId?: string;
    endpointId?: string;
    serverId?: string;
    data?: unknown;
    error?: string;
    timestamp: number;
}

export class McpService implements vscode.Disposable {
    private static instance: McpService | undefined;
    
    private tools: Map<string, McpToolDefinition> = new Map();
    private servers: Map<string, http.Server> = new Map();
    private serverConfigs: Map<string, McpServerConfig> = new Map();
    
    private readonly eventEmitter = new vscode.EventEmitter<McpEvent>();
    private readonly disposables: vscode.Disposable[] = [];
    private readonly storageDir: string;
    private readonly context: ExtensionContext;
    
    public readonly onMcpEvent = this.eventEmitter.event;
    
    private constructor(context: ExtensionContext) {
        this.context = context;
        this.disposables.push(this.eventEmitter);
        
        this.storageDir = path.join(context.vscodeContext.globalStoragePath, 'mcp-tools');
        
        this.initialize().catch(error => {
            this.context.loggingService.error('Failed to initialize MCP service:', error);
        });
    }

    public static getInstance(context?: ExtensionContext): McpService {
        if (!McpService.instance && context) {
            McpService.instance = new McpService(context);
        }
        
        if (!McpService.instance) {
            throw new Error('MCP service not initialized');
        }
        
        return McpService.instance;
    }
    
    private async initialize(): Promise<void> {
        try {
            // Create storage directories
            await fs.mkdir(this.storageDir, { recursive: true });
            await fs.mkdir(path.join(this.storageDir, 'tools'), { recursive: true });
            await fs.mkdir(path.join(this.storageDir, 'servers'), { recursive: true });
            
            // Load tools and server configs
            await this.loadTools();
            await this.loadServerConfigs();
            
            // Start all registered servers
            for (const [serverId, config] of this.serverConfigs.entries()) {
                if (config.autoStart) {
                    this.startServer(serverId).catch(error => {
                        this.context.loggingService.error(`Failed to start server ${serverId}:`, error);
                    });
                }
            }
            
            this.context.loggingService.info('MCP service initialized');
        } catch (error) {
            this.context.loggingService.error('Error initializing MCP service:', error);
            throw error;
        }
    }
    
    private async loadTools(): Promise<void> {
        try {
            const toolsDir = path.join(this.storageDir, 'tools');
            const files = await fs.readdir(toolsDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(toolsDir, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const tool = JSON.parse(content) as McpToolDefinition;
                        
                        this.tools.set(tool.id, tool);
                    } catch (error) {
                        this.context.loggingService.error(`Error loading tool from ${file}:`, error);
                    }
                }
            }
            
            this.context.loggingService.info(`Loaded ${this.tools.size} MCP tools`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                this.context.loggingService.error('Error loading MCP tools:', error);
            }
        }
    }
    
    private async loadServerConfigs(): Promise<void> {
        try {
            const serversDir = path.join(this.storageDir, 'servers');
            const files = await fs.readdir(serversDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(serversDir, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const config = JSON.parse(content) as McpServerConfig;
                        
                        this.serverConfigs.set(config.id, config);
                    } catch (error) {
                        this.context.loggingService.error(`Error loading server config from ${file}:`, error);
                    }
                }
            }
            
            this.context.loggingService.info(`Loaded ${this.serverConfigs.size} MCP server configs`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                this.context.loggingService.error('Error loading MCP server configs:', error);
            }
        }
    }
    
    public async createTool(
        name: string,
        description: string,
        author: string,
        endpoints: McpEndpoint[] = []
    ): Promise<string> {
        const tool = createNewMcpToolDefinition(name, description, author, endpoints);
        
        this.tools.set(tool.id, tool);
        
        await this.saveTool(tool);
        
        this.emitEvent({
            type: McpEventType.ToolCreated,
            toolId: tool.id,
            data: tool
        });
        
        return tool.id;
    }
    
    public async deleteToolById(toolId: string): Promise<boolean> {
        if (!this.tools.has(toolId)) {
            return false;
        }
        
        this.tools.delete(toolId);
        
        try {
            const filePath = path.join(this.storageDir, 'tools', `${toolId}.json`);
            await fs.unlink(filePath);
            
            this.emitEvent({
                type: McpEventType.ToolDeleted,
                toolId
            });
            
            return true;
        } catch (error) {
            this.context.loggingService.error(`Error deleting tool ${toolId}:`, error);
            throw error;
        }
    }
    
    public async updateTool(tool: McpToolDefinition): Promise<void> {
        if (!this.tools.has(tool.id)) {
            throw new Error(`Tool ${tool.id} not found`);
        }
        
        this.tools.set(tool.id, tool);
        await this.saveTool(tool);
        
        this.emitEvent({
            type: McpEventType.ToolUpdated,
            toolId: tool.id,
            data: tool
        });
    }
    
    private async saveTool(tool: McpToolDefinition): Promise<void> {
        try {
            const toolsDir = path.join(this.storageDir, 'tools');
            await fs.mkdir(toolsDir, { recursive: true });
            
            const filePath = path.join(toolsDir, `${tool.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(tool, null, 2));
        } catch (error) {
            this.context.loggingService.error(`Error saving tool ${tool.id}:`, error);
            throw error;
        }
    }
    
    public async addEndpointToTool(
        toolId: string, 
        name: string,
        description: string,
        parameters: McpParameter[] = []
    ): Promise<string> {
        const tool = this.tools.get(toolId);
        if (!tool) {
            throw new Error(`Tool ${toolId} not found`);
        }
        
        const endpointId = uuidv4();
        const endpoint: McpEndpoint = {
            id: endpointId,
            name,
            description,
            parameters
        };
        
        tool.endpoints.push(endpoint);
        
        await this.saveTool(tool);
        
        this.emitEvent({
            type: McpEventType.EndpointAdded,
            toolId,
            endpointId,
            data: endpoint
        });
        
        return endpointId;
    }
    
    public async removeEndpointFromTool(toolId: string, endpointId: string): Promise<boolean> {
        const tool = this.tools.get(toolId);
        if (!tool) {
            throw new Error(`Tool ${toolId} not found`);
        }
        
        const endpointIndex = tool.endpoints.findIndex(e => e.id === endpointId);
        if (endpointIndex === -1) {
            return false;
        }
        
        tool.endpoints.splice(endpointIndex, 1);
        
        await this.saveTool(tool);
        
        this.emitEvent({
            type: McpEventType.EndpointRemoved,
            toolId,
            endpointId
        });
        
        return true;
    }
    
    public async createLocalServer(
        name: string,
        description: string,
        port: number = 0,
        autoStart: boolean = true
    ): Promise<string> {
        // Find an available port if not specified
        if (port === 0) {
            port = await this.findAvailablePort(8000, 9000);
        }
        
        const serverId = uuidv4();
        const config: McpServerConfig = {
            id: serverId,
            name,
            description,
            type: 'local',
            port,
            autoStart,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.serverConfigs.set(serverId, config);
        
        await this.saveServerConfig(config);
        
        if (autoStart) {
            await this.startServer(serverId);
        }
        
        this.emitEvent({
            type: McpEventType.ServerCreated,
            serverId,
            data: config
        });
        
        return serverId;
    }
    
    private async findAvailablePort(min: number, max: number): Promise<number> {
        for (let port = min; port <= max; port++) {
            try {
                const server = http.createServer();
                
                await new Promise<void>((resolve, reject) => {
                    server.on('error', reject);
                    server.listen(port, () => {
                        server.close(() => resolve());
                    });
                });
                
                return port;
            } catch {
                // Port is in use, try the next one
                continue;
            }
        }
        
        throw new Error(`No available ports found in range ${min}-${max}`);
    }
    
    private async saveServerConfig(config: McpServerConfig): Promise<void> {
        try {
            const serversDir = path.join(this.storageDir, 'servers');
            await fs.mkdir(serversDir, { recursive: true });
            
            const filePath = path.join(serversDir, `${config.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(config, null, 2));
        } catch (error) {
            this.context.loggingService.error(`Error saving server config ${config.id}:`, error);
            throw error;
        }
    }
    
    public async startServer(serverId: string): Promise<void> {
        const config = this.serverConfigs.get(serverId);
        if (!config) {
            throw new Error(`Server ${serverId} not found`);
        }
        
        if (this.servers.has(serverId)) {
            throw new Error(`Server ${serverId} is already running`);
        }
        
        try {
            const server = http.createServer((req, res) => {
                this.handleServerRequest(serverId, req, res).catch(error => {
                    this.context.loggingService.error(`Error handling request on server ${serverId}:`, error);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                });
            });
            
            await new Promise<void>((resolve, reject) => {
                server.on('error', reject);
                server.listen(config.port, () => {
                    this.context.loggingService.info(`MCP server ${serverId} started on port ${config.port}`);
                    resolve();
                });
            });
            
            this.servers.set(serverId, server);
            
            this.emitEvent({
                type: McpEventType.ServerStarted,
                serverId,
                data: { port: config.port }
            });
        } catch (error) {
            this.context.loggingService.error(`Error starting server ${serverId}:`, error);
            throw error;
        }
    }
    
    public async stopServer(serverId: string): Promise<void> {
        const server = this.servers.get(serverId);
        if (!server) {
            throw new Error(`Server ${serverId} is not running`);
        }
        
        await new Promise<void>((resolve, reject) => {
            server.close(error => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
        
        this.servers.delete(serverId);
        
        this.emitEvent({
            type: McpEventType.ServerStopped,
            serverId
        });
    }
    
    private async handleServerRequest(
        serverId: string,
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        
        // Only support GET and POST methods
        if (req.method !== 'GET' && req.method !== 'POST') {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }
        
        // Handle MCP protocol endpoints
        const url = new URL(req.url || '/', `http://localhost:${this.serverConfigs.get(serverId)?.port}`);
        const pathname = url.pathname;
        
        if (pathname === '/mcp/manifest') {
            // Return manifest of all tools
            const manifest = Array.from(this.tools.values());
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ tools: manifest }));
            return;
        }
        
        if (pathname.startsWith('/mcp/invoke/')) {
            // Extract tool and endpoint IDs from path
            const pathParts = pathname.split('/').filter(Boolean);
            if (pathParts.length !== 3) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid invocation path' }));
                return;
            }
            
            const toolId = pathParts[2];
            const tool = this.tools.get(toolId);
            
            if (!tool) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: `Tool ${toolId} not found` }));
                return;
            }
            
            // Extract invocation details from request body
            const invocation = await this.readRequestBody(req);
            if (!invocation || typeof invocation !== 'object') {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid invocation data' }));
                return;
            }
            
            const endpointId = invocation.endpointId;
            const endpoint = tool.endpoints.find(e => e.id === endpointId);
            
            if (!endpoint) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: `Endpoint ${endpointId} not found` }));
                return;
            }
            
            // Validate parameters
            const params = invocation.parameters || {};
            for (const param of endpoint.parameters) {
                if (param.required && !(param.name in params)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: `Missing required parameter: ${param.name}` }));
                    return;
                }
            }
            
            try {
                // Execute the endpoint
                const result = await this.executeEndpoint(tool, endpoint, params);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
                
                this.emitEvent({
                    type: McpEventType.ToolInvoked,
                    toolId,
                    endpointId,
                    data: {
                        params,
                        result
                    }
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                res.writeHead(500);
                res.end(JSON.stringify({ error: errorMessage }));
                
                this.emitEvent({
                    type: McpEventType.ToolInvocationFailed,
                    toolId,
                    endpointId,
                    error: errorMessage
                });
            }
            
            return;
        }
        
        // Handle default route
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
    
    private async readRequestBody(req: http.IncomingMessage): Promise<Promise<unknown>> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            
            req.on('data', chunk => {
                chunks.push(Buffer.from(chunk));
            });
            
            req.on('end', () => {
                if (chunks.length === 0) {
                    resolve({});
                    return;
                }
                
                const body = Buffer.concat(chunks).toString('utf8');
                
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(new Error('Invalid JSON in request body'));
                }
            });
            
            req.on('error', reject);
        });
    }
    
    private async executeEndpoint(
        tool: McpToolDefinition,
        endpoint: McpEndpoint,
        params: Record<string, unknown>
    ): Promise<McpToolResponse> {
        // This is where you would implement custom logic for executing endpoints
        // For now, we'll just echo back the parameters
        return {
            result: {
                message: `Executed ${tool.name} - ${endpoint.name}`,
                params
            }
        };
    }
    
    public getAllTools(): McpToolDefinition[] {
        return Array.from(this.tools.values());
    }
    
    public getToolById(toolId: string): McpToolDefinition | undefined {
        return this.tools.get(toolId);
    }
    
    public getAllServers(): McpServerConfig[] {
        return Array.from(this.serverConfigs.values());
    }
    
    public getServerById(serverId: string): McpServerConfig | undefined {
        return this.serverConfigs.get(serverId);
    }
    
    public isServerRunning(serverId: string): boolean {
        return this.servers.has(serverId);
    }
    
    private emitEvent(event: McpEvent): void {
        this.eventEmitter.fire({
            ...event,
            timestamp: event.timestamp || Date.now()
        });
    }
    
    public dispose(): void {
        // Stop all running servers
        for (const [serverId, server] of this.servers.entries()) {
            server.close(error => {
                if (error) {
                    this.context.loggingService.error(`Error stopping server ${serverId}:`, error);
                }
            });
        }
        
        this.disposables.forEach(d => d.dispose());
        
        this.servers.clear();
        this.tools.clear();
        this.serverConfigs.clear();
    }
} 