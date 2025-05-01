import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';

export enum PanelType {
    Chat = 'chat',
    Settings = 'settings',
    History = 'history',
    ModelInfo = 'modelInfo',
    Logs = 'logs'
}

export interface PanelOptions {
    title: string;
    viewType: string;
    preserveFocus?: boolean;
    showOptions?: vscode.WebviewPanelOptions;
    iconPath?: vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
}

export class PanelManager {
    private static instance: PanelManager;
    private context: ExtensionContext;
    private panels: Map<string, vscode.WebviewPanel> = new Map();

    constructor(context: ExtensionContext) {
        this.context = context;
        PanelManager.instance = this;
    }

    public static getInstance(): PanelManager {
        if (!PanelManager.instance) {
            throw new Error('PanelManager not initialized');
        }
        return PanelManager.instance;
    }

    public initialize(): void {
        this.context.loggingService.debug('Panel manager initialized');
    }

    public createOrShowPanel(
        panelType: PanelType, 
        options: PanelOptions, 
        contentProvider: (webview: vscode.Webview) => string
    ): vscode.WebviewPanel {
        const { title, viewType, preserveFocus, showOptions, iconPath } = options;
        
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : vscode.ViewColumn.One;
        
        if (this.panels.has(panelType)) {
            const panel = this.panels.get(panelType)!;
            panel.reveal(column || vscode.ViewColumn.One, preserveFocus);
            return panel;
        }
        
        const panel = vscode.window.createWebviewPanel(
            viewType,
            title,
            {
                viewColumn: column || vscode.ViewColumn.One,
                preserveFocus: preserveFocus
            },
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media'),
                    vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'dist')
                ]
            }
        );
        
        if (iconPath) {
            panel.iconPath = iconPath;
        }
        
        panel.webview.html = contentProvider(panel.webview);
        
        panel.onDidDispose(() => this.panels.delete(panelType), null, this.context.subscriptions);
        
        this.panels.set(panelType, panel);
        this.context.loggingService.debug(`Panel created: ${panelType}`);
        
        return panel;
    }

    public getPanel(panelType: PanelType): vscode.WebviewPanel | undefined {
        return this.panels.get(panelType);
    }

    public closePanel(panelType: PanelType): void {
        const panel = this.panels.get(panelType);
        if (panel) {
            panel.dispose();
            this.panels.delete(panelType);
            this.context.loggingService.debug(`Panel closed: ${panelType}`);
        }
    }

    public closeAllPanels(): void {
        this.panels.forEach(panel => panel.dispose());
        this.panels.clear();
        this.context.loggingService.debug('All panels closed');
    }

    public dispose(): void {
        this.closeAllPanels();
        PanelManager.instance = undefined as any;
    }
} 