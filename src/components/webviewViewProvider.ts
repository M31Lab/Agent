import * as vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { LoggingService } from '../utils/logging/loggingService';
import { WebviewUtilities } from './webviewUtilities';

export interface WebviewMessage {
    command: string;
    [key: string]: any;
}

export interface WebviewState {
    [key: string]: any;
}

export abstract class BaseWebviewViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    protected readonly viewId: string;
    protected readonly extensionContext: ExtensionContext;
    protected readonly logging: LoggingService;
    protected readonly webviewUtils: WebviewUtilities;
    protected view?: vscode.WebviewView;
    protected state: WebviewState = {};
    protected readonly disposables: vscode.Disposable[] = [];

    private _onDidChangeState = new vscode.EventEmitter<WebviewState>();
    public readonly onDidChangeState = this._onDidChangeState.event;

    constructor(viewId: string, extensionContext: ExtensionContext) {
        this.viewId = viewId;
        this.extensionContext = extensionContext;
        this.logging = extensionContext.loggingService;
        this.webviewUtils = new WebviewUtilities(extensionContext);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        this.view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(this.extensionContext.extensionPath)
            ]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            (message: WebviewMessage) => this.handleMessage(message),
            null,
            this.disposables
        );

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.onViewVisible();
            } else {
                this.onViewHidden();
            }
        });

        if (webviewView.visible) {
            this.onViewVisible();
        }
    }

    protected setState(newState: Partial<WebviewState>): void {
        this.state = { ...this.state, ...newState };
        this._onDidChangeState.fire(this.state);
        
        if (this.view) {
            this.view.webview.postMessage({
                command: 'setState',
                state: newState
            });
        }
    }

    protected postMessage(message: WebviewMessage): Thenable<boolean> | undefined {
        if (this.view) {
            return this.view.webview.postMessage(message);
        }
        this.logging.warning(`Cannot post message to ${this.viewId}: view not available`);
        return undefined;
    }

    protected onViewVisible(): void {
        this.logging.debug(`WebView ${this.viewId} became visible`);
    }

    protected onViewHidden(): void {
        this.logging.debug(`WebView ${this.viewId} was hidden`);
    }

    protected abstract getHtmlForWebview(webview: vscode.Webview): string;
    
    protected abstract handleMessage(message: WebviewMessage): void;

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this._onDidChangeState.dispose();
    }
}

export abstract class WebviewContentProvider implements vscode.Disposable {
    protected readonly extensionContext: ExtensionContext;
    protected readonly logging: LoggingService;
    protected readonly webviewUtils: WebviewUtilities;
    protected readonly disposables: vscode.Disposable[] = [];

    constructor(extensionContext: ExtensionContext) {
        this.extensionContext = extensionContext;
        this.logging = extensionContext.loggingService;
        this.webviewUtils = new WebviewUtilities(extensionContext);
    }

    protected abstract getHtmlContent(webview: vscode.Webview): string;

    protected getScriptUri(webview: vscode.Webview, scriptPath: string): vscode.Uri {
        return this.webviewUtils.getWebviewUri(webview, scriptPath);
    }

    protected getStyleUri(webview: vscode.Webview, stylePath: string): vscode.Uri {
        return this.webviewUtils.getWebviewUri(webview, stylePath);
    }

    protected getBaseHtml(title: string): string {
        return this.webviewUtils.getBaseWebviewHtml(title);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
} 