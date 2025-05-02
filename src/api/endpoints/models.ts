import { AxiosInstance } from 'axios';
import { IOpenRouterModelsResponse } from '../interfaces/responses/modelsResponse';

export async function getModels(client: AxiosInstance): Promise<IOpenRouterModelsResponse> {
    const response = await client.get<IOpenRouterModelsResponse>('/models');
    return response.data;
}
