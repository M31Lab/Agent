import * as vscode from 'vscode';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ExtensionContext } from '../../models/context/extensionContext';

export interface SearchResult {
    id: string;
    title: string;
    url: string;
    description: string;
    source: string;
    timestamp: number;
}

export interface WebSearchOptions {
    maxResults: number;
    safeSearch: boolean;
    market?: string;
    language?: string;
}

export enum SearchProvider {
    Bing = 'bing',
    Google = 'google',
    DuckDuckGo = 'duckduckgo',
    Custom = 'custom'
}

export interface SearchEvent {
    type: 'searchStarted' | 'searchCompleted' | 'searchError';
    query: string;
    provider: SearchProvider;
    results?: SearchResult[];
    error?: string;
    timestamp: number;
}

export const defaultSearchOptions: WebSearchOptions = {
    maxResults: 5,
    safeSearch: true
};

export class WebSearchService implements vscode.Disposable {
    private static instance: WebSearchService | undefined;
    
    private readonly context: ExtensionContext;
    private readonly eventEmitter = new vscode.EventEmitter<SearchEvent>();
    private readonly disposables: vscode.Disposable[] = [];
    private currentProvider: SearchProvider = SearchProvider.Bing;
    private customEndpoint?: string;
    
    public readonly onSearchEvent = this.eventEmitter.event;
    
    private constructor(context: ExtensionContext) {
        this.context = context;
        this.disposables.push(this.eventEmitter);
        
        // Load provider preference from configuration
        this.loadConfiguration();
        
        // Listen for configuration changes
        this.disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('m31-agent.search')) {
                this.loadConfiguration();
            }
        }));
    }
    
    public static getInstance(context?: ExtensionContext): WebSearchService {
        if (!WebSearchService.instance && context) {
            WebSearchService.instance = new WebSearchService(context);
        }
        
        if (!WebSearchService.instance) {
            throw new Error('Web search service not initialized');
        }
        
        return WebSearchService.instance;
    }
    
    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('m31-agent.search');
        
        const provider = config.get<string>('provider');
        if (provider && Object.values(SearchProvider).includes(provider as SearchProvider)) {
            this.currentProvider = provider as SearchProvider;
        }
        
        this.customEndpoint = config.get<string>('customEndpoint');
    }
    
    public async search(
        query: string,
        options: Partial<WebSearchOptions> = {}
    ): Promise<SearchResult[]> {
        // Merge with default options
        const searchOptions: WebSearchOptions = {
            ...defaultSearchOptions,
            ...options
        };
        
        // Emit search started event
        this.emitEvent({
            type: 'searchStarted',
            query,
            provider: this.currentProvider
        });
        
        try {
            let results: SearchResult[];
            
            switch (this.currentProvider) {
                case SearchProvider.Bing:
                    results = await this.searchWithBing(query, searchOptions);
                    break;
                    
                case SearchProvider.Google:
                    results = await this.searchWithGoogle(query, searchOptions);
                    break;
                    
                case SearchProvider.DuckDuckGo:
                    results = await this.searchWithDDG(query, searchOptions);
                    break;
                    
                case SearchProvider.Custom:
                    if (!this.customEndpoint) {
                        throw new Error('Custom search endpoint not configured');
                    }
                    results = await this.searchWithCustomEndpoint(query, searchOptions);
                    break;
                    
                default:
                    results = await this.searchWithBing(query, searchOptions);
            }
            
            // Emit search completed event
            this.emitEvent({
                type: 'searchCompleted',
                query,
                provider: this.currentProvider,
                results
            });
            
            // Track search for telemetry
            this.context.telemetryService.trackEvent('search_executed', {
                provider: this.currentProvider,
                resultCount: results.length.toString()
            });
            
            return results;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Log error
            this.context.loggingService.error(`Search error for query "${query}":`, error);
            
            // Emit search error event
            this.emitEvent({
                type: 'searchError',
                query,
                provider: this.currentProvider,
                error: errorMessage
            });
            
            // Track error for telemetry
            this.context.telemetryService.trackEvent('search_error', {
                provider: this.currentProvider,
                error: errorMessage
            });
            
            throw error;
        }
    }
    
    private async searchWithBing(
        query: string,
        options: WebSearchOptions
    ): Promise<SearchResult[]> {
        try {
            // Get API key from configuration
            const config = vscode.workspace.getConfiguration('m31-agent.search');
            const apiKey = config.get<string>('bingApiKey');
            
            if (!apiKey) {
                throw new Error('Bing API key not configured. Please set m31-agent.search.bingApiKey in your settings.');
            }
            
            // Build request parameters
            const params = {
                q: query,
                count: options.maxResults,
                safeSearch: options.safeSearch ? 'Strict' : 'Off',
                mkt: options.market || 'en-US'
            };
            
            // Make API request
            const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
                headers: {
                    'Ocp-Apim-Subscription-Key': apiKey
                },
                params,
                timeout: 10000
            });
            
            // Process results
            const results = response.data.webPages.value.map((item: any) => {
                return {
                    id: uuidv4(),
                    title: item.name,
                    url: item.url,
                    description: item.snippet,
                    source: 'Bing',
                    timestamp: Date.now()
                };
            });
            
            return results;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(`Bing search error: ${error.response.status} - ${error.response.statusText}`);
            }
            throw error;
        }
    }
    
    private async searchWithGoogle(
        query: string,
        options: WebSearchOptions
    ): Promise<SearchResult[]> {
        try {
            // Get API key and engine ID from configuration
            const config = vscode.workspace.getConfiguration('m31-agent.search');
            const apiKey = config.get<string>('googleApiKey');
            const engineId = config.get<string>('googleEngineId');
            
            if (!apiKey || !engineId) {
                throw new Error('Google Search API not fully configured. Please set both m31-agent.search.googleApiKey and m31-agent.search.googleEngineId in your settings.');
            }
            
            // Build request parameters
            const params = {
                key: apiKey,
                cx: engineId,
                q: query,
                num: options.maxResults,
                safe: options.safeSearch ? 'active' : 'off',
                hl: options.language || 'en'
            };
            
            // Make API request
            const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params,
                timeout: 10000
            });
            
            // Process results
            const results = response.data.items.map((item: any) => {
                return {
                    id: uuidv4(),
                    title: item.title,
                    url: item.link,
                    description: item.snippet,
                    source: 'Google',
                    timestamp: Date.now()
                };
            });
            
            return results;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(`Google search error: ${error.response.status} - ${error.response.statusText}`);
            }
            throw error;
        }
    }
    
    private async searchWithDDG(
        query: string,
        options: WebSearchOptions
    ): Promise<SearchResult[]> {
        try {
            // DuckDuckGo doesn't have an official API, so we use an unofficial one
            const response = await axios.get('https://api.duckduckgo.com/', {
                params: {
                    q: query,
                    format: 'json',
                    no_html: 1,
                    skip_disambig: 1
                },
                timeout: 10000
            });
            
            const results: SearchResult[] = [];
            
            // Process the instant answer
            if (response.data.AbstractText) {
                results.push({
                    id: uuidv4(),
                    title: response.data.Heading,
                    url: response.data.AbstractURL,
                    description: response.data.AbstractText,
                    source: 'DuckDuckGo',
                    timestamp: Date.now()
                });
            }
            
            // Process related topics
            if (response.data.RelatedTopics) {
                for (const topic of response.data.RelatedTopics) {
                    if (results.length >= options.maxResults) {
                        break;
                    }
                    
                    if (topic.Text && topic.FirstURL) {
                        results.push({
                            id: uuidv4(),
                            title: topic.Text.split(' - ')[0] || topic.Text,
                            url: topic.FirstURL,
                            description: topic.Text,
                            source: 'DuckDuckGo',
                            timestamp: Date.now()
                        });
                    }
                }
            }
            
            return results;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(`DuckDuckGo search error: ${error.response.status} - ${error.response.statusText}`);
            }
            throw error;
        }
    }
    
    private async searchWithCustomEndpoint(
        query: string,
        options: WebSearchOptions
    ): Promise<SearchResult[]> {
        try {
            if (!this.customEndpoint) {
                throw new Error('Custom search endpoint not configured');
            }
            
            // Get API key from configuration
            const config = vscode.workspace.getConfiguration('m31-agent.search');
            const apiKey = config.get<string>('customApiKey');
            
            // Build request parameters and headers
            const params = {
                q: query,
                limit: options.maxResults,
                safe: options.safeSearch ? 1 : 0
            };
            
            const headers: Record<string, string> = {};
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            
            // Make API request
            const response = await axios.get(this.customEndpoint, {
                params,
                headers,
                timeout: 10000
            });
            
            // Process results - assumes a standard format
            // Custom endpoints should return an array of objects with at least title, url, and description
            const results = response.data.results.map((item: any) => {
                return {
                    id: uuidv4(),
                    title: item.title,
                    url: item.url,
                    description: item.description || item.snippet,
                    source: 'Custom',
                    timestamp: Date.now()
                };
            });
            
            return results;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(`Custom search error: ${error.response.status} - ${error.response.statusText}`);
            }
            throw error;
        }
    }
    
    public async setProvider(provider: SearchProvider): Promise<void> {
        if (!Object.values(SearchProvider).includes(provider)) {
            throw new Error(`Invalid search provider: ${provider}`);
        }
        
        this.currentProvider = provider;
        
        // Save to configuration
        await vscode.workspace.getConfiguration('m31-agent.search').update(
            'provider',
            provider,
            vscode.ConfigurationTarget.Global
        );
    }
    
    public getProvider(): SearchProvider {
        return this.currentProvider;
    }
    
    public async setCustomEndpoint(endpoint: string): Promise<void> {
        this.customEndpoint = endpoint;
        
        // Save to configuration
        await vscode.workspace.getConfiguration('m31-agent.search').update(
            'customEndpoint',
            endpoint,
            vscode.ConfigurationTarget.Global
        );
    }
    
    private emitEvent(event: Omit<SearchEvent, 'timestamp'>): void {
        this.eventEmitter.fire({
            ...event,
            timestamp: Date.now()
        });
    }
    
    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
} 