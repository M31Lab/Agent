import { AppState } from '../context/StateContext';
import { ChatMessage, ChatSession } from '../../models/ai/chatTypes';
import { AIModel } from '../../models/ai/aiModels';

// UI Selectors
export const getTheme = (state: AppState): 'light' | 'dark' | 'system' => state.ui.theme;

export const getIsSidebarVisible = (state: AppState): boolean => state.ui.isSidebarVisible;

export const getActiveView = (state: AppState): string => state.ui.activeView;

export const getIsLoading = (state: AppState): boolean => state.ui.isLoading;

export const getError = (state: AppState): string | null => state.ui.error;

// Chat Selectors
export const getMessages = (state: AppState): ChatMessage[] => state.chat.messages;

export const getSessions = (state: AppState): ChatSession[] => state.chat.sessions;

export const getActiveSessionId = (state: AppState): string | null => state.chat.activeSessionId;

export const getActiveSession = (state: AppState): ChatSession | undefined => {
    const activeId = state.chat.activeSessionId;
    return activeId ? state.chat.sessions.find(session => session.id === activeId) : undefined;
};

export const getIsProcessing = (state: AppState): boolean => state.chat.isProcessing;

export const getInputText = (state: AppState): string => state.chat.inputText;

// Settings Selectors
export const getModelId = (state: AppState): string => state.settings.modelId;

export const getTemperature = (state: AppState): number => state.settings.temperature;

export const getMaxTokens = (state: AppState): number => state.settings.maxTokens;

export const getIsTelemetryEnabled = (state: AppState): boolean => state.settings.telemetryEnabled;

export const getIsConfirmationRequired = (state: AppState): boolean => state.settings.requireConfirmation;

export const getAvailableModels = (state: AppState): AIModel[] => state.settings.availableModels;

export const getSelectedModel = (state: AppState): AIModel | undefined => {
    const modelId = state.settings.modelId;
    return state.settings.availableModels.find(model => model.id === modelId);
};

// Terminal Selectors
export const getTerminalOutput = (state: AppState): string => state.terminal.output;

export const getIsTerminalExecuting = (state: AppState): boolean => state.terminal.isExecuting;

export const getCommandHistory = (state: AppState): string[] => state.terminal.commandHistory;

// Editor Selectors
export const getActiveFile = (state: AppState): string | null => state.editor.activeFile;

export const getEditorSelection = (state: AppState): { start: number; end: number } | null => state.editor.selection;

export const getEditorContent = (state: AppState): string | null => state.editor.content;

// AI Selectors
export const getPrompt = (state: AppState): string | null => state.ai.prompt;

export const getCompletion = (state: AppState): string | null => state.ai.completion;

export const getAiError = (state: AppState): string | null => state.ai.error;

export const getIsStreaming = (state: AppState): boolean => state.ai.isStreaming;

// Auth Selectors
export const getApiKey = (state: AppState): string | null => state.auth.apiKey;

export const getIsAuthenticated = (state: AppState): boolean => state.auth.isAuthenticated; 