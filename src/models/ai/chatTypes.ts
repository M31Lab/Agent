export enum ChatRole {
    System = 'system',
    User = 'user',
    Assistant = 'assistant',
    Function = 'function'
}

export interface ChatMessage {
    role: ChatRole;
    content: string;
    name?: string;
    timestamp?: number;
    id?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
    modelId?: string;
}

export interface ChatCompletionOptions {
    modelId?: string;
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    frequencyPenalty?: number;
    presencePenalty?: number;
    topP?: number;
    stream?: boolean;
}

export enum ChatViewMode {
    Persistent = 'persistent',
    Quick = 'quick',
    Inline = 'inline'
}

export interface ChatViewState {
    mode: ChatViewMode;
    activeSessionId: string | null;
    isProcessing: boolean;
    isSidebarVisible: boolean;
    isVisible: boolean;
    inputText: string;
    errorMessage: string | null;
}

export interface ChatHistoryItem {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: number;
} 