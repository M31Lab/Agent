import { AxiosInstance } from 'axios';
import { IOpenRouterCompletionRequest } from '../interfaces/requests/completionRequest';
import { IOpenRouterCompletionResponse } from '../interfaces/responses/completionResponse';

export async function createCompletion(
    client: AxiosInstance,
    request: IOpenRouterCompletionRequest
): Promise<IOpenRouterCompletionResponse> {
    const response = await client.post<IOpenRouterCompletionResponse>('/chat/completions', request);
    return response.data;
}
