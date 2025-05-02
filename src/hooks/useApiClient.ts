import {
  AIRequestOptions,
  AIResponse,
  OpenRouterApiClient,
} from '../api/client/openRouterApiClient';
import { IOpenRouterCompletionRequest } from '../api/interfaces/requests/completionRequest';
import { AuthenticationService } from '../services/authentication/authenticationService';
import { ConfigurationService } from '../services/configuration/configurationService';
// { _ExtensionContext } from '../models/context/extensionContext';

export interface ApiClientHook {
  getApiClient: () => OpenRouterApiClient | undefined;
  sendRequest: (options: AIRequestOptions) => Promise<AIResponse>;
  sendStreamingRequest: (
    options: AIRequestOptions,
    onChunk: (chunk: string) => void,
    onComplete: (response: AIResponse) => void,
    onError: (error: Error) => void
  ) => Promise<void>;
  sendCompletionRequest: (request: IOpenRouterCompletionRequest) => Promise<unknown>;
  getModels: () => Promise<unknown>;
  checkApiKey: () => Promise<boolean>;
  setApiKey: (apiKey: string) => Promise<void>;
  getModelId: () => string;
}

export function useApiClient(): ApiClientHook {
  const getApiClient = (): OpenRouterApiClient | undefined => {
    return OpenRouterApiClient.getInstance();
  };

  const sendRequest = async (options: AIRequestOptions): Promise<AIResponse> => {
    const apiClient = getApiClient();
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    return apiClient.sendRequest(options);
  };

  const sendStreamingRequest = async (
    options: AIRequestOptions,
    onChunk: (chunk: string) => void,
    onComplete: (response: AIResponse) => void,
    onError: (error: Error) => void
  ): Promise<void> => {
    const apiClient = getApiClient();
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    await apiClient.streamRequest(options, onChunk, onComplete, onError);
  };

  const sendCompletionRequest = async (request: IOpenRouterCompletionRequest): Promise<unknown> => {
    const apiClient = getApiClient();
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    return apiClient.createCompletion(request);
  };

  const getModels = async (): Promise<unknown> => {
    const apiClient = getApiClient();
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    return apiClient.getModels();
  };

  const checkApiKey = async (): Promise<boolean> => {
    const authService = AuthenticationService.getInstance();
    if (!authService) {
      return false;
    }

    return authService.isAuthenticated();
  };

  const setApiKey = async (apiKey: string): Promise<void> => {
    const authService = AuthenticationService.getInstance();
    if (!authService) {
      throw new Error('Authentication service not initialized');
    }

    await authService.setApiKey(apiKey);
  };

  const getModelId = (): string => {
    const configService = ConfigurationService.getInstance();
    if (!configService) {
      return 'openai/gpt-4o';
    }

    return configService.getModelId();
  };

  return {
    getApiClient,
    sendRequest,
    sendStreamingRequest,
    sendCompletionRequest,
    getModels,
    checkApiKey,
    setApiKey,
    getModelId,
  };
}
