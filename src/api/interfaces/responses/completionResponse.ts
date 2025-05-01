export interface IOpenRouterFunctionCall {
    name: string;
    arguments: string;
}

export interface IOpenRouterToolCall {
    id: string;
    type: string;
    function: IOpenRouterFunctionCall;
}

export interface IOpenRouterChoice {
    index: number;
    message: {
        role: string;
        content: string | null;
        tool_calls?: IOpenRouterToolCall[];
    };
    finish_reason: string;
}

export interface IOpenRouterUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface IOpenRouterCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: IOpenRouterChoice[];
    usage: IOpenRouterUsage;
} 