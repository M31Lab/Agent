import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { ApiConfiguration } from './configurationInterfaces';

export interface Environment {
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
    platform: string;
    homeDir: string;
    extensionStoragePath: string;
    extensionGlobalStoragePath: string;
    logFilePath: string;
}

export function getEnvironment(context: vscode.ExtensionContext): Environment {
    const extensionMode = context.extensionMode;
    
    const isProduction = extensionMode === vscode.ExtensionMode.Production;
    const isDevelopment = extensionMode === vscode.ExtensionMode.Development;
    const isTest = extensionMode === vscode.ExtensionMode.Test;
    
    const platform = os.platform();
    const homeDir = os.homedir();
    
    const extensionStoragePath = context.storageUri?.fsPath || path.join(homeDir, '.m31-agent');
    const extensionGlobalStoragePath = context.globalStorageUri.fsPath;
    const logFilePath = path.join(extensionGlobalStoragePath, 'logs', 'extension.log');
    
    return {
        isProduction,
        isDevelopment,
        isTest,
        platform,
        homeDir,
        extensionStoragePath,
        extensionGlobalStoragePath,
        logFilePath
    };
}

export function getApiConfigFromEnvironment(): Partial<ApiConfiguration> {
    const apiKey = process.env.M31_AGENT_API_KEY || null;
    const endpoint = process.env.M31_AGENT_API_ENDPOINT || 'https://openrouter.ai/api/v1';
    
    return {
        apiKey,
        endpoint
    };
}

export function getExtensionVersion(): string {
    try {
        // This assumes we're in a bundled context where the extension manifest is available
        const packageJson = require('../../package.json');
        return packageJson.version || '0.0.0';
    } catch (error) {
        return '0.0.0';
    }
} 