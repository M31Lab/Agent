export interface CustomTool {
    id: string;
    name: string;
    description: string;
    version: string;
    author?: string;
    repository?: string;
    icon?: string;
    enabled: boolean;
    serverUrl: string;
    endpoints: CustomToolEndpoint[];
    auth?: CustomToolAuth;
    metadata?: Record<string, unknown>;
    createdAt: number;
    updatedAt: number;
}

export interface CustomToolEndpoint {
    id: string;
    name: string;
    description: string;
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    parameters?: CustomToolParameter[];
    responseSchema?: Record<string, unknown>;
    requiresAuth: boolean;
}

export interface CustomToolParameter {
    name: string;
    description: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    defaultValue?: unknown;
    options?: unknown[][];
}

export interface CustomToolAuth {
    type: 'apiKey' | 'bearer' | 'basic' | 'oauth';
    headerName?: string;
    keyName?: string;
}

export interface CustomToolInvocation {
    toolId: string;
    endpointId: string;
    parameters: Record<string, unknown>;
    timestamp: number;
}

export interface CustomToolResponse {
    status: number;
    data: unknown;
    error?: string;
    executionTime: number;
}

export interface ToolManifest {
    name: string;
    version: string;
    description: string;
    endpoints: {
        [key: string]: {
            description: string;
            parameters: Record<string, CustomToolParameter>;
            returnSchema: Record<string, unknown>;
        }
    };
} 