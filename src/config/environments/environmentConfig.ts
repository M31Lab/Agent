import { EnvironmentConfig } from '../interfaces/configurationInterfaces';

export enum Environment {
    Production = 'production',
    Development = 'development',
    Test = 'test'
}

export function getCurrentEnvironment(): Environment {
    const env = process.env.NODE_ENV?.toLowerCase() || 'development';
    
    if (env === 'production') {
        return Environment.Production;
    } else if (env === 'test') {
        return Environment.Test;
    } else {
        return Environment.Development;
    }
}

export function getEnvironmentConfig(): EnvironmentConfig {
    const environment = getCurrentEnvironment();
    const packageJson = require('../../../../package.json');
    
    return {
        isProduction: environment === Environment.Production,
        isDevelopment: environment === Environment.Development,
        isTest: environment === Environment.Test,
        version: packageJson.version || '0.0.0',
        name: packageJson.name || 'm31-agent',
        buildDate: new Date()
    };
}

export function isProduction(): boolean {
    return getCurrentEnvironment() === Environment.Production;
}

export function isDevelopment(): boolean {
    return getCurrentEnvironment() === Environment.Development;
}

export function isTest(): boolean {
    return getCurrentEnvironment() === Environment.Test;
} 