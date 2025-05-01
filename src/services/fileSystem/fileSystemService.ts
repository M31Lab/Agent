import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);
const existsAsync = promisify(fs.exists);

export class FileSystemService implements vscode.Disposable {
    private static instance: FileSystemService | undefined;
    private loggingService: LoggingService;
    private disposables: vscode.Disposable[] = [];

    constructor(private context: ExtensionContext) {
        this.loggingService = context.loggingService;
        FileSystemService.instance = this;
    }

    public static getInstance(): FileSystemService | undefined {
        return FileSystemService.instance;
    }

    public async readFile(filePath: string): Promise<string> {
        try {
            this.loggingService.debug(`Reading file: ${filePath}`);
            const content = await readFileAsync(filePath, 'utf8');
            return content;
        } catch (error) {
            this.loggingService.error(`Error reading file: ${filePath}`, error);
            throw new Error(`Failed to read file: ${filePath}`);
        }
    }

    public async writeFile(filePath: string, content: string): Promise<void> {
        try {
            this.loggingService.debug(`Writing file: ${filePath}`);
            
            // Create directory if it doesn't exist
            const directory = path.dirname(filePath);
            await this.ensureDirectoryExists(directory);
            
            // Show confirmation dialog for file write
            const confirmation = await vscode.window.showWarningMessage(
                `The extension wants to write to the file: ${path.basename(filePath)}`,
                { modal: true },
                'Allow'
            );
            
            if (confirmation !== 'Allow') {
                this.loggingService.info(`User denied writing to file: ${filePath}`);
                throw new Error('File write operation cancelled by user');
            }
            
            await writeFileAsync(filePath, content, 'utf8');
            this.loggingService.info(`File written: ${filePath}`);
        } catch (error) {
            this.loggingService.error(`Error writing file: ${filePath}`, error);
            throw new Error(`Failed to write file: ${filePath}`);
        }
    }

    public async ensureDirectoryExists(directoryPath: string): Promise<void> {
        try {
            if (await this.exists(directoryPath)) {
                return;
            }

            await mkdirAsync(directoryPath, { recursive: true });
            this.loggingService.debug(`Created directory: ${directoryPath}`);
        } catch (error) {
            this.loggingService.error(`Error creating directory: ${directoryPath}`, error);
            throw new Error(`Failed to create directory: ${directoryPath}`);
        }
    }

    public async exists(filePath: string): Promise<boolean> {
        try {
            return await existsAsync(filePath);
        } catch (error) {
            this.loggingService.error(`Error checking if path exists: ${filePath}`, error);
            return false;
        }
    }

    public async isDirectory(filePath: string): Promise<boolean> {
        try {
            const stats = await statAsync(filePath);
            return stats.isDirectory();
        } catch (error) {
            this.loggingService.error(`Error checking if path is directory: ${filePath}`, error);
            return false;
        }
    }

    public async isFile(filePath: string): Promise<boolean> {
        try {
            const stats = await statAsync(filePath);
            return stats.isFile();
        } catch (error) {
            this.loggingService.error(`Error checking if path is file: ${filePath}`, error);
            return false;
        }
    }

    public async listDirectory(directoryPath: string): Promise<string[]> {
        try {
            this.loggingService.debug(`Listing directory: ${directoryPath}`);
            return await readdirAsync(directoryPath);
        } catch (error) {
            this.loggingService.error(`Error listing directory: ${directoryPath}`, error);
            throw new Error(`Failed to list directory: ${directoryPath}`);
        }
    }

    public async getFileStructure(directoryPath: string, maxDepth: number = 3): Promise<{ [key: string]: any }> {
        return this.buildFileStructure(directoryPath, 0, maxDepth);
    }

    private async buildFileStructure(
        currentPath: string, 
        currentDepth: number, 
        maxDepth: number
    ): Promise<{ [key: string]: any }> {
        if (currentDepth >= maxDepth) {
            return {};
        }

        try {
            const items = await readdirAsync(currentPath);
            const result: { [key: string]: any } = {};

            for (const item of items) {
                const itemPath = path.join(currentPath, item);
                const stats = await statAsync(itemPath);

                if (stats.isDirectory()) {
                    const children = await this.buildFileStructure(itemPath, currentDepth + 1, maxDepth);
                    result[item] = { type: 'directory', children };
                } else {
                    const extension = path.extname(item);
                    result[item] = { type: 'file', extension };
                }
            }

            return result;
        } catch (error) {
            this.loggingService.error(`Error building file structure for: ${currentPath}`, error);
            return {};
        }
    }

    public getWorkspaceFolders(): vscode.WorkspaceFolder[] {
        const folders = vscode.workspace.workspaceFolders || [];
        return folders;
    }

    public getWorkspaceRootPath(): string | undefined {
        const folders = this.getWorkspaceFolders();
        return folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }

    public resolveWorkspacePath(relativePath: string): string | undefined {
        const rootPath = this.getWorkspaceRootPath();
        return rootPath ? path.join(rootPath, relativePath) : undefined;
    }

    public async findFilesInWorkspace(globPattern: string, excludePattern?: string): Promise<vscode.Uri[]> {
        const workspaceFolders = this.getWorkspaceFolders();
        if (workspaceFolders.length === 0) {
            return [];
        }

        return await vscode.workspace.findFiles(globPattern, excludePattern);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 
    }
} 