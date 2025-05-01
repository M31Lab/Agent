import { LanguageFeatures } from './languageFeatures';

export interface SupportedLanguage {
    id: string;
    name: string;
    fileExtensions: string[];
    features: LanguageFeatures;
} 