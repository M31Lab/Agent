export interface IOpenRouterModelContextWindow {
    input_tokens: number;
    output_tokens: number;
}

export interface IOpenRouterModelPricing {
    prompt: number;
    completion: number;
}

export interface IOpenRouterModel {
    id: string;
    name: string;
    description?: string;
    context_length: number;
    context_window?: IOpenRouterModelContextWindow;
    pricing?: IOpenRouterModelPricing;
    architecture?: string;
    provider: string;
}

export interface IOpenRouterModelsResponse {
    data: IOpenRouterModel[];
} 