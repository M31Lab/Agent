import * as vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { LoggingService } from '../utils/logging/loggingService';
import { WebviewUtilities } from './webviewUtilities';

export type PanelVisibilityChangeEvent = {
    panelId: string;
    isVisible: boolean;
};

export type PanelMessageEvent = {
    panelId: string;
    message: any;
};

export type PanelOptions = {
    id: string;
    title: string;
    viewColumn?: vscode.ViewColumn;
    preserveFocus?: boolean;
    iconPath?: { light: vscode.Uri; dark: vscode.Uri };
    htmlContent: string;
    retainContextWhenHidden?: boolean;
};

export class PanelManager implements vscode.Disposable {
    private readonly _panels: Map<string, vscode.WebviewPanel> = new Map();
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _logging: LoggingService;
    private readonly _webviewUtils: WebviewUtilities;
    private readonly _extensionContext: ExtensionContext;

    private _onPanelVisibilityChanged = new vscode.EventEmitter<PanelVisibilityChangeEvent>();
    public readonly onPanelVisibilityChanged = this._onPanelVisibilityChanged.event;

    private _onPanelMessageReceived = new vscode.EventEmitter<PanelMessageEvent>();
    public readonly onPanelMessageReceived = this._onPanelMessageReceived.event;

    constructor(extensionContext: ExtensionContext) {
        this._extensionContext = extensionContext;
        this._logging = extensionContext.loggingService;
        this._webviewUtils = new WebviewUtilities(extensionContext);
    }

    public createPanel(options: PanelOptions): vscode.WebviewPanel {
        const existingPanel = this._panels.get(options.id);
        if (existingPanel) {
            existingPanel.reveal(options.viewColumn, options.preserveFocus);
            this._logging.debug(`Revealing existing panel: ${options.id}`);
            return existingPanel;
        }

        this._logging.debug(`Creating new panel: ${options.id}`);
        const panel = vscode.window.createWebviewPanel(
            options.id,
            options.title,
            options.viewColumn || vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: options.retainContextWhenHidden || false,
                localResourceRoots: [
                    vscode.Uri.file(this._extensionContext.extensionPath)
                ]
            }
        );

        if (options.iconPath) {
            panel.iconPath = options.iconPath;
        }

        panel.webview.html = this._webviewUtils.prepareHtmlContent(options.htmlContent);

        panel.webview.onDidReceiveMessage(message => {
            this._onPanelMessageReceived.fire({
                panelId: options.id,
                message
            });
        }, null, this._disposables);

        panel.onDidDispose(() => {
            this._panels.delete(options.id);
            this._onPanelVisibilityChanged.fire({
                panelId: options.id,
                isVisible: false
            });
            this._logging.debug(`Panel disposed: ${options.id}`);
        }, null, this._disposables);

        panel.onDidChangeViewState(e => {
            this._onPanelVisibilityChanged.fire({
                panelId: options.id,
                isVisible: e.webviewPanel.visible
            });
            this._logging.debug(`Panel visibility changed: ${options.id}, visible: ${e.webviewPanel.visible}`);
        }, null, this._disposables);

        this._panels.set(options.id, panel);
        return panel;
    }

    public getPanelById(id: string): vscode.WebviewPanel | undefined {
        return this._panels.get(id);
    }

    public closePanel(id: string): void {
        const panel = this._panels.get(id);
        if (panel) {
            panel.dispose();
            this._panels.delete(id);
            this._logging.debug(`Panel closed: ${id}`);
        }
    }

    public sendMessageToPanel(id: string, message: any): void {
        const panel = this._panels.get(id);
        if (panel) {
            panel.webview.postMessage(message);
            this._logging.debug(`Message sent to panel: ${id}`);
        } else {
            this._logging.warning(`Cannot send message to non-existent panel: ${id}`);
        }
    }

    public updatePanelContent(id: string, htmlContent: string): void {
        const panel = this._panels.get(id);
        if (panel) {
            panel.webview.html = this._webviewUtils.prepareHtmlContent(htmlContent);
            this._logging.debug(`Panel content updated: ${id}`);
        } else {
            this._logging.warning(`Cannot update content of non-existent panel: ${id}`);
        }
    }

    public getActivePanels(): string[] {
        return Array.from(this._panels.keys());
    }

    public isPanelVisible(id: string): boolean {
        const panel = this._panels.get(id);
        return panel ? panel.visible : false;
    }

    public dispose(): void {
        this._panels.forEach(panel => panel.dispose());
        this._panels.clear();
        this._disposables.forEach(d => d.dispose());
        this._onPanelVisibilityChanged.dispose();
        this._onPanelMessageReceived.dispose();
    }
} 