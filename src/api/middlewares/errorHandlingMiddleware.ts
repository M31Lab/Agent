import { AxiosError } from 'axios';

interface ErrorResponse {
    error?: {
        code?: string;
        message?: string;
    };
}

export function errorHandlingMiddleware(error: AxiosError): Promise<never> {
    const errorCode = (error.response?.data as ErrorResponse)?.error?.code || error.code || 'unknown';
    const errorMessage = (error.response?.data as ErrorResponse)?.error?.message || error.message || 'Unknown error';

    // You can add logging or telemetry here if needed

    return Promise.reject(new Error(`${errorCode} - ${errorMessage}`));
}
