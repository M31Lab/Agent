export enum WebviewMessageType {
    Initialize = 'initialize',
    UpdateConfig = 'updateConfig',
    UserMessage = 'userMessage',
    Message = 'message',
    ThinkingStart = 'thinkingStart',
    ThinkingEnd = 'thinkingEnd',
    Error = 'error',
    ClearChat = 'clearChat',
    FocusInput = 'focusInput',
    CancelRequest = 'cancelRequest',
    ExecuteCommand = 'executeCommand',
    UpdateStreamContent = 'updateStreamContent',
    DisplayError = 'displayError'
} 