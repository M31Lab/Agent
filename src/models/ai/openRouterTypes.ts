export interface OpenRouterModelResponseData {
    id: string;
    name?: string;
    created?: number;
    object?: string;
    owned_by?: string;
    permission?: any[];
    pricing?: {
        prompt: number;
        completion: number;
        input?: number;
        output?: number;
    };
    context_length?: number;
    capabilities?: string[];
}

export interface OpenRouterModelsResponse {
    object: string;
    data: OpenRouterModelResponseData[];
}

export interface OpenRouterMessage {
    role: string;
    content: string;
    name?: string;
}

export interface OpenRouterChatRequest {
    model: string;
    messages: OpenRouterMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string[];
    stream?: boolean;
    route?: string;
    request_id?: string;
    transforms?: string[];
}

export interface OpenRouterChatResponseChoice {
    index: number;
    message: {
        role: string;
        content: string;
    };
    delta?: {
        role?: string;
        content?: string;
    };
    finish_reason: string | null;
}

export interface OpenRouterChatUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface OpenRouterChatResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: OpenRouterChatResponseChoice[];
    usage: OpenRouterChatUsage;
    system_fingerprint?: string;
    provider?: {
        id: string;
        name: string;
    };
} 