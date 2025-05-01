import { AxiosError } from 'axios';

export function errorHandlingMiddleware(error: AxiosError): Promise<never> {
    const errorCode = (error.response?.data as any)?.error?.code || error.code || 'unknown';
    const errorMessage = (error.response?.data as any)?.error?.message || error.message || 'Unknown error';

    // You can add logging or telemetry here if needed

    return Promise.reject(new Error(`${errorCode} - ${errorMessage}`));
}
