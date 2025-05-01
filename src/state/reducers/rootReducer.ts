import { ActionType } from '../actions/actionTypes';
import { Action } from '../actions/actionCreators';
import { AppState, initialState } from '../context/StateContext';

export function rootReducer(state: AppState = initialState, action: Action): AppState {
    switch (action.type) {
        // UI Actions
        case ActionType.UI_SET_THEME:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    theme: action.payload as 'light' | 'dark' | 'system'
                }
            };
            
        case ActionType.UI_TOGGLE_SIDEBAR:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    isSidebarVisible: !state.ui.isSidebarVisible
                }
            };
            
        case ActionType.UI_SET_ACTIVE_VIEW:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    activeView: action.payload as string
                }
            };
            
        case ActionType.UI_SET_LOADING:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    isLoading: action.payload as boolean
                }
            };
            
        case ActionType.UI_SET_ERROR:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    error: action.payload as string | null
                }
            };
            
        case ActionType.UI_CLEAR_ERROR:
            return {
                ...state,
                ui: {
                    ...state.ui,
                    error: null
                }
            };
            
        // Chat Actions
        case ActionType.CHAT_SET_MESSAGES:
            return {
                ...state,
                chat: {
                    ...state.chat,
                    messages: action.payload as any[]
                }
            };
            
        case ActionType.CHAT_ADD_MESSAGE:
            return {
                ...state,
                chat: {
                    ...state.chat,
                    messages: [...state.chat.messages, action.payload]
                }
            };
            
        case ActionType.CHAT_CLEAR_MESSAGES:
            return {
                ...state,
                chat: {
                    ...state.chat,
                    messages: []
                }
            };
            
        case ActionType.CHAT_SET_ACTIVE_SESSION:
            return {
                ...state,
                chat: {
                    ...state.chat,
                    activeSessionId: action.payload as string
                }
            };
            
        case ActionType.CHAT_CREATE_SESSION:
            return {
                ...state,
                chat: {
                    ...state.chat,
                    sessions: [...state.chat.sessions, action.payload],
                    activeSessionId: (action.payload as any).id
                }
            };
            
        case ActionType.CHAT_DELETE_SESSION:
            return {
                ...state,
                chat: {
                    ...state.chat,
                    sessions: state.chat.sessions.filter(session => session.id !== action.payload),
                    activeSessionId: state.chat.sessions.length > 1 
                        ? (state.chat.activeSessionId === action.payload 
                            ? state.chat.sessions.find(s => s.id !== action.payload)?.id || null 
                            : state.chat.activeSessionId)
                        : null
                }
            };
            
        case ActionType.CHAT_SET_INPUT_TEXT:
            return {
                ...state,
                chat: {
                    ...state.chat,
                    inputText: action.payload as string
                }
            };
            
        case ActionType.CHAT_SET_PROCESSING:
            return {
                ...state,
                chat: {
                    ...state.chat,
                    isProcessing: action.payload as boolean
                }
            };
            
        // Settings Actions
        case ActionType.SETTINGS_SET_MODEL:
            return {
                ...state,
                settings: {
                    ...state.settings,
                    modelId: action.payload as string
                }
            };
            
        case ActionType.SETTINGS_SET_TEMPERATURE:
            return {
                ...state,
                settings: {
                    ...state.settings,
                    temperature: action.payload as number
                }
            };
            
        case ActionType.SETTINGS_SET_MAX_TOKENS:
            return {
                ...state,
                settings: {
                    ...state.settings,
                    maxTokens: action.payload as number
                }
            };
            
        case ActionType.SETTINGS_SET_TELEMETRY_ENABLED:
            return {
                ...state,
                settings: {
                    ...state.settings,
                    telemetryEnabled: action.payload as boolean
                }
            };
            
        case ActionType.SETTINGS_SET_REQUIRE_CONFIRMATION:
            return {
                ...state,
                settings: {
                    ...state.settings,
                    requireConfirmation: action.payload as boolean
                }
            };
            
        // Terminal Actions
        case ActionType.TERMINAL_SET_OUTPUT:
            return {
                ...state,
                terminal: {
                    ...state.terminal,
                    output: action.payload as string
                }
            };
            
        case ActionType.TERMINAL_CLEAR_OUTPUT:
            return {
                ...state,
                terminal: {
                    ...state.terminal,
                    output: ''
                }
            };
            
        case ActionType.TERMINAL_EXECUTE_COMMAND:
            return {
                ...state,
                terminal: {
                    ...state.terminal,
                    isExecuting: true,
                    commandHistory: [
                        action.payload as string,
                        ...state.terminal.commandHistory.slice(0, 49)
                    ]
                }
            };
            
        // Editor Actions
        case ActionType.EDITOR_SET_ACTIVE_FILE:
            return {
                ...state,
                editor: {
                    ...state.editor,
                    activeFile: action.payload as string
                }
            };
            
        case ActionType.EDITOR_UPDATE_CONTENT:
            return {
                ...state,
                editor: {
                    ...state.editor,
                    content: action.payload as string
                }
            };
            
        case ActionType.EDITOR_SET_SELECTION:
            return {
                ...state,
                editor: {
                    ...state.editor,
                    selection: action.payload as { start: number; end: number }
                }
            };
            
        // AI Actions
        case ActionType.AI_START_COMPLETION:
            return {
                ...state,
                ai: {
                    ...state.ai,
                    prompt: action.payload as string,
                    completion: null,
                    error: null,
                    isStreaming: false
                }
            };
            
        case ActionType.AI_RECEIVE_COMPLETION:
            return {
                ...state,
                ai: {
                    ...state.ai,
                    completion: action.payload as string,
                    isStreaming: false
                }
            };
            
        case ActionType.AI_COMPLETION_ERROR:
            return {
                ...state,
                ai: {
                    ...state.ai,
                    error: action.payload as string,
                    isStreaming: false
                }
            };
            
        case ActionType.AI_SET_STREAMING:
            return {
                ...state,
                ai: {
                    ...state.ai,
                    isStreaming: action.payload as boolean
                }
            };
            
        // Auth Actions
        case ActionType.AUTH_LOGIN:
            return {
                ...state,
                auth: {
                    ...state.auth,
                    apiKey: action.payload as string,
                    isAuthenticated: true
                }
            };
            
        case ActionType.AUTH_LOGOUT:
            return {
                ...state,
                auth: {
                    ...state.auth,
                    apiKey: null,
                    isAuthenticated: false
                }
            };
            
        case ActionType.AUTH_SET_API_KEY:
            return {
                ...state,
                auth: {
                    ...state.auth,
                    apiKey: action.payload as string,
                    isAuthenticated: !!action.payload
                }
            };
            
        // Session Actions
        case ActionType.SESSION_INITIALIZE:
            return state;
            
        case ActionType.SESSION_RESET:
            return initialState;
            
        default:
            return state;
    }
} 