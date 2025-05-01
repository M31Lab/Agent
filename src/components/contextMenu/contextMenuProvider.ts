import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';

export class ContextMenuProvider {
    private static instance: ContextMenuProvider;
    private context: ExtensionContext;
    private disposables: vscode.Disposable[] = [];

    constructor(context: ExtensionContext) {
        this.context = context;
        ContextMenuProvider.instance = this;
    }

    public static getInstance(): ContextMenuProvider {
        if (!ContextMenuProvider.instance) {
            throw new Error('ContextMenuProvider not initialized');
        }
        return ContextMenuProvider.instance;
    }

    public initialize(): void {
        this.registerEditorContextMenu();
        this.registerExplorerContextMenu();
        this.context.loggingService.debug('Context menu provider initialized');
    }

    private registerEditorContextMenu(): void {
        this.context.loggingService.debug('Registering editor context menu items');
        
        const editorContextMenuItems = [
            {
                command: 'm31-agent.explainCode',
                when: 'editorTextFocus && editorHasSelection'
            },
            {
                command: 'm31-agent.refactorCode',
                when: 'editorTextFocus && editorHasSelection'
            },
            {
                command: 'm31-agent.fixCode',
                when: 'editorTextFocus && editorHasSelection'
            }
        ];

        for (const item of editorContextMenuItems) {
            this.context.registerDisposable(
                vscode.commands.registerCommand(`${item.command}.context`, () => {
                    vscode.commands.executeCommand(item.command);
                })
            );
        }
    }

    private registerExplorerContextMenu(): void {
        this.context.loggingService.debug('Registering explorer context menu items');
        
        const explorerContextMenuItems = [
            {
                command: 'm31-agent.analyzeFile',
                when: 'resourceLangId'
            },
            {
                command: 'm31-agent.generateTests',
                when: 'resourceLangId'
            }
        ];

        for (const item of explorerContextMenuItems) {
            this.context.registerDisposable(
                vscode.commands.registerCommand(`${item.command}.context`, (uri: vscode.Uri) => {
                    vscode.commands.executeCommand(item.command, uri);
                })
            );
        }
    }

    public registerContextMenuCommand(
        commandId: string,
        callback: (...args: any[]) => any,
        when: string
    ): vscode.Disposable {
        const disposable = vscode.commands.registerCommand(`${commandId}.context`, callback);
        this.disposables.push(disposable);
        return disposable;
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        ContextMenuProvider.instance = undefined as any;
    }
} 