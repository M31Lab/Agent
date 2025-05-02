import * as vscode from 'vscode';
import { OpenRouterApiClient } from './client/openRouterApiClient';

export interface ApiClient extends vscode.Disposable {
    getApiCallsSinceLastCheck(): number;
    getTokenUsageSinceLastCheck(): number;
    getTotalApiCalls(): number;
    getTotalTokenUsage(): number;
    getApiCallHistory(): number[];
    getTokenUsageHistory(): number[];
}

// Re-export the implementation for convenience
export { OpenRouterApiClient }; 