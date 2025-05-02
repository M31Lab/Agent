import { ChatCompletionMessageToolCall } from 'openai/resources';

export interface AIResponse {
    content: string;
    id: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    durationMs: number;
    finishReason: string;
    toolCalls?: ChatCompletionMessageToolCall[];
} 