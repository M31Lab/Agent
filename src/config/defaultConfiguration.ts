import { AIModel, AIProvider } from '../models/ai/aiModels';

export const DEFAULT_MODEL_ID = 'openai/gpt-4o';
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 1024;
export const DEFAULT_TELEMETRY_ENABLED = true;
export const DEFAULT_REQUIRE_CONFIRMATION = true;
export const DEFAULT_API_ENDPOINT = 'https://openrouter.ai/api/v1';
export const DEFAULT_LOG_LEVEL = 'info';
export const DEFAULT_SHOW_WELCOME = true;

export const DEFAULT_AVAILABLE_MODELS: AIModel[] = [
    {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: AIProvider.OpenAI,
        contextWindow: 128000,
        maxTokens: 4096,
        inputPricePerToken: 0.00005,
        outputPricePerToken: 0.00015,
        features: {
            chat: true,
            codeGeneration: true,
            embeddings: false
        }
    },
    {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: AIProvider.OpenAI,
        contextWindow: 128000,
        maxTokens: 4096,
        inputPricePerToken: 0.00005,
        outputPricePerToken: 0.00015,
        features: {
            chat: true,
            codeGeneration: true,
            embeddings: false
        }
    },
    {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: AIProvider.OpenAI,
        contextWindow: 16385,
        maxTokens: 4096,
        inputPricePerToken: 0.000002,
        outputPricePerToken: 0.000006,
        features: {
            chat: true,
            codeGeneration: true,
            embeddings: false
        }
    },
    {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: AIProvider.Anthropic,
        contextWindow: 200000,
        maxTokens: 4096,
        inputPricePerToken: 0.00005,
        outputPricePerToken: 0.00015,
        features: {
            chat: true,
            codeGeneration: true,
            embeddings: false
        }
    },
    {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: AIProvider.Anthropic,
        contextWindow: 180000,
        maxTokens: 4096,
        inputPricePerToken: 0.000015,
        outputPricePerToken: 0.000045,
        features: {
            chat: true,
            codeGeneration: true,
            embeddings: false
        }
    },
    {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: AIProvider.Anthropic,
        contextWindow: 150000,
        maxTokens: 4096,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000015,
        features: {
            chat: true,
            codeGeneration: true,
            embeddings: false
        }
    },
    {
        id: 'google/gemini-pro',
        name: 'Gemini Pro',
        provider: AIProvider.Google,
        contextWindow: 32768,
        maxTokens: 2048,
        inputPricePerToken: 0.000003,
        outputPricePerToken: 0.000006,
        features: {
            chat: true,
            codeGeneration: true,
            embeddings: false
        }
    }
]; 