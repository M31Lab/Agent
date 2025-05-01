export interface IOpenRouterErrorDetail {
    code: string;
    message: string;
    param?: string;
    type: string;
}

export interface IOpenRouterError {
    error: IOpenRouterErrorDetail;
} 