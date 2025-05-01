import * as vscode from 'vscode';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { OpenRouterChatResponse } from '../../models/ai/openRouterTypes';
import { ChatMessage } from '../../models/ai/chatTypes';
import { useLogging } from '../useLogging';
import { ApiError } from '../../models/responses/apiError';

export interface UseAiCompletionOptions {
    modelId?: string;
    temperature?: number;
    maxTokens?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
}

export interface UseAiCompletionResult {
    completion: string | null;
    error: Error | null;
    isLoading: boolean;
    usedModel: string | null;
    tokensUsed: number | null;
    complete: (messages: ChatMessage[], options?: UseAiCompletionOptions) => Promise<string>;
    completeWithStream: (
        messages: ChatMessage[],
        onToken: (token: string) => void,
        options?: UseAiCompletionOptions
    ) => Promise<string>;
    reset: () => void;
}

export function useAiCompletion(
    apiClient: OpenRouterApiClient,
    defaultOptions?: UseAiCompletionOptions
): UseAiCompletionResult {
    const logging = useLogging();
    let completion: string | null = null;
    let error: Error | null = null;
    let isLoading = false;
    let usedModel: string | null = null;
    let tokensUsed: number | null = null;

    function reset(): void {
        completion = null;
        error = null;
        isLoading = false;
        usedModel = null;
        tokensUsed = null;
    }

    async function complete(
        messages: ChatMessage[],
        options?: UseAiCompletionOptions
    ): Promise<string> {
        isLoading = true;
        error = null;
        completion = null;

        try {
            logging.info('Starting AI completion', { messageCount: messages.length });
            const mergedOptions = { ...defaultOptions, ...options };

            const response = await apiClient.generateChatCompletion(messages, {
                modelId: mergedOptions.modelId,
                temperature: mergedOptions.temperature,
                maxTokens: mergedOptions.maxTokens,
                frequencyPenalty: mergedOptions.frequencyPenalty,
                presencePenalty: mergedOptions.presencePenalty,
                stopSequences: mergedOptions.stopSequences
            });

            const completionText = response.choices[0]?.message?.content || '';
            completion = completionText;
            usedModel = response.model;
            tokensUsed = response.usage?.total_tokens || 0;
            
            logging.info('AI completion finished', { 
                model: response.model,
                tokensUsed: response.usage?.total_tokens?.toString() 
            });
            
            return completionText;
        } catch (err) {
            const apiError = err instanceof ApiError 
                ? err 
                : new ApiError(500, String(err), 'unknown', err);
            
            error = apiError;
            logging.error('AI completion error', apiError);
            throw apiError;
        } finally {
            isLoading = false;
        }
    }

    async function completeWithStream(
        messages: ChatMessage[],
        onToken: (token: string) => void,
        options?: UseAiCompletionOptions
    ): Promise<string> {
        isLoading = true;
        error = null;
        completion = null;

        let fullCompletion = '';

        try {
            logging.info('Starting streaming AI completion', { messageCount: messages.length });
            const mergedOptions = { ...defaultOptions, ...options };

            const response = await apiClient.generateChatCompletion(messages, {
                modelId: mergedOptions.modelId,
                temperature: mergedOptions.temperature,
                maxTokens: mergedOptions.maxTokens,
                frequencyPenalty: mergedOptions.frequencyPenalty,
                presencePenalty: mergedOptions.presencePenalty,
                stopSequences: mergedOptions.stopSequences,
                stream: true,
                streamCallbacks: {
                    onToken: (token: string) => {
                        fullCompletion += token;
                        completion = fullCompletion;
                        onToken(token);
                    },
                    onComplete: (response: OpenRouterChatResponse) => {
                        usedModel = response.model;
                        tokensUsed = response.usage?.total_tokens || 0;
                        logging.info('Streaming AI completion finished', { 
                            model: response.model,
                            tokensUsed: response.usage?.total_tokens?.toString() 
                        });
                    },
                    onError: (error: ApiError) => {
                        error = error;
                        logging.error('Streaming AI completion error', error);
                    }
                }
            });

            return fullCompletion;
        } catch (err) {
            const apiError = err instanceof ApiError 
                ? err 
                : new ApiError(500, String(err), 'unknown', err);
            
            error = apiError;
            logging.error('Streaming AI completion error', apiError);
            throw apiError;
        } finally {
            isLoading = false;
        }
    }

    return {
        completion,
        error,
        isLoading,
        usedModel,
        tokensUsed,
        complete,
        completeWithStream,
        reset
    };
} 