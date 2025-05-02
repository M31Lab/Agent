import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentConfig } from '../interfaces/configurationInterfaces';

export enum Environment {
  Production = 'production',
  Development = 'development',
  Test = 'test',
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
  const packageInfo = getPackageInfo();

  return {
    isProduction: environment === Environment.Production,
    isDevelopment: environment === Environment.Development,
    isTest: environment === Environment.Test,
    version: packageInfo.version || '0.0.0',
    name: packageInfo.name || 'm31-agent',
    buildDate: new Date(),
  };
}

function getPackageInfo(): { name: string; version: string } {
  try {
    // Find package.json by resolving from current file path
    const packagePath = path.resolve(__dirname, '../../../../package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    return JSON.parse(packageContent);
  } catch (error) {
    return { name: 'm31-agent', version: '0.0.0' };
  }
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
