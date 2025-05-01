import { Disposable } from 'vscode';
import { SupportedLanguage } from '../../../models/languageSupport/supportedLanguage';
import { LanguageFeatures } from '../../../models/languageSupport/languageFeatures';

export interface ILanguageSupportService extends Disposable {
    isLanguageSupported(languageId: string): boolean;
    getSupportedLanguage(languageId: string): SupportedLanguage | undefined;
    getAllSupportedLanguages(): SupportedLanguage[];
    getLanguageFeatures(languageId: string): LanguageFeatures | undefined;
    getFileExtensionsForLanguage(languageId: string): string[];
    getLanguageIdFromFileName(fileName: string): string | undefined;
} 