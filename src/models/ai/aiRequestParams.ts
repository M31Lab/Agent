import { AIRequestType } from './aiRequestType';

// Define our own ChatCompletionTool interface instead of importing from openai
export interface ChatCompletionTool {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters?: Record<string, unknown>;
    };
}

export interface AIMessage {
    role: 'user' | 'assistant' | 'system' | 'function';
    content: string;
    name?: string;
    functionCall?: unknown;
}

export interface AIRequestParams {
    requestType: AIRequestType;
    prompt?: string;
    messages?: AIMessage[];
    tools?: ChatCompletionTool[];
    toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
    modelOverride?: string;
    maxTokensOverride?: number;
    temperatureOverride?: number;
}