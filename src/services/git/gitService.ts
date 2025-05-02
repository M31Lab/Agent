import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { ChatRole } from '../../models/ai/chatTypes';

// Define the Repository interface as it's not exported by VS Code types
interface Repository {
    state: {
        indexChanges: {
            resourceUri: vscode.Uri;
            letter: string;
        }[];
    };
    diff(uri: vscode.Uri): Promise<string>;
    commit(message: string): Promise<void>;
}

export interface GitFileChange {
    relativePath: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked';
    statusSymbol: string;
    absolutePath: string;
}

export interface CommitMessageGenerationOptions {
    includeSummary: boolean;
    includeDetails: boolean;
    useConventionalCommit: boolean;
}

export class GitService implements vscode.Disposable {
    private static instance: GitService | undefined;
    private apiClient: OpenRouterApiClient;
    private subscriptions: vscode.Disposable[] = [];
    
    constructor(private context: ExtensionContext) {
        this.apiClient = OpenRouterApiClient.getInstance();
        
        // Register event handlers
        this.registerEventHandlers();
    }
    
    public static getInstance(context: ExtensionContext): GitService {
        if (!GitService.instance) {
            GitService.instance = new GitService(context);
        }
        return GitService.instance;
    }
    
    private registerEventHandlers(): void {
        // Listen for Git changes if we need to in the future
        // Currently not needed, but structure is in place
    }
    
    /**
     * Get the Git repository for the current workspace
     */
    public async getRepository(): Promise<Repository | undefined> {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
            return undefined;
        }
        
        const api = gitExtension.getAPI(1);
        if (!api) {
            return undefined;
        }
        
        if (api.repositories.length === 0) {
            return undefined;
        }
        
        // Return the first repository in the workspace
        return api.repositories[0] as Repository;
    }
    
    /**
     * Get staged file changes from the Git repository
     */
    public async getStagedChanges(): Promise<GitFileChange[]> {
        const repository = await this.getRepository();
        if (!repository) {
            return [];
        }
        
        const changes: GitFileChange[] = [];
        
        for (const resource of repository.state.indexChanges) {
            const absolutePath = resource.resourceUri.fsPath;
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
            const relativePath = workspacePath ? path.relative(workspacePath, absolutePath) : absolutePath;
            
            let status: GitFileChange['status'] = 'modified';
            let statusSymbol = 'M';
            
            // Determine status from Git letter
            switch (resource.letter) {
                case 'A':
                    status = 'added';
                    statusSymbol = 'A';
                    break;
                case 'D':
                    status = 'deleted';
                    statusSymbol = 'D';
                    break;
                case 'R':
                    status = 'renamed';
                    statusSymbol = 'R';
                    break;
                case 'C':
                    status = 'copied';
                    statusSymbol = 'C';
                    break;
                case '?':
                    status = 'untracked';
                    statusSymbol = '?';
                    break;
                default:
                    status = 'modified';
                    statusSymbol = 'M';
            }
            
            changes.push({
                relativePath,
                absolutePath,
                status,
                statusSymbol
            });
        }
        
        return changes;
    }
    
    /**
     * Get file content difference for a staged file
     */
    public async getFileDiff(filePath: string): Promise<string> {
        const repository = await this.getRepository();
        if (!repository) {
            return '';
        }
        
        const uri = vscode.Uri.file(filePath);
        try {
            // Get diff from Git extension
            const diff = await repository.diff(uri);
            return diff;
        } catch (error) {
            this.context.loggingService.error(`Failed to get diff for ${filePath}`, error);
            return '';
        }
    }
    
    /**
     * Generate a commit message based on staged changes
     */
    public async generateCommitMessage(options: CommitMessageGenerationOptions = {
        includeSummary: true,
        includeDetails: true,
        useConventionalCommit: true
    }): Promise<string> {
        const stagedChanges = await this.getStagedChanges();
        
        if (stagedChanges.length === 0) {
            throw new Error('No staged changes found. Please stage your changes before generating a commit message.');
        }
        
        // Get diffs for analysis
        const fileDiffs: { file: string; diff: string }[] = [];
        
        for (const change of stagedChanges) {
            const diff = await this.getFileDiff(change.absolutePath);
            if (diff) {
                fileDiffs.push({
                    file: change.relativePath,
                    diff
                });
            }
        }
        
        // Create a prompt for AI to generate commit message
        let prompt = 'Generate a concise, informative Git commit message based on the following staged changes:\n\n';
        
        // Add information about changed files
        prompt += 'Changed files:\n';
        for (const change of stagedChanges) {
            prompt += `${change.statusSymbol} ${change.relativePath}\n`;
        }
        
        // Add diff information (limited to avoid token limits)
        prompt += '\nDiffs (truncated if needed):\n';
        for (const { file, diff } of fileDiffs) {
            // Limit diff size to avoid token limits
            const truncatedDiff = diff.length > 1000 ? diff.substring(0, 1000) + '...[truncated]' : diff;
            prompt += `\n${file}:\n${truncatedDiff}\n`;
        }
        
        // Add instructions based on options
        prompt += '\nCommit message requirements:\n';
        if (options.useConventionalCommit) {
            prompt += '- Use Conventional Commit format (type(scope): description)\n';
            prompt += '- Types: feat, fix, docs, style, refactor, test, chore\n';
            prompt += '- Keep the first line under 72 characters\n';
        } else {
            prompt += '- Keep the first line under 72 characters\n';
        }
        
        if (options.includeDetails) {
            prompt += '- Include a more detailed explanation after the first line, separated by a blank line\n';
        }
        
        try {
            const response = await this.apiClient.generateChatCompletion([
                {
                    role: ChatRole.System,
                    content: 'You are a helpful assistant that generates concise, clear git commit messages based on code changes.'
                },
                {
                    role: ChatRole.User,
                    content: prompt
                }
            ], {});
            
            return response.choices[0].message.content.trim();
        } catch (error) {
            this.context.loggingService.error('Failed to generate commit message', error);
            throw new Error('Failed to generate commit message: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
    
    /**
     * Commit changes with the given message
     */
    public async commitChanges(message: string): Promise<boolean> {
        const repository = await this.getRepository();
        if (!repository) {
            return false;
        }
        
        try {
            await repository.commit(message);
            return true;
        } catch (error) {
            this.context.loggingService.error('Failed to commit changes', error);
            return false;
        }
    }
    
    public dispose(): void {
        this.subscriptions.forEach(d => d.dispose());
        this.subscriptions = [];
    }
} 