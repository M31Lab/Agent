export interface LanguageFeatures {
    hasTypes: boolean;
    isCompiled: boolean;
    hasClasses: boolean;
    hasFunctions: boolean;
    hasModules: boolean;
    commentStart: string;
    commentEnd: string;
    blockCommentStart: string;
    blockCommentEnd: string;
    lineEnd: string;
} 