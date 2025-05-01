export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly type: string;
    public readonly rawError: any;

    constructor(statusCode: number, message: string, type: string = 'unknown', rawError: any = null) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.type = type;
        this.rawError = rawError;
        
        Object.setPrototypeOf(this, ApiError.prototype);
    }

    public isAuthenticationError(): boolean {
        return this.statusCode === 401 || this.statusCode === 403;
    }

    public isNetworkError(): boolean {
        return this.statusCode === 0 || this.type === 'network_error';
    }

    public isRateLimitError(): boolean {
        return this.statusCode === 429 || this.type === 'rate_limit_error';
    }

    public isTimeoutError(): boolean {
        return this.type === 'timeout_error';
    }

    public isServerError(): boolean {
        return this.statusCode >= 500 && this.statusCode < 600;
    }

    public getUserFriendlyMessage(): string {
        if (this.isAuthenticationError()) {
            return 'Authentication failed. Please check your API key in the settings.';
        }

        if (this.isNetworkError()) {
            return 'Network error. Please check your internet connection.';
        }

        if (this.isRateLimitError()) {
            return 'Rate limit exceeded. Please try again later.';
        }

        if (this.isTimeoutError()) {
            return 'Request timed out. Please try again later.';
        }

        if (this.isServerError()) {
            return 'Server error. Please try again later.';
        }

        return this.message || 'An unknown error occurred';
    }

    public toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            type: this.type
        };
    }
} 