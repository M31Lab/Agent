import { AuthStatus } from '../../../models/authentication/authStatus';

export interface IAuthenticationService {
    initialize(): Promise<void>;
    getAuthStatus(): AuthStatus;
    isAuthenticated(): boolean;
    authenticate(apiKey: string): Promise<boolean>;
    getApiKey(): string;
    logout(): Promise<void>;
    promptForAuthentication(): Promise<boolean>;
} 