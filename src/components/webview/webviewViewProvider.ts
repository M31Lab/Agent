import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { 
    getNonce, 
    getWebviewResourceUri, 
    createWebviewMessageBus
} from './webviewUtilities';

export interface WebviewViewOptions {
    viewId: string;
    title: string;
    description?: string;
    iconPath?: vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
    retainContextWhenHidden?: boolean;
    messageHandlers?: Record<string, (message: any) => any>;
}

export abstract class BaseWebviewViewProvider implements vscode.WebviewViewProvider {
    protected context: ExtensionContext;
    protected view: vscode.WebviewView | undefined;
    protected options: WebviewViewOptions;
    protected messageListener: vscode.Disposable | undefined;
    protected disposables: vscode.Disposable[] = [];

    constructor(context: ExtensionContext, options: WebviewViewOptions) {
        this.context = context;
        this.options = options;
        
        this.registerView();
    }

    private registerView(): void {
        const disposable = vscode.window.registerWebviewViewProvider(
            this.options.viewId,
            this,
            {
                webviewOptions: {
                    retainContextWhenHidden: this.options.retainContextWhenHidden || false
                }
            }
        );
        
        this.disposables.push(disposable);
        this.context.registerDisposable(disposable);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        this.view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'dist')
            ]
        };
        
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);
        
        if (this.options.messageHandlers) {
            this.messageListener = createWebviewMessageBus(
                webviewView as unknown as vscode.WebviewPanel,
                this.options.messageHandlers
            );
        }
        
        this.onViewReady(webviewView);
    }
    
    protected abstract getHtmlContent(webview: vscode.Webview): string;
    
    protected onViewReady(webviewView: vscode.WebviewView): void {
        // Override in subclasses if needed
    }
    
    protected getNonce(): string {
        return getNonce();
    }
    
    protected getResourceUri(webview: vscode.Webview, ...pathSegments: string[]): vscode.Uri {
        return getWebviewResourceUri(webview, this.context, ...pathSegments);
    }
    
    protected postMessage<T>(type: string, data: T): void {
        if (this.view) {
            this.view.webview.postMessage({ type, data });
        }
    }
    
    public isVisible(): boolean {
        return !!this.view?.visible;
    }
    
    public dispose(): void {
        if (this.messageListener) {
            this.messageListener.dispose();
        }
        
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}

export abstract class SidebarWebviewProvider extends BaseWebviewViewProvider {
    constructor(context: ExtensionContext, options: WebviewViewOptions) {
        super(context, options);
    }
    
    public show(): void {
        vscode.commands.executeCommand(`${this.options.viewId}.focus`);
    }
} 