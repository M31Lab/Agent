/**
 * Interface for messages sent from webview to extension
 */
export interface WebviewToExtensionMessage {
    command: string;
    [key: string]: any;
}

/**
 * Interface for messages sent from extension to webview
 */
export interface ExtensionToWebviewMessage {
    command: string;
    [key: string]: any;
}

/**
 * Interface for chat message
 */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: number;
    id?: string;
}

/**
 * Types of messages that can be sent from webview to extension
 */
export enum WebviewCommand {
    SendMessage = 'sendMessage',
    ClearChat = 'clearChat',
    WebviewReady = 'webviewReady',
    CopyToClipboard = 'copyToClipboard',
    InsertCode = 'insertCode',
    RequestModels = 'requestModels'
}

/**
 * Types of messages that can be sent from extension to webview
 */
export enum ExtensionCommand {
    Initialize = 'initialize',
    ReceiveMessage = 'receiveMessage',
    ClearChat = 'clearChat',
    SetProcessing = 'setProcessing',
    ShowError = 'showError',
    UpdateModels = 'updateModels',
    UpdateSettings = 'updateSettings'
}

/**
 * Interface for handler callbacks
 */
export interface MessageHandlers {
    [WebviewCommand.SendMessage]?: (message: string) => Promise<void>;
    [WebviewCommand.ClearChat]?: () => void;
    [WebviewCommand.WebviewReady]?: () => void;
    [WebviewCommand.CopyToClipboard]?: (text: string) => void;
    [WebviewCommand.InsertCode]?: (code: string) => void;
    [WebviewCommand.RequestModels]?: () => void;
} 