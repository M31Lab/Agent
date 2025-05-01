import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { ConfigurationService } from '../../services/configuration/configurationService';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../../services/telemetry/telemetryService';
import { AuthenticationService } from '../../services/authentication/authenticationService';

export interface UseExtensionContextOptions {
    showErrors?: boolean;
}

export interface UseExtensionContextResult {
    context: ExtensionContext | undefined;
    vscodeContext: vscode.ExtensionContext | undefined;
    configService: ConfigurationService | undefined;
    loggingService: LoggingService | undefined;
    telemetryService: TelemetryService | undefined;
    authService: AuthenticationService | undefined;
    extensionPath: string | undefined;
    globalStoragePath: string | undefined;
    logPath: string | undefined;
    subscriptions: vscode.Disposable[] | undefined;
    isInitialized: boolean;
}

export function useExtensionContext(
    options: UseExtensionContextOptions = { showErrors: true }
): UseExtensionContextResult {
    let context: ExtensionContext | undefined;
    let vscodeContext: vscode.ExtensionContext | undefined;
    let configService: ConfigurationService | undefined;
    let loggingService: LoggingService | undefined;
    let telemetryService: TelemetryService | undefined;
    let authService: AuthenticationService | undefined;
    let extensionPath: string | undefined;
    let globalStoragePath: string | undefined;
    let logPath: string | undefined;
    let subscriptions: vscode.Disposable[] | undefined;
    let isInitialized = false;

    try {
        // Try to get the extension context from global state
        const extension = vscode.extensions.getExtension('m31-ai.m31-agent');
        if (extension?.isActive) {
            context = extension.exports.context;
            
            if (context) {
                vscodeContext = context.vscodeContext;
                configService = context.configurationService;
                loggingService = context.loggingService;
                telemetryService = context.telemetryService;
                authService = context.authenticationService;
                extensionPath = context.extensionPath;
                globalStoragePath = vscodeContext?.globalStoragePath;
                logPath = context.logPath;
                subscriptions = context.subscriptions;
                isInitialized = true;
            }
        }
    } catch (error) {
        if (options.showErrors) {
            console.error('Failed to access extension context', error);
        }
    }

    return {
        context,
        vscodeContext,
        configService,
        loggingService,
        telemetryService,
        authService,
        extensionPath,
        globalStoragePath,
        logPath,
        subscriptions,
        isInitialized
    };
}

let globalExtensionContext: ExtensionContext | undefined;

export function initializeExtensionContext(context: ExtensionContext): void {
    globalExtensionContext = context;
}

export function useGlobalState<T>(key: string, defaultValue?: T): {
    value: T | undefined;
    setValue: (value: T) => Thenable<void>;
    clearValue: () => Thenable<void>;
} {
    const context = useExtensionContext();
    
    if (!context || !context.vscodeContext) {
        throw new Error('Extension context is not properly initialized');
    }
    
    const extensionContext = context.vscodeContext;
    const logging = context.loggingService;

    const value = extensionContext.globalState.get<T>(key) ?? defaultValue;

    const setValue = (newValue: T): Thenable<void> => {
        if (logging) {
            logging.debug(`Setting global state: ${key}`);
        }
        return extensionContext.globalState.update(key, newValue);
    };

    const clearValue = (): Thenable<void> => {
        if (logging) {
            logging.debug(`Clearing global state: ${key}`);
        }
        return extensionContext.globalState.update(key, undefined);
    };

    return {
        value,
        setValue,
        clearValue
    };
}

export function useWorkspaceState<T>(key: string, defaultValue?: T): {
    value: T | undefined;
    setValue: (value: T) => Thenable<void>;
    clearValue: () => Thenable<void>;
} {
    const context = useExtensionContext();
    
    if (!context || !context.vscodeContext) {
        throw new Error('Extension context is not properly initialized');
    }
    
    const extensionContext = context.vscodeContext;
    const logging = context.loggingService;

    const value = extensionContext.workspaceState.get<T>(key) ?? defaultValue;

    const setValue = (newValue: T): Thenable<void> => {
        if (logging) {
            logging.debug(`Setting workspace state: ${key}`);
        }
        return extensionContext.workspaceState.update(key, newValue);
    };

    const clearValue = (): Thenable<void> => {
        if (logging) {
            logging.debug(`Clearing workspace state: ${key}`);
        }
        return extensionContext.workspaceState.update(key, undefined);
    };

    return {
        value,
        setValue,
        clearValue
    };
}

export function useExtensionPath(relativePath: string): string {
    const context = useExtensionContext();
    
    if (!context || !context.vscodeContext) {
        throw new Error('Extension context is not properly initialized');
    }
    
    const extensionPath = context.vscodeContext.extensionPath;
    return vscode.Uri.joinPath(vscode.Uri.file(extensionPath), relativePath).fsPath;
}

export function useSecretStorage(): {
    getSecret: (key: string) => Thenable<string | undefined>;
    storeSecret: (key: string, value: string) => Thenable<void>;
    deleteSecret: (key: string) => Thenable<void>;
} {
    const context = useExtensionContext();
    
    if (!context || !context.vscodeContext) {
        throw new Error('Extension context is not properly initialized');
    }
    
    const secretStorage = context.vscodeContext.secrets;
    const logging = context.loggingService;

    const getSecret = (key: string): Thenable<string | undefined> => {
        return secretStorage.get(key);
    };

    const storeSecret = (key: string, value: string): Thenable<void> => {
        if (logging) {
            logging.debug(`Storing secret: ${key}`);
        }
        return secretStorage.store(key, value);
    };

    const deleteSecret = (key: string): Thenable<void> => {
        if (logging) {
            logging.debug(`Deleting secret: ${key}`);
        }
        return secretStorage.delete(key);
    };

    return {
        getSecret,
        storeSecret,
        deleteSecret
    };
} 