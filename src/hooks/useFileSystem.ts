import * as vscode from 'vscode';
import { FileSystemService } from '../services/fileSystem/fileSystemService';

// Define an interface for the return type of useFileSystem
export interface FileSystemHook {
    getFileSystemService: () => FileSystemService | undefined;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<void>;
    listDirectory: (directoryPath: string) => Promise<string[]>;
    exists: (path: string) => Promise<boolean>;
    isDirectory: (path: string) => Promise<boolean>;
    isFile: (path: string) => Promise<boolean>;
    getWorkspaceRootPath: () => string | undefined;
    findFilesInWorkspace: (globPattern: string, excludePattern?: string) => Promise<vscode.Uri[]>;
    resolveWorkspacePath: (relativePath: string) => string | undefined;
}

export function useFileSystem(): FileSystemHook {
    const getFileSystemService = (): FileSystemService | undefined => {
        return FileSystemService.getInstance();
    };

    const readFile = async (filePath: string): Promise<string> => {
        const fileSystem = getFileSystemService();
        if (!fileSystem) {
            throw new Error('File system service not initialized');
        }

        return fileSystem.readFile(filePath);
    };

    const writeFile = async (filePath: string, content: string): Promise<void> => {
        const fileSystem = getFileSystemService();
        if (!fileSystem) {
            throw new Error('File system service not initialized');
        }

        return fileSystem.writeFile(filePath, content);
    };

    const listDirectory = async (directoryPath: string): Promise<string[]> => {
        const fileSystem = getFileSystemService();
        if (!fileSystem) {
            throw new Error('File system service not initialized');
        }

        return fileSystem.listDirectory(directoryPath);
    };

    const exists = async (path: string): Promise<boolean> => {
        const fileSystem = getFileSystemService();
        if (!fileSystem) {
            throw new Error('File system service not initialized');
        }

        return fileSystem.exists(path);
    };

    const isDirectory = async (path: string): Promise<boolean> => {
        const fileSystem = getFileSystemService();
        if (!fileSystem) {
            throw new Error('File system service not initialized');
        }

        return fileSystem.isDirectory(path);
    };

    const isFile = async (path: string): Promise<boolean> => {
        const fileSystem = getFileSystemService();
        if (!fileSystem) {
            throw new Error('File system service not initialized');
        }

        return fileSystem.isFile(path);
    };

    const getWorkspaceRootPath = (): string | undefined => {
        const fileSystem = getFileSystemService();
        if (!fileSystem) {
            return undefined;
        }

        return fileSystem.getWorkspaceRootPath();
    };

    const findFilesInWorkspace = async (
        globPattern: string,
        excludePattern?: string
    ): Promise<vscode.Uri[]> => {
        const fileSystem = getFileSystemService();
        if (!fileSystem) {
            return [];
        }

        return fileSystem.findFilesInWorkspace(globPattern, excludePattern);
    };

    const resolveWorkspacePath = (relativePath: string): string | undefined => {
        const fileSystem = getFileSystemService();
        if (!fileSystem) {
            return undefined;
        }

        return fileSystem.resolveWorkspacePath(relativePath);
    };

    return {
        getFileSystemService,
        readFile,
        writeFile,
        listDirectory,
        exists,
        isDirectory,
        isFile,
        getWorkspaceRootPath,
        findFilesInWorkspace,
        resolveWorkspacePath
    };
} 