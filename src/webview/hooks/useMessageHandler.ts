import { useCallback } from 'react';
import { WebviewCommand, ChatMessage } from '../interfaces/messageHandlers';
import { useVsCodeApi } from './useVsCodeApi';

export type MessageHandlerProps = {
    onReceiveMessage?: (message: ChatMessage) => void;
    onClearChat?: () => void;
    onSetProcessing?: (isProcessing: boolean) => void;
    onShowError?: (error: string) => void;
    onUpdateModels?: (models: unknown[][]) => void;
    onUpdateSettings?: (settings: unknown) => void;
};

export const useMessageHandler = ({
    onReceiveMessage,
    onClearChat,
    onSetProcessing,
    onShowError,
    onUpdateModels,
    onUpdateSettings
}: MessageHandlerProps): {
    handleMessage: (event: MessageEvent) => void;
    sendMessage: (text: string) => void;
    clearChat: () => void;
    webviewReady: () => void;
    copyToClipboard: (text: string) => void;
    insertCode: (code: string) => void;
    requestModels: () => void;
} => {
    const vscode = useVsCodeApi();
    
    const handleMessage = useCallback((event: MessageEvent) => {
        const message = event.data;
        
        switch (message.command) {
            case 'initialize':
                if (message.data?.messages && onReceiveMessage) {
                    message.data.messages.forEach((msg: ChatMessage) => {
                        onReceiveMessage(msg);
                    });
                }
                break;
                
            case 'receiveMessage':
                if (onReceiveMessage && message.message) {
                    onReceiveMessage(message.message);
                }
                break;
                
            case 'clearChat':
                if (onClearChat) {
                    onClearChat();
                }
                break;
                
            case 'setProcessing':
                if (onSetProcessing) {
                    onSetProcessing(message.isProcessing);
                }
                break;
                
            case 'showError':
                if (onShowError && message.message) {
                    onShowError(message.message);
                }
                break;
                
            case 'updateModels':
                if (onUpdateModels && message.models) {
                    onUpdateModels(message.models);
                }
                break;
                
            case 'updateSettings':
                if (onUpdateSettings && message.settings) {
                    onUpdateSettings(message.settings);
                }
                break;
        }
    }, [onReceiveMessage, onClearChat, onSetProcessing, onShowError, onUpdateModels, onUpdateSettings]);
    
    const sendMessage = useCallback((text: string) => {
        vscode.postMessage({
            command: WebviewCommand.SendMessage,
            text
        });
    }, [vscode]);
    
    const clearChat = useCallback(() => {
        vscode.postMessage({
            command: WebviewCommand.ClearChat
        });
    }, [vscode]);
    
    const webviewReady = useCallback(() => {
        vscode.postMessage({
            command: WebviewCommand.WebviewReady
        });
    }, [vscode]);
    
    const copyToClipboard = useCallback((text: string) => {
        vscode.postMessage({
            command: WebviewCommand.CopyToClipboard,
            text
        });
    }, [vscode]);
    
    const insertCode = useCallback((code: string) => {
        vscode.postMessage({
            command: WebviewCommand.InsertCode,
            code
        });
    }, [vscode]);
    
    const requestModels = useCallback(() => {
        vscode.postMessage({
            command: WebviewCommand.RequestModels
        });
    }, [vscode]);
    
    return {
        handleMessage,
        sendMessage,
        clearChat,
        webviewReady,
        copyToClipboard,
        insertCode,
        requestModels
    };
}; 