import * as vscode from 'vscode';
import { WebviewProvider } from '../webview/webviewProvider';
import { ChatMessage } from '../webview/interfaces/messageHandlers';

export function useWebview() {
    const getWebviewProvider = (): WebviewProvider | undefined => {
        return WebviewProvider.getInstance();
    };

    const createWebviewPanel = (
        viewType: string,
        title: string,
        showOptions: vscode.ViewColumn,
        options: vscode.WebviewPanelOptions & vscode.WebviewOptions
    ): vscode.WebviewPanel | undefined => {
        const provider = getWebviewProvider();
        if (!provider) {
            return undefined;
        }

        return provider.createWebviewPanel(viewType, title, showOptions, options);
    };

    const renderTemplate = async (
        webview: vscode.Webview,
        data: Record<string, string> = {}
    ): Promise<string | undefined> => {
        const provider = getWebviewProvider();
        if (!provider) {
            return undefined;
        }

        return provider.renderTemplate(webview, data);
    };

    const getWebviewResourceUri = (
        webview: vscode.Webview,
        ...pathSegments: string[]
    ): vscode.Uri | undefined => {
        const provider = getWebviewProvider();
        if (!provider) {
            return undefined;
        }

        return provider.getWebviewResourceUri(webview, ...pathSegments);
    };

    const postMessageToWebview = (webview: vscode.Webview, message: any): void => {
        const provider = getWebviewProvider();
        if (!provider) {
            return;
        }

        provider.postMessageToWebview(webview, message);
    };

    const registerWebviewMessageHandler = (
        webviewPanel: vscode.WebviewPanel,
        handler: (message: any) => void
    ): vscode.Disposable | undefined => {
        const provider = getWebviewProvider();
        if (!provider) {
            return undefined;
        }

        return provider.registerWebviewMessageHandler(webviewPanel, handler);
    };

    const sendChatMessage = (webview: vscode.Webview, message: ChatMessage): void => {
        postMessageToWebview(webview, {
            command: 'receiveMessage',
            message
        });
    };

    const clearChat = (webview: vscode.Webview): void => {
        postMessageToWebview(webview, {
            command: 'clearChat'
        });
    };

    const setProcessingState = (webview: vscode.Webview, isProcessing: boolean): void => {
        postMessageToWebview(webview, {
            command: 'setProcessing',
            isProcessing
        });
    };

    const showError = (webview: vscode.Webview, message: string): void => {
        postMessageToWebview(webview, {
            command: 'showError',
            message
        });
    };

    const initialize = (webview: vscode.Webview, data: any): void => {
        postMessageToWebview(webview, {
            command: 'initialize',
            data
        });
    };

    return {
        getWebviewProvider,
        createWebviewPanel,
        renderTemplate,
        getWebviewResourceUri,
        postMessageToWebview,
        registerWebviewMessageHandler,
        sendChatMessage,
        clearChat,
        setProcessingState,
        showError,
        initialize
    };
} 