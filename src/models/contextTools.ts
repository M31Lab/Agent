export enum ContextToolType {
  Url = 'url',
  Problems = 'problems',
  File = 'file',
  Folder = 'folder',
  Custom = 'custom',
}

export interface ContextTool {
  type: ContextToolType;
  name: string;
  description: string;
  command: string;
  icon: string;
  requiresInput: boolean;
  requiresConfirmation: boolean;
}

export interface ContextToolResult {
  content: string;
  metadata: {
    source: string;
    timestamp: number;
    type: ContextToolType;
  };
}

export interface UrlToolOptions {
  url: string;
  maxTokens?: number;
  includeImages?: boolean;
}

export interface FileToolOptions {
  filePath: string;
}

export interface FolderToolOptions {
  folderPath: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFiles?: number;
  maxTokensPerFile?: number;
}

export interface ProblemsToolOptions {
  severity: 'all' | 'error' | 'warning' | 'info';
  maxProblems?: number;
}

export type ContextToolEventType = 'toolExecuted' | 'toolFailed';

export interface ContextToolEvent {
  type: ContextToolEventType;
  toolType: ContextToolType;
  content?: string;
  error?: string;
  timestamp: number;
}
