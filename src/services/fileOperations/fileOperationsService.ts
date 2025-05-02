import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';

export interface FileOperationResult {
    success: boolean;
    message: string;
    filePath?: string;
    error?: Error;
}

export class FileOperationsService implements vscode.Disposable {
    private context: ExtensionContext;
    private subscriptions: vscode.Disposable[] = [];
    private recentOperations: { 
        operation: string; 
        path: string;
        timestamp: number;
        success: boolean;
    }[] = [];
    private static readonly MAX_RECENT_OPERATIONS = 50;

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    public async initialize(): Promise<void> {
        this.context.loggingService.info('Initializing file operations service');
        
        // Set up file system watcher
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
        
        fileWatcher.onDidCreate(uri => {
            this.context.loggingService.debug(`File created: ${uri.fsPath}`);
        });
        
        fileWatcher.onDidChange(uri => {
            this.context.loggingService.debug(`File changed: ${uri.fsPath}`);
        });
        
        fileWatcher.onDidDelete(uri => {
            this.context.loggingService.debug(`File deleted: ${uri.fsPath}`);
        });
        
        this.subscriptions.push(fileWatcher);
        
        this.context.loggingService.info('File operations service initialized');
    }

    public async createFile(filePath: string, content: string): Promise<FileOperationResult> {
        try {
            // Check if the file exists
            const uri = vscode.Uri.file(filePath);
            try {
                await vscode.workspace.fs.stat(uri);
                // File exists
                if (this.context.configurationService.isRequireConfirmation()) {
                    const confirmed = await vscode.window.showWarningMessage(
                        `The file ${path.basename(filePath)} already exists. Do you want to overwrite it?`,
                        { modal: true },
                        'Overwrite'
                    );
                    
                    if (confirmed !== 'Overwrite') {
                        return {
                            success: false,
                            message: 'Operation cancelled by user'
                        };
                    }
                }
            } catch (error) {
                // File doesn't exist, ensure directory exists
                const dirPath = path.dirname(filePath);
                await this.ensureDirectoryExists(dirPath);
            }

            // Write file
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
            
            // Track operation
            this.addRecentOperation('create', filePath, true);
            
            // Track telemetry
            this.context.telemetryService.trackEvent('file_created', {
                extension: path.extname(filePath),
                contentLength: content.length.toString()
            });
            
            return {
                success: true,
                message: `File ${path.basename(filePath)} created successfully`,
                filePath
            };
        } catch (error) {
            this.context.loggingService.error(`Failed to create file: ${filePath}`, error);
            
            // Track operation
            this.addRecentOperation('create', filePath, false);
            
            return {
                success: false,
                message: `Failed to create file: ${error instanceof Error ? error.message : String(error)}`,
                filePath,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    public async readFile(filePath: string): Promise<string> {
        try {
            const uri = vscode.Uri.file(filePath);
            const data = await vscode.workspace.fs.readFile(uri);
            const content = new TextDecoder().decode(data);
            
            // Track operation
            this.addRecentOperation('read', filePath, true);
            
            return content;
        } catch (error) {
            this.context.loggingService.error(`Failed to read file: ${filePath}`, error);
            
            // Track operation
            this.addRecentOperation('read', filePath, false);
            
            throw error;
        }
    }

    public async updateFile(filePath: string, content: string): Promise<FileOperationResult> {
        try {
            // Check if the file exists
            const uri = vscode.Uri.file(filePath);
            try {
                await vscode.workspace.fs.stat(uri);
            } catch (error) {
                return {
                    success: false,
                    message: `File ${path.basename(filePath)} does not exist`,
                    filePath
                };
            }

            // Confirm update if required
            if (this.context.configurationService.isRequireConfirmation()) {
                const confirmed = await vscode.window.showWarningMessage(
                    `Do you want to update the file ${path.basename(filePath)}?`,
                    { modal: true },
                    'Update'
                );
                
                if (confirmed !== 'Update') {
                    return {
                        success: false,
                        message: 'Operation cancelled by user',
                        filePath
                    };
                }
            }

            // Write file
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
            
            // Track operation
            this.addRecentOperation('update', filePath, true);
            
            // Track telemetry
            this.context.telemetryService.trackEvent('file_updated', {
                extension: path.extname(filePath),
                contentLength: content.length.toString()
            });
            
            return {
                success: true,
                message: `File ${path.basename(filePath)} updated successfully`,
                filePath
            };
        } catch (error) {
            this.context.loggingService.error(`Failed to update file: ${filePath}`, error);
            
            // Track operation
            this.addRecentOperation('update', filePath, false);
            
            return {
                success: false,
                message: `Failed to update file: ${error instanceof Error ? error.message : String(error)}`,
                filePath,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    public async deleteFile(filePath: string): Promise<FileOperationResult> {
        try {
            // Confirm deletion if required
            if (this.context.configurationService.isRequireConfirmation()) {
                const confirmed = await vscode.window.showWarningMessage(
                    `Are you sure you want to delete ${path.basename(filePath)}?`,
                    { modal: true },
                    'Delete'
                );
                
                if (confirmed !== 'Delete') {
                    return {
                        success: false,
                        message: 'Operation cancelled by user',
                        filePath
                    };
                }
            }

            // Delete file
            const uri = vscode.Uri.file(filePath);
            await vscode.workspace.fs.delete(uri, { useTrash: true });
            
            // Track operation
            this.addRecentOperation('delete', filePath, true);
            
            // Track telemetry
            this.context.telemetryService.trackEvent('file_deleted', {
                extension: path.extname(filePath)
            });
            
            return {
                success: true,
                message: `File ${path.basename(filePath)} deleted successfully`,
                filePath
            };
        } catch (error) {
            this.context.loggingService.error(`Failed to delete file: ${filePath}`, error);
            
            // Track operation
            this.addRecentOperation('delete', filePath, false);
            
            return {
                success: false,
                message: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
                filePath,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    public async createDirectory(dirPath: string): Promise<FileOperationResult> {
        try {
            await this.ensureDirectoryExists(dirPath);
            
            // Track operation
            this.addRecentOperation('createDir', dirPath, true);
            
            // Track telemetry
            this.context.telemetryService.trackEvent('directory_created');
            
            return {
                success: true,
                message: `Directory ${path.basename(dirPath)} created successfully`,
                filePath: dirPath
            };
        } catch (error) {
            this.context.loggingService.error(`Failed to create directory: ${dirPath}`, error);
            
            // Track operation
            this.addRecentOperation('createDir', dirPath, false);
            
            return {
                success: false,
                message: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
                filePath: dirPath,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    public async listFiles(dirPath: string): Promise<string[]> {
        try {
            const uri = vscode.Uri.file(dirPath);
            const files = await vscode.workspace.fs.readDirectory(uri);
            
            // Return just the file paths
            return files.map(([name, type]) => {
                const fullPath = path.join(dirPath, name);
                return fullPath;
            });
        } catch (error) {
            this.context.loggingService.error(`Failed to list files in directory: ${dirPath}`, error);
            throw error;
        }
    }

    public async openFile(filePath: string): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            
            // Track operation
            this.addRecentOperation('open', filePath, true);
            
            // Track telemetry
            this.context.telemetryService.trackEvent('file_opened', {
                extension: path.extname(filePath)
            });
        } catch (error) {
            this.context.loggingService.error(`Failed to open file: ${filePath}`, error);
            
            // Track operation
            this.addRecentOperation('open', filePath, false);
            
            throw error;
        }
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(dirPath);
            await vscode.workspace.fs.stat(uri);
            // Directory exists
        } catch (error) {
            // Directory doesn't exist, create it
            const uri = vscode.Uri.file(dirPath);
            await vscode.workspace.fs.createDirectory(uri);
        }
    }

    private addRecentOperation(operation: string, path: string, success: boolean): void {
        this.recentOperations.unshift({
            operation,
            path,
            timestamp: Date.now(),
            success
        });
        
        // Trim the list if needed
        if (this.recentOperations.length > FileOperationsService.MAX_RECENT_OPERATIONS) {
            this.recentOperations = this.recentOperations.slice(0, FileOperationsService.MAX_RECENT_OPERATIONS);
        }
    }

    public getRecentOperations(): { operation: string; path: string; timestamp: number; success: boolean }[] {
        return [...this.recentOperations];
    }

    public dispose(): void {
        this.subscriptions.forEach(s => s.dispose());
        this.subscriptions = [];
    }
} 