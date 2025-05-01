import { AIRequestType } from './aiRequestType';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources';

export interface AIMessage {
    role: 'user' | 'assistant' | 'system' | 'function';
    content: string;
    name?: string;
    functionCall?: any;
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