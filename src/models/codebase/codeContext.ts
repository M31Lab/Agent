export interface CodeContext {
    fileName: string;
    filePath: string;
    languageId: string;
    fileContent: string;
    hasSelection: boolean;
    selectedText: string;
    selectionStartLine: number;
    selectionEndLine: number;
    lineCount: number;
    cursorLine: number;
    cursorCharacter: number;
} 