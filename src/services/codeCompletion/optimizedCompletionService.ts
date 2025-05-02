import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { ChatRole } from '../../models/ai/chatTypes';
import LRUCache from 'lru-cache';

interface _CompletionCacheKey {
    prefix: string;
    language: string;
    contextHash: string;
}

interface CompletionCacheValue {
    completions: string[];
    timestamp: number;
}

export class OptimizedCompletionService implements vscode.Disposable {
    private static instance: OptimizedCompletionService | undefined;
    private apiClient: OpenRouterApiClient;
    private subscriptions: vscode.Disposable[] = [];
    private completionCache: LRUCache<string, CompletionCacheValue>;
    private prefetchQueue: Set<string> = new Set();
    private processingPrefetch: boolean = false;
    
    constructor(private context: ExtensionContext) {
        this.apiClient = OpenRouterApiClient.getInstance();
        
        // Initialize cache with 100 items max, expire after 5 minutes
        this.completionCache = new LRUCache<string, CompletionCacheValue>({
            max: 100,
            ttl: 1000 * 60 * 5, // 5 minutes
        });
        
        // Register event handlers
        this.registerEventHandlers();
    }
    
    public static getInstance(context: ExtensionContext): OptimizedCompletionService {
        if (!OptimizedCompletionService.instance) {
            OptimizedCompletionService.instance = new OptimizedCompletionService(context);
        }
        return OptimizedCompletionService.instance;
    }
    
    private registerEventHandlers(): void {
        // Listen for text document changes to prefetch completions
        const changeListener = vscode.workspace.onDidChangeTextDocument(event => {
            this.handleDocumentChange(event);
        });
        this.subscriptions.push(changeListener);
    }
    
    /**
     * Generate code completion with optimization for speed (target: 200ms)
     */
    public async getCompletion(
        prefix: string,
        language: string,
        filePath: string,
        maxCompletions: number = 5
    ): Promise<string[]> {
        const cacheKey = this.generateCacheKey(prefix, language, filePath);
        
        // Check cache first
        const cached = this.completionCache.get(cacheKey);
        if (cached) {
            this.context.telemetryService.trackEvent('completion_cache_hit', {
                language,
                prefixLength: prefix.length.toString()
            });
            return cached.completions.slice(0, maxCompletions);
        }
        
        // No cache hit, generate completion
        try {
            const startTime = Date.now();
            
            const completions = await this.generateCompletionFromAI(prefix, language, filePath);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Cache the result
            this.completionCache.set(cacheKey, {
                completions,
                timestamp: endTime
            });
            
            // Track telemetry for completion generation time
            this.context.telemetryService.trackEvent('completion_generated', {
                language,
                prefixLength: prefix.length.toString(),
                duration: duration.toString()
            });
            
            return completions.slice(0, maxCompletions);
        } catch (error) {
            this.context.loggingService.error('Failed to generate completion', error);
            return [];
        }
    }
    
    /**
     * Generate completion using AI
     */
    private async generateCompletionFromAI(
        prefix: string,
        language: string,
        filePath: string
    ): Promise<string[]> {
        try {
            // Get file context if needed
            let fileContext = '';
            if (filePath) {
                try {
                    const document = await vscode.workspace.openTextDocument(filePath);
                    fileContext = document.getText();
                } catch (error) {
                    this.context.loggingService.error(`Failed to read file for context: ${filePath}`, error);
                }
            }
            
            // Create a prompt for AI
            const prompt = `Complete the following ${language} code snippet with 5 different possible completions:

Code context (truncated):
\`\`\`${language}
${fileContext.substring(Math.max(0, fileContext.length - 1000))}
\`\`\`

Code to complete:
\`\`\`${language}
${prefix}
\`\`\`

Return only 5 possible completions formatted as a JSON array of strings. Each completion should be a continuation of the code.`;

            const response = await this.apiClient.generateChatCompletion([
                {
                    role: ChatRole.System,
                    content: 'You are a code completion assistant that provides multiple possible completions for code snippets.'
                },
                {
                    role: ChatRole.User,
                    content: prompt
                }
            ], {
                maxTokens: 150, // Keep small for faster responses
                temperature: 0.3 // Lower temperature for more predictable completions
            });
            
            const content = response.choices[0].message.content.trim();
            
            // Try to parse JSON array from response
            try {
                // Extract JSON array if it's embedded in markdown
                const jsonMatch = content.match(/```json\s*(\[[\s\S]*?\])\s*```/) || 
                                 content.match(/\[[\s\S]*?\]/);
                
                const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
                const completions = JSON.parse(jsonStr);
                
                if (Array.isArray(completions)) {
                    return completions;
                }
            } catch (error) {
                this.context.loggingService.error('Failed to parse completion response as JSON', error);
            }
            
            // Fallback: split by lines and return as array
            return [content];
        } catch (error) {
            this.context.loggingService.error('Failed to generate completion from AI', error);
            throw error;
        }
    }
    
    /**
     * Handle document changes to prefetch likely completions
     */
    private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        // Only process if we're not already prefetching
        if (this.processingPrefetch || !event.contentChanges.length) {
            return;
        }
        
        const document = event.document;
        const language = document.languageId;
        const filePath = document.uri.fsPath;
        
        // Get current position and prefix
        const position = event.contentChanges[0].range.end;
        
        // Only prefetch if user is typing (not deleting)
        const changeText = event.contentChanges[0].text;
        if (!changeText || changeText.length === 0) {
            return;
        }
        
        // Get 20 characters before current position
        const line = document.lineAt(position.line);
        const lineText = line.text;
        const prefixStart = Math.max(0, position.character - 20);
        const prefix = lineText.substring(prefixStart, position.character);
        
        // Add to prefetch queue
        const cacheKey = this.generateCacheKey(prefix, language, filePath);
        this.prefetchQueue.add(cacheKey);
        
        // Start prefetching process if not already running
        if (!this.processingPrefetch) {
            this.processPrefetchQueue();
        }
    }
    
    /**
     * Process the prefetch queue
     */
    private async processPrefetchQueue(): Promise<void> {
        if (this.prefetchQueue.size === 0 || this.processingPrefetch) {
            return;
        }
        
        this.processingPrefetch = true;
        
        try {
            // Get the first item from the queue
            const cacheKey = this.prefetchQueue.values().next().value;
            this.prefetchQueue.delete(cacheKey);
            
            // Skip if already cached
            if (this.completionCache.has(cacheKey)) {
                return;
            }
            
            // Parse the cache key to get components
            const keyParts = cacheKey.split('||');
            if (keyParts.length !== 3) {
                return;
            }
            
            const [prefix, language, contextHash] = keyParts;
            
            // Generate completion in background
            await this.generateCompletionFromAI(prefix, language, contextHash);
            
            this.context.telemetryService.trackEvent('completion_prefetched', {
                language,
                prefixLength: prefix.length.toString()
            });
        } catch (error) {
            this.context.loggingService.error('Error during prefetching', error);
        } finally {
            this.processingPrefetch = false;
            
            // Process next item if queue is not empty
            if (this.prefetchQueue.size > 0) {
                setTimeout(() => this.processPrefetchQueue(), 100);
            }
        }
    }
    
    /**
     * Generate a cache key from prefix, language and file context
     */
    private generateCacheKey(prefix: string, language: string, filePath: string): string {
        // Simple hash function for the file path
        const contextHash = this.hashString(filePath);
        return `${prefix}||${language}||${contextHash}`;
    }
    
    /**
     * Simple hash function for strings
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }
    
    public dispose(): void {
        this.subscriptions.forEach(d => d.dispose());
        this.subscriptions = [];
        this.completionCache.clear();
    }
} 