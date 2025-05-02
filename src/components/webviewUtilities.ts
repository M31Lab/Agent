import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../models/context/extensionContext';
import { LoggingService } from '../utils/logging/loggingService';

export class WebviewUtilities {
    private readonly _extensionContext: ExtensionContext;
    private readonly _logging: LoggingService;

    constructor(extensionContext: ExtensionContext) {
        this._extensionContext = extensionContext;
        this._logging = extensionContext.loggingService;
    }

    public getWebviewUri(webview: vscode.Webview, filePath: string): vscode.Uri {
        const diskPath = vscode.Uri.file(
            path.join(this._extensionContext.extensionPath, filePath)
        );
        
        return webview.asWebviewUri(diskPath);
    }

    public getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public prepareHtmlContent(content: string): string {
        if (!content) {
            this._logging.warning('Empty content provided to prepare HTML');
            return '';
        }

        const nonce = this.getNonce();
        
        // Add CSP and nonce to script tags
        if (!content.includes('<meta http-equiv="Content-Security-Policy"')) {
            const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}'; style-src vscode-resource: 'unsafe-inline' https:;">`;
            content = content.replace(/<head>/i, `<head>\n\t${cspMeta}`);
        }

        // Replace script tags with nonce
        content = content.replace(/<script/g, `<script nonce="${nonce}"`);
        
        return content;
    }

    public createScriptTag(scriptPath: string, webview: vscode.Webview, inline = false): string {
        if (inline) {
            return `<script nonce="${this.getNonce()}" src="${this.getWebviewUri(webview, scriptPath)}"></script>`;
        }
        
        return `<script nonce="${this.getNonce()}" src="${this.getWebviewUri(webview, scriptPath)}"></script>`;
    }

    public createStyleTag(stylePath: string, webview: vscode.Webview, inline = false): string {
        if (inline) {
            return `<link rel="stylesheet" href="${this.getWebviewUri(webview, stylePath)}">`;
        }
        
        return `<link rel="stylesheet" href="${this.getWebviewUri(webview, stylePath)}">`;
    }

    public getBaseWebviewHtml(title: string): string {
        const nonce = this.getNonce();
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}'; style-src vscode-resource: 'unsafe-inline' https:;">
            <title>${title}</title>
        </head>
        <body>
            <div id="root"></div>
        </body>
        </html>`;
    }

    public createMessageHandler(nonce: string): string {
        return `
        <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            window.addEventListener('message', event => {
                const message = event.data;
                // Handle message here
            });
            
            function sendMessage(message) {
                vscode.postMessage(message);
            }
        </script>`;
    }
} 