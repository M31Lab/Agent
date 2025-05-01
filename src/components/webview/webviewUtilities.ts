import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../models/context/extensionContext';

export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function getWebviewResourceUri(
    webview: vscode.Webview,
    context: ExtensionContext,
    ...pathSegments: string[]
): vscode.Uri {
    return webview.asWebviewUri(
        vscode.Uri.joinPath(context.vscodeContext.extensionUri, ...pathSegments)
    );
}

export function getMediaUri(
    webview: vscode.Webview,
    context: ExtensionContext,
    fileName: string
): vscode.Uri {
    return getWebviewResourceUri(webview, context, 'media', fileName);
}

export function getScriptUri(
    webview: vscode.Webview,
    context: ExtensionContext,
    fileName: string
): vscode.Uri {
    return getWebviewResourceUri(webview, context, 'dist', fileName);
}

export function getStyleUri(
    webview: vscode.Webview,
    context: ExtensionContext,
    fileName: string
): vscode.Uri {
    return getWebviewResourceUri(webview, context, 'media', 'css', fileName);
}

export function createBaseWebviewContent(
    webview: vscode.Webview,
    context: ExtensionContext,
    title: string,
    scriptFiles: string[],
    styleFiles: string[],
    bodyContent: string
): string {
    const nonce = getNonce();

    const scripts = scriptFiles
        .map(scriptFile => {
            const scriptUri = getScriptUri(webview, context, scriptFile);
            return `<script nonce="${nonce}" src="${scriptUri}" defer></script>`;
        })
        .join('\n');

    const styles = styleFiles
        .map(styleFile => {
            const styleUri = getStyleUri(webview, context, styleFile);
            return `<link nonce="${nonce}" href="${styleUri}" rel="stylesheet">`;
        })
        .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'nonce-${nonce}';">
    <title>${title}</title>
    ${styles}
</head>
<body>
    ${bodyContent}
    ${scripts}
</body>
</html>`;
}

export function postMessageToWebview<T>(panel: vscode.WebviewPanel, type: string, data: T): void {
    panel.webview.postMessage({ type, data });
}

export function getMessageHandler<T, R>(
    handler: (message: T) => R | Promise<R>,
    responseType: string
): (message: any, panel: vscode.WebviewPanel) => Promise<void> {
    return async (message: any, panel: vscode.WebviewPanel) => {
        try {
            const response = await handler(message);
            panel.webview.postMessage({
                type: responseType,
                data: response,
                requestId: message.requestId
            });
        } catch (error) {
            panel.webview.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : String(error),
                requestId: message.requestId
            });
        }
    };
}

export function createWebviewMessageBus(
    panel: vscode.WebviewPanel,
    handlers: Record<string, (message: any) => any>
): vscode.Disposable {
    const messageListener = panel.webview.onDidReceiveMessage(async (message) => {
        const { type, data, requestId } = message;
        
        if (handlers[type]) {
            try {
                const result = await handlers[type](data);
                
                panel.webview.postMessage({
                    type: `${type}_response`,
                    data: result,
                    requestId
                });
            } catch (error) {
                panel.webview.postMessage({
                    type: 'error',
                    error: error instanceof Error ? error.message : String(error),
                    requestId
                });
            }
        }
    });
    
    return messageListener;
} 