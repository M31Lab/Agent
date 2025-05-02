export interface IOpenRouterStreamDelta {
    role?: string;
    content?: string;
    tool_calls?: {
        index: number;
        id?: string;
        type?: string;
        function?: {
            name?: string;
            arguments?: string;
        };
    }[];
}

export interface IOpenRouterStreamChoice {
    index: number;
    delta: IOpenRouterStreamDelta;
    finish_reason: string | null;
}

export interface IOpenRouterStreamResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: IOpenRouterStreamChoice[];
} 