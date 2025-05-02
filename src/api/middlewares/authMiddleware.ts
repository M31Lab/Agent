import { AxiosRequestConfig } from 'axios';

export function authMiddleware(apiKey: string) {
    return (config: AxiosRequestConfig): AxiosRequestConfig => {
        if (!apiKey) {
            throw new Error('API key is not configured');
        }
        config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/m31-ai/m31-agent-vscode',
            'X-Title': 'M31-Agent VS Code Extension'
        };
        return config;
    };
}
