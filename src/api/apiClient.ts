import * as vscode from 'vscode';
import { OpenRouterApiClient, AIRequestOptions, AIResponse } from './client/openRouterApiClient';

export interface ApiClient extends vscode.Disposable {
    getApiCallsSinceLastCheck(): number;
    getTokenUsageSinceLastCheck(): number;
    getTotalApiCalls(): number;
    getTotalTokenUsage(): number;
    getApiCallHistory(): number[];
    getTokenUsageHistory(): number[];
    sendRequest(options: AIRequestOptions): Promise<AIResponse>;
}

// Re-export the implementation for convenience
export { OpenRouterApiClient }; 