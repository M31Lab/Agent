export interface IOpenRouterMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    name?: string;
}

export interface IOpenRouterTool {
    type: string;
    function: {
        name: string;
        description?: string;
        parameters: Record<string, any>;
    };
}

export interface IOpenRouterCompletionRequest {
    model: string;
    messages: IOpenRouterMessage[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stop?: string | string[];
    stream?: boolean;
    tools?: IOpenRouterTool[];
    tool_choice?: 'auto' | 'none' | {
        type: string;
        function: {
            name: string;
        };
    };
} 