import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext } from '../models/context/extensionContext';

export class WebviewProvider implements vscode.Disposable {
    private static instance: WebviewProvider | undefined;
    private context: ExtensionContext;
    private templatePath: string;
    private disposables: vscode.Disposable[] = [];

    constructor(context: ExtensionContext) {
        this.context = context;
        this.templatePath = path.join(context.extensionPath, 'src', 'webview', 'template.html');
        WebviewProvider.instance = this;
    }

    public static getInstance(): WebviewProvider | undefined {
        return WebviewProvider.instance;
    }

    /**
     * Creates a new webview panel
     */
    public createWebviewPanel(viewType: string, title: string, showOptions: vscode.ViewColumn, options: vscode.WebviewPanelOptions & vscode.WebviewOptions): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            viewType,
            title,
            showOptions,
            {
                ...options,
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        return panel;
    }

    /**
     * Renders the HTML template with the provided data
     */
    public async renderTemplate(webview: vscode.Webview, data: Record<string, string> = {}): Promise<string> {
        try {
            const templateContent = await fs.promises.readFile(this.templatePath, 'utf8');

            // Get paths for script and style resources
            const scriptUri = this.getWebviewResourceUri(webview, 'dist', 'webview.js');
            const stylesUri = this.getWebviewResourceUri(webview, 'dist', 'webview.css');

            // Replace placeholders in the template
            let renderedContent = templateContent
                .replace('{{scriptUri}}', scriptUri.toString())
                .replace('{{stylesUri}}', stylesUri.toString());

            // Replace other custom placeholder values
            for (const [key, value] of Object.entries(data)) {
                renderedContent = renderedContent.replace(`{{${key}}}`, value);
            }

            return renderedContent;
        } catch (error) {
            this.context.loggingService.error('Failed to render template', error);
            throw new Error(`Failed to render webview template: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Gets a URI that the webview can use to load resources
     */
    public getWebviewResourceUri(webview: vscode.Webview, ...pathSegments: string[]): vscode.Uri {
        return webview.asWebviewUri(
            vscode.Uri.file(path.join(this.context.extensionPath, ...pathSegments))
        );
    }

    /**
     * Posts a message to the webview
     */
    public postMessageToWebview(webview: vscode.Webview, message: any): void {
        webview.postMessage(message);
    }

    /**
     * Registers a message handler for the webview
     */
    public registerWebviewMessageHandler(
        webviewPanel: vscode.WebviewPanel,
        handler: (message: any) => void
    ): vscode.Disposable {
        const disposable = webviewPanel.webview.onDidReceiveMessage(handler);
        this.disposables.push(disposable);
        return disposable;
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
} 