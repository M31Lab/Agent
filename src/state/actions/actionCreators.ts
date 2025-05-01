import { ActionType } from './actionTypes';
import { ChatMessage } from '../../models/ai/chatTypes';
import { ChatSession } from '../../models/ai/chatTypes';

export interface Action<T = any> {
    type: ActionType;
    payload?: T;
}

// UI Actions
export const setTheme = (theme: 'light' | 'dark' | 'system'): Action<string> => ({
    type: ActionType.UI_SET_THEME,
    payload: theme
});

export const toggleSidebar = (): Action => ({
    type: ActionType.UI_TOGGLE_SIDEBAR
});

export const setActiveView = (view: string): Action<string> => ({
    type: ActionType.UI_SET_ACTIVE_VIEW,
    payload: view
});

export const setLoading = (isLoading: boolean): Action<boolean> => ({
    type: ActionType.UI_SET_LOADING,
    payload: isLoading
});

export const setError = (error: string | null): Action<string | null> => ({
    type: ActionType.UI_SET_ERROR,
    payload: error
});

export const clearError = (): Action => ({
    type: ActionType.UI_CLEAR_ERROR
});

// Chat Actions
export const setMessages = (messages: ChatMessage[]): Action<ChatMessage[]> => ({
    type: ActionType.CHAT_SET_MESSAGES,
    payload: messages
});

export const addMessage = (message: ChatMessage): Action<ChatMessage> => ({
    type: ActionType.CHAT_ADD_MESSAGE,
    payload: message
});

export const clearMessages = (): Action => ({
    type: ActionType.CHAT_CLEAR_MESSAGES
});

export const setActiveSession = (sessionId: string): Action<string> => ({
    type: ActionType.CHAT_SET_ACTIVE_SESSION,
    payload: sessionId
});

export const createSession = (session: ChatSession): Action<ChatSession> => ({
    type: ActionType.CHAT_CREATE_SESSION,
    payload: session
});

export const deleteSession = (sessionId: string): Action<string> => ({
    type: ActionType.CHAT_DELETE_SESSION,
    payload: sessionId
});

export const setInputText = (text: string): Action<string> => ({
    type: ActionType.CHAT_SET_INPUT_TEXT,
    payload: text
});

export const setProcessing = (isProcessing: boolean): Action<boolean> => ({
    type: ActionType.CHAT_SET_PROCESSING,
    payload: isProcessing
});

// Settings Actions
export const setModel = (modelId: string): Action<string> => ({
    type: ActionType.SETTINGS_SET_MODEL,
    payload: modelId
});

export const setTemperature = (temperature: number): Action<number> => ({
    type: ActionType.SETTINGS_SET_TEMPERATURE,
    payload: temperature
});

export const setMaxTokens = (maxTokens: number): Action<number> => ({
    type: ActionType.SETTINGS_SET_MAX_TOKENS,
    payload: maxTokens
});

export const setTelemetryEnabled = (enabled: boolean): Action<boolean> => ({
    type: ActionType.SETTINGS_SET_TELEMETRY_ENABLED,
    payload: enabled
});

export const setRequireConfirmation = (required: boolean): Action<boolean> => ({
    type: ActionType.SETTINGS_SET_REQUIRE_CONFIRMATION,
    payload: required
});

// Terminal Actions
export const executeCommand = (command: string): Action<string> => ({
    type: ActionType.TERMINAL_EXECUTE_COMMAND,
    payload: command
});

export const setTerminalOutput = (output: string): Action<string> => ({
    type: ActionType.TERMINAL_SET_OUTPUT,
    payload: output
});

export const clearTerminalOutput = (): Action => ({
    type: ActionType.TERMINAL_CLEAR_OUTPUT
});

// Editor Actions
export const setActiveFile = (filePath: string): Action<string> => ({
    type: ActionType.EDITOR_SET_ACTIVE_FILE,
    payload: filePath
});

export const updateContent = (content: string): Action<string> => ({
    type: ActionType.EDITOR_UPDATE_CONTENT,
    payload: content
});

export const setSelection = (selection: { start: number; end: number }): Action<{ start: number; end: number }> => ({
    type: ActionType.EDITOR_SET_SELECTION,
    payload: selection
});

// AI Actions
export const startCompletion = (prompt: string): Action<string> => ({
    type: ActionType.AI_START_COMPLETION,
    payload: prompt
});

export const receiveCompletion = (completion: string): Action<string> => ({
    type: ActionType.AI_RECEIVE_COMPLETION,
    payload: completion
});

export const completionError = (error: string): Action<string> => ({
    type: ActionType.AI_COMPLETION_ERROR,
    payload: error
});

export const setStreaming = (isStreaming: boolean): Action<boolean> => ({
    type: ActionType.AI_SET_STREAMING,
    payload: isStreaming
});

// Auth Actions
export const login = (apiKey: string): Action<string> => ({
    type: ActionType.AUTH_LOGIN,
    payload: apiKey
});

export const logout = (): Action => ({
    type: ActionType.AUTH_LOGOUT
});

export const setApiKey = (apiKey: string): Action<string> => ({
    type: ActionType.AUTH_SET_API_KEY,
    payload: apiKey
});

// Session Actions
export const initializeSession = (): Action => ({
    type: ActionType.SESSION_INITIALIZE
});

export const resetSession = (): Action => ({
    type: ActionType.SESSION_RESET
}); 