export interface AIModelConfiguration {
    id: string;
    provider: string; 
    displayName: string;
    contextSize: number;
    capabilities: string[];
} 