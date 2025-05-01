import * as vscode from 'vscode';
import { ExtensionContext } from '../models/context/extensionContext';
import { LoggingService } from '../utils/logging/loggingService';

export interface ContextMenuItem {
    id: string;
    command: string;
    title: string;
    when?: string;
    icon?: { light: string; dark: string };
}

export interface ContextMenuGroup {
    id: string;
    items: ContextMenuItem[];
}

export class ContextMenuProvider implements vscode.Disposable {
    private readonly _disposables: vscode.Disposable[] = [];
    private readonly _contextMenuItems: Map<string, ContextMenuItem[]> = new Map();
    private readonly _logging: LoggingService;

    constructor(private readonly _extensionContext: ExtensionContext) {
        this._logging = _extensionContext.loggingService;
    }

    public registerEditorContextMenu(item: ContextMenuItem): void {
        const editorItems = this._contextMenuItems.get('editor') || [];
        editorItems.push(item);
        this._contextMenuItems.set('editor', editorItems);
        
        this._logging.debug(`Registered editor context menu item: ${item.id}`);
    }
    
    public registerExplorerContextMenu(item: ContextMenuItem): void {
        const explorerItems = this._contextMenuItems.get('explorer') || [];
        explorerItems.push(item);
        this._contextMenuItems.set('explorer', explorerItems);
        
        this._logging.debug(`Registered explorer context menu item: ${item.id}`);
    }
    
    public registerContextMenuItem(contextType: string, item: ContextMenuItem): void {
        const items = this._contextMenuItems.get(contextType) || [];
        items.push(item);
        this._contextMenuItems.set(contextType, items);
        
        this._logging.debug(`Registered context menu item: ${item.id} for ${contextType}`);
    }
    
    public getContextMenuItems(contextType: string): ContextMenuItem[] {
        return this._contextMenuItems.get(contextType) || [];
    }
    
    public clearContextMenuItems(contextType: string): void {
        this._contextMenuItems.delete(contextType);
    }
    
    public handleContextMenuAction(actionId: string, editor?: vscode.TextEditor): void {
        for (const [contextType, items] of this._contextMenuItems.entries()) {
            const item = items.find(i => i.id === actionId);
            if (item) {
                this._logging.debug(`Executing context menu action: ${actionId}`);
                vscode.commands.executeCommand(item.command);
                return;
            }
        }
        
        this._logging.warning(`Context menu action not found: ${actionId}`);
    }
    
    public registerContextMenuCommand(item: ContextMenuItem): vscode.Disposable {
        const disposable = vscode.commands.registerCommand(item.command, () => {
            this._logging.debug(`Executing command from context menu: ${item.command}`);
            // Command implementation
        });
        
        this._disposables.push(disposable);
        return disposable;
    }
    
    public dispose(): void {
        this._disposables.forEach(d => d.dispose());
    }
} 