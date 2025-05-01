import * as vscode from 'vscode';
import { Action } from '../actions/actionCreators';
import { ChatMessage, ChatSession } from '../../models/ai/chatTypes';
import { AIModel } from '../../models/ai/aiModels';

export interface UiState {
    theme: 'light' | 'dark' | 'system';
    isSidebarVisible: boolean;
    activeView: string;
    isLoading: boolean;
    error: string | null;
}

export interface ChatState {
    messages: ChatMessage[];
    sessions: ChatSession[];
    activeSessionId: string | null;
    isProcessing: boolean;
    inputText: string;
}

export interface SettingsState {
    modelId: string;
    temperature: number;
    maxTokens: number;
    telemetryEnabled: boolean;
    requireConfirmation: boolean;
    availableModels: AIModel[];
}

export interface TerminalState {
    output: string;
    isExecuting: boolean;
    commandHistory: string[];
}

export interface EditorState {
    activeFile: string | null;
    selection: { start: number; end: number } | null;
    content: string | null;
}

export interface AiState {
    prompt: string | null;
    completion: string | null;
    error: string | null;
    isStreaming: boolean;
}

export interface AuthState {
    apiKey: string | null;
    isAuthenticated: boolean;
}

export interface AppState {
    ui: UiState;
    chat: ChatState;
    settings: SettingsState;
    terminal: TerminalState;
    editor: EditorState;
    ai: AiState;
    auth: AuthState;
}

export interface StateContextProps {
    state: AppState;
    dispatch: (action: Action) => void;
}

export const initialState: AppState = {
    ui: {
        theme: 'system',
        isSidebarVisible: true,
        activeView: 'chat',
        isLoading: false,
        error: null
    },
    chat: {
        messages: [],
        sessions: [],
        activeSessionId: null,
        isProcessing: false,
        inputText: ''
    },
    settings: {
        modelId: 'openai/gpt-4o',
        temperature: 0.7,
        maxTokens: 1024,
        telemetryEnabled: true,
        requireConfirmation: true,
        availableModels: []
    },
    terminal: {
        output: '',
        isExecuting: false,
        commandHistory: []
    },
    editor: {
        activeFile: null,
        selection: null,
        content: null
    },
    ai: {
        prompt: null,
        completion: null,
        error: null,
        isStreaming: false
    },
    auth: {
        apiKey: null,
        isAuthenticated: false
    }
};

export function createStateContext() {
    const StateContext = {
        createStateContext: (initialState: AppState, dispatch: (action: Action) => void): StateContextProps => {
            return {
                state: initialState,
                dispatch
            };
        }
    };
    
    return StateContext;
} 