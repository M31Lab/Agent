import { v4 as uuidv4 } from 'uuid';

export enum McpEventType {
    ToolCreated = 'toolCreated',
    ToolDeleted = 'toolDeleted',
    ToolUpdated = 'toolUpdated',
    EndpointAdded = 'endpointAdded',
    EndpointRemoved = 'endpointRemoved',
    ServerCreated = 'serverCreated',
    ServerStarted = 'serverStarted',
    ServerStopped = 'serverStopped',
    ToolInvoked = 'toolInvoked',
    ToolInvocationFailed = 'toolInvocationFailed',
    Error = 'error'
}

export interface McpParameter {
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    defaultValue?: unknown;
    schema?: Record<string, unknown>;
}

export interface McpEndpoint {
    id: string;
    name: string;
    description: string;
    parameters: McpParameter[];
    returnSchema?: Record<string, unknown>;
}

export interface McpToolDefinition {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    endpoints: McpEndpoint[];
    createdAt: number;
    updatedAt: number;
}

export interface McpServerConfig {
    id: string;
    name: string;
    description: string;
    type: 'local' | 'remote';
    port: number;
    url?: string;
    autoStart: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface McpToolInvocation {
    toolId: string;
    endpointId: string;
    parameters: Record<string, unknown>;
    timestamp: number;
}

export interface McpToolResponse {
    result?: unknown;
    error?: string;
}

/**
 * Creates a new MCP tool definition with the provided details
 */
export function createNewMcpToolDefinition(
    name: string,
    description: string,
    author: string,
    endpoints: McpEndpoint[] = []
): McpToolDefinition {
    const timestamp = Date.now();

    return {
        id: uuidv4(),
        name,
        description,
        version: '1.0.0',
        author,
        endpoints,
        createdAt: timestamp,
        updatedAt: timestamp
    };
}

/**
 * Creates a new MCP endpoint with the provided details
 */
export function createNewMcpEndpoint(
    name: string,
    description: string, 
    parameters: McpParameter[] = []
): McpEndpoint {
    return {
        id: uuidv4(),
        name,
        description,
        parameters,
        returnSchema: {
            type: 'object',
            properties: {
                result: {
                    type: 'object',
                    description: 'The result of the endpoint execution'
                }
            }
        }
    };
}

/**
 * Creates a new MCP parameter with the provided details
 */
export function createNewMcpParameter(
    name: string,
    description: string,
    type: 'string' | 'number' | 'boolean' | 'object' | 'array',
    required: boolean = false,
    defaultValue?: unknown,
    schema?: Record<string, unknown>
): McpParameter {
    return {
        name,
        description,
        type,
        required,
        defaultValue,
        schema
    };
} 