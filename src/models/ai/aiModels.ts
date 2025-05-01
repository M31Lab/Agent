export enum AIProvider {
    OpenAI = 'openai',
    Anthropic = 'anthropic',
    Google = 'google',
    Meta = 'meta',
    Other = 'other'
}

export interface AIModelFeatures {
    chat: boolean;
    codeGeneration: boolean;
    embeddings: boolean;
}

export interface AIModel {
    id: string;
    name: string;
    provider: AIProvider;
    contextWindow: number;
    maxTokens: number;
    inputPricePerToken: number;
    outputPricePerToken: number;
    features: AIModelFeatures;
}

export interface ModelSettings {
    modelId: string;
    temperature: number;
    maxTokens: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    topP?: number;
}

export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    description: string;
    contextSize: number;
    isRecommended: boolean;
    capabilities: string[];
} 