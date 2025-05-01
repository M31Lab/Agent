import { ChatMessage } from '../interfaces/messageHandlers';

/**
 * Interface for chat state
 */
export interface ChatState {
    messages: ChatMessage[];
    isProcessing: boolean;
    modelId: string;
    error: string | null;
}

/**
 * Default chat state
 */
export const defaultChatState: ChatState = {
    messages: [],
    isProcessing: false,
    modelId: 'Unknown',
    error: null
};

/**
 * Chat context class to manage chat state
 */
export class ChatContext {
    private state: ChatState;
    private listeners: Array<(state: ChatState) => void> = [];

    constructor(initialState: Partial<ChatState> = {}) {
        this.state = { ...defaultChatState, ...initialState };
    }

    /**
     * Get the current state
     */
    public getState(): ChatState {
        return { ...this.state };
    }

    /**
     * Update the state
     */
    public setState(newState: Partial<ChatState>): void {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    }

    /**
     * Add a message to the chat
     */
    public addMessage(message: ChatMessage): void {
        this.state.messages = [...this.state.messages, message];
        this.notifyListeners();
    }

    /**
     * Clear all messages
     */
    public clearMessages(): void {
        this.state.messages = [];
        this.notifyListeners();
    }

    /**
     * Set the processing state
     */
    public setProcessing(isProcessing: boolean): void {
        this.state.isProcessing = isProcessing;
        this.notifyListeners();
    }

    /**
     * Set an error message
     */
    public setError(error: string | null): void {
        this.state.error = error;
        this.notifyListeners();
    }

    /**
     * Set the model ID
     */
    public setModelId(modelId: string): void {
        this.state.modelId = modelId;
        this.notifyListeners();
    }

    /**
     * Subscribe to state changes
     */
    public subscribe(listener: (state: ChatState) => void): () => void {
        this.listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of state changes
     */
    private notifyListeners(): void {
        const state = this.getState();
        this.listeners.forEach(listener => listener(state));
    }
} 