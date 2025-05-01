import * as vscode from 'vscode';
import { CodeContext } from '../models/codebase/codeContext';
import { CodeAnalysisService } from '../services/codeAnalysis/codeAnalysisService';

export function useCodeContext() {
    const getCurrentCodeContext = async (): Promise<CodeContext | undefined> => {
        try {
            const codeAnalysisService = CodeAnalysisService.getInstance();
            if (!codeAnalysisService) {
                return undefined;
            }
            
            return await codeAnalysisService.analyzeCurrentDocument();
        } catch (error) {
            console.error('Error getting code context:', error);
            return undefined;
        }
    };

    const getCodeContextByUri = async (uri: vscode.Uri): Promise<CodeContext | undefined> => {
        try {
            const codeAnalysisService = CodeAnalysisService.getInstance();
            if (!codeAnalysisService) {
                return undefined;
            }
            
            return await codeAnalysisService.getFileContext(uri);
        } catch (error) {
            console.error('Error getting code context by URI:', error);
            return undefined;
        }
    };

    const getCodeContextForSelection = async (): Promise<CodeContext | undefined> => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            return undefined;
        }

        const codeContext = await getCurrentCodeContext();
        if (!codeContext) {
            return undefined;
        }

        return {
            ...codeContext,
            hasSelection: true,
            selectedText: editor.document.getText(editor.selection),
            selectionStartLine: editor.selection.start.line,
            selectionEndLine: editor.selection.end.line
        };
    };

    return {
        getCurrentCodeContext,
        getCodeContextByUri,
        getCodeContextForSelection
    };
} 