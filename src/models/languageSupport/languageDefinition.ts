export interface ILanguageDefinition {
    id: string;
    name: string;
    extensions: string[];
    lineCommentToken: string;
    blockCommentStart: string;
    blockCommentEnd: string;
    defaultFileExtension: string;
    indentationSize: number;
    usesSemicolons: boolean;
    usesImports: boolean;
    standardModules: string[];
} 