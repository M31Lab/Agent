import * as vscode from 'vscode';
import { IOpenRouterCompletionRequest } from './requests/completionRequest';
import { IOpenRouterCompletionResponse } from './responses/completionResponse';
import { IOpenRouterModelsResponse } from './responses/modelsResponse';
import { IOpenRouterStreamResponse } from './responses/streamResponse';

export interface IOpenRouterApiClient extends vscode.Disposable {
    initialize(): Promise<void>;
    getModels(): Promise<IOpenRouterModelsResponse>;
    createCompletion(request: IOpenRouterCompletionRequest): Promise<IOpenRouterCompletionResponse>;
    createStreamingCompletion(
        request: IOpenRouterCompletionRequest,
        onData: (data: IOpenRouterStreamResponse) => void,
        onError: (error: Error) => void,
        onComplete: () => void
    ): Promise<void>;
} 