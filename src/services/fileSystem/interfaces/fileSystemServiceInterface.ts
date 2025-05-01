import * as vscode from 'vscode';

export interface IFileSystemService {
    /**
     * Reads the content of a file
     */
    readFile(filePath: string): Promise<string>;

    /**
     * Writes content to a file
     */
    writeFile(filePath: string, content: string): Promise<void>;

    /**
     * Ensures a directory exists, creating it if necessary
     */
    ensureDirectoryExists(directoryPath: string): Promise<void>;

    /**
     * Checks if a path exists
     */
    exists(filePath: string): Promise<boolean>;

    /**
     * Checks if a path is a directory
     */
    isDirectory(filePath: string): Promise<boolean>;

    /**
     * Checks if a path is a file
     */
    isFile(filePath: string): Promise<boolean>;

    /**
     * Lists the contents of a directory
     */
    listDirectory(directoryPath: string): Promise<string[]>;

    /**
     * Gets the file structure of a directory up to a certain depth
     */
    getFileStructure(directoryPath: string, maxDepth?: number): Promise<{ [key: string]: any }>;

    /**
     * Gets all workspace folders
     */
    getWorkspaceFolders(): vscode.WorkspaceFolder[];

    /**
     * Gets the root path of the workspace
     */
    getWorkspaceRootPath(): string | undefined;

    /**
     * Resolves a path relative to the workspace root
     */
    resolveWorkspacePath(relativePath: string): string | undefined;

    /**
     * Finds files in the workspace matching a glob pattern
     */
    findFilesInWorkspace(globPattern: string, excludePattern?: string): Promise<vscode.Uri[]>;
} 