import * as vscode from 'vscode';
import * as path from 'path';
import { useLogging } from '../useLogging';
import { ExtensionContext } from '../../models/context/extensionContext';

export interface FileInfo {
    uri: vscode.Uri;
    fsPath: string;
    fileName: string;
    extension: string;
    languageId: string;
    workspaceFolder: string | undefined;
    isUntitled: boolean;
    isDirty: boolean;
}

export interface EditorInfo {
    document: vscode.TextDocument | undefined;
    selection: vscode.Selection | undefined;
    selectedText: string;
    cursorPosition: vscode.Position | undefined;
    lineCount: number;
    fileInfo: FileInfo | undefined;
    visibleRanges: readonly vscode.Range[];
}

export interface UseActiveEditorResult {
    editorInfo: EditorInfo;
    isActive: boolean;
    insertText: (text: string, position?: vscode.Position) => Promise<boolean>;
    replaceText: (text: string, range?: vscode.Range) => Promise<boolean>;
    getWordAtPosition: (position?: vscode.Position) => string | undefined;
    getActiveEditor: () => vscode.TextEditor | undefined;
    refresh: () => EditorInfo;
}

export interface ActiveEditorInfo {
    editor: vscode.TextEditor | undefined;
    document: vscode.TextDocument | undefined;
    selection: vscode.Selection | undefined;
    selectedText: string;
    languageId: string;
    fileName: string;
    uri: vscode.Uri | undefined;
    lineCount: number;
    isUntitled: boolean;
}

export function useActiveEditor(
    extensionContext: ExtensionContext
): {
    getActiveEditorInfo: () => ActiveEditorInfo;
    getSelectedText: () => string;
    insertText: (text: string, position?: vscode.Position) => Promise<boolean>;
    replaceSelection: (text: string) => Promise<boolean>;
    getWordAtPosition: (position?: vscode.Position) => string;
    getTextAroundPosition: (position?: vscode.Position, linesBefore?: number, linesAfter?: number) => string;
    getDocumentText: () => string;
} {
    const logging = extensionContext.loggingService;
    const emptyEditorInfo: EditorInfo = {
        document: undefined,
        selection: undefined,
        selectedText: '',
        cursorPosition: undefined,
        lineCount: 0,
        fileInfo: undefined,
        visibleRanges: []
    };

    function getActiveEditor(): vscode.TextEditor | undefined {
        return vscode.window.activeTextEditor;
    }

    function getFileInfo(document: vscode.TextDocument): FileInfo | undefined {
        if (!document) {
            return undefined;
        }

        const uri = document.uri;
        const fsPath = uri.fsPath;
        const fileName = path.basename(fsPath);
        const extension = path.extname(fsPath).slice(1);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath;

        return {
            uri,
            fsPath,
            fileName,
            extension,
            languageId: document.languageId,
            workspaceFolder,
            isUntitled: document.isUntitled,
            isDirty: document.isDirty
        };
    }

    function getCurrentEditorInfo(): EditorInfo {
        const editor = getActiveEditor();
        
        if (!editor) {
            return emptyEditorInfo;
        }

        const document = editor.document;
        const selection = editor.selection;
        const selectedText = document.getText(selection);
        const cursorPosition = selection.active;
        const lineCount = document.lineCount;
        const fileInfo = getFileInfo(document);
        const visibleRanges = editor.visibleRanges;

        return {
            document,
            selection,
            selectedText,
            cursorPosition,
            lineCount,
            fileInfo,
            visibleRanges
        };
    }

    async function insertText(text: string, position?: vscode.Position): Promise<boolean> {
        const editor = getActiveEditor();
        if (!editor) {
            logging.warning('No active editor to insert text into');
            return false;
        }

        try {
            const insertPosition = position || editor.selection.active;
            await editor.edit(editBuilder => {
                editBuilder.insert(insertPosition, text);
            });
            return true;
        } catch (error) {
            logging.error('Failed to insert text into editor', error);
            return false;
        }
    }

    async function replaceText(text: string, range?: vscode.Range): Promise<boolean> {
        const editor = getActiveEditor();
        if (!editor) {
            logging.warning('No active editor to replace text in');
            return false;
        }

        try {
            const replaceRange = range || editor.selection;
            await editor.edit(editBuilder => {
                editBuilder.replace(replaceRange, text);
            });
            return true;
        } catch (error) {
            logging.error('Failed to replace text in editor', error);
            return false;
        }
    }

    function getWordAtPosition(position?: vscode.Position): string | undefined {
        const editor = getActiveEditor();
        if (!editor || !editor.document) {
            return undefined;
        }

        const document = editor.document;
        const pos = position || editor.selection.active;
        const wordRange = document.getWordRangeAtPosition(pos);
        
        if (wordRange) {
            return document.getText(wordRange);
        }
        
        return undefined;
    }

    function getActiveEditorInfo(): ActiveEditorInfo {
        const editor = vscode.window.activeTextEditor;
        const document = editor?.document;
        const selection = editor?.selection;
        const selectedText = selection ? document?.getText(selection) || '' : '';
        const languageId = document?.languageId || '';
        const fileName = document?.fileName || '';
        const uri = document?.uri;
        const lineCount = document?.lineCount || 0;
        const isUntitled = document?.isUntitled || false;

        return {
            editor,
            document,
            selection,
            selectedText,
            languageId,
            fileName,
            uri,
            lineCount,
            isUntitled
        };
    }

    function getSelectedText(): string {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return '';
        }

        const selection = editor.selection;
        if (!selection || selection.isEmpty) {
            return '';
        }

        return editor.document.getText(selection);
    }

    function getTextAroundPosition(
        position?: vscode.Position, 
        linesBefore: number = 2, 
        linesAfter: number = 2
    ): string {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return '';
        }

        const document = editor.document;
        const pos = position || editor.selection.active;
        
        const startLine = Math.max(0, pos.line - linesBefore);
        const endLine = Math.min(document.lineCount - 1, pos.line + linesAfter);
        
        const startPos = new vscode.Position(startLine, 0);
        const endPos = new vscode.Position(endLine, document.lineAt(endLine).text.length);
        
        const range = new vscode.Range(startPos, endPos);
        return document.getText(range);
    }

    function getDocumentText(): string {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return '';
        }
        
        return editor.document.getText();
    }

    const editorInfo = getCurrentEditorInfo();
    const isActive = !!getActiveEditor();

    return {
        getActiveEditorInfo,
        getSelectedText,
        insertText,
        replaceSelection,
        getWordAtPosition,
        getTextAroundPosition,
        getDocumentText
    };
} 