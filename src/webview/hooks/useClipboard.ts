import { useCallback, useState } from 'react';
import { useVsCodeApi } from './useVsCodeApi';
import { WebviewCommand } from '../interfaces/messageHandlers';

export interface UseClipboardOptions {
    showFeedback?: boolean;
    feedbackDuration?: number;
    onCopy?: (text: string) => void;
    onError?: (error: Error) => void;
}

export interface UseClipboardResult {
    copyToClipboard: (text: string) => boolean;
    insertToEditor: (code: string) => boolean;
    hasCopied: boolean;
}

export const useClipboard = (options: UseClipboardOptions = {}): UseClipboardResult  => {
    const [hasCopied, setHasCopied] = useState(false);
    const vscode = useVsCodeApi();
    
    const defaultOptions: Required<UseClipboardOptions> = {
        showFeedback: true,
        feedbackDuration: 2000,
        onCopy: () => {},
        onError: () => {},
        ...options
    };
    
    const copyToClipboard = useCallback((text: string) => {
        try {
            vscode.postMessage({
                command: WebviewCommand.CopyToClipboard,
                text
            });
            
            if (defaultOptions.showFeedback) {
                setHasCopied(true);
                
                setTimeout(() => {
                    setHasCopied(false);
                }, defaultOptions.feedbackDuration);
            }
            
            defaultOptions.onCopy(text);
            return true;
        } catch (error) {
            defaultOptions.onError(error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }, [vscode, defaultOptions]);
    
    const insertToEditor = useCallback((code: string) => {
        try {
            vscode.postMessage({
                command: WebviewCommand.InsertCode,
                code
            });
            return true;
        } catch (error) {
            defaultOptions.onError(error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }, [vscode, defaultOptions]);
    
    return {
        copyToClipboard,
        insertToEditor,
        hasCopied
    };
}; 