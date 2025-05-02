import * as vscode from 'vscode';
import * as axios from 'axios';
import { ExtensionContext } from '../../models/context/extensionContext';

interface ShareCodeResponse {
  url: string;
  id: string;
}

export class CodeShareService implements vscode.Disposable {
  private static instance: CodeShareService | undefined;
  private subscriptions: vscode.Disposable[] = [];
  private shareApiUrl = 'https://paste.m31.ai/api/share'; // Example URL, adjust to actual sharing service

  constructor(private context: ExtensionContext) {}

  public static getInstance(context: ExtensionContext): CodeShareService {
    if (!CodeShareService.instance) {
      CodeShareService.instance = new CodeShareService(context);
    }
    return CodeShareService.instance;
  }

  /**
   * Share code snippet to get a shareable link
   */
  public async shareCode(code: string, language: string, title?: string): Promise<string> {
    try {
      this.context.loggingService.debug('Sharing code snippet');

      const payload = {
        code,
        language,
        title: title || 'Shared with M31-Agent',
        private: false,
      };

      const response = await axios.default.post<ShareCodeResponse>(this.shareApiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.url) {
        this.context.telemetryService.trackEvent('share_code', {
          language,
          codeLength: code.length.toString(),
        });

        return response.data.url;
      } else {
        throw new Error('Invalid response from sharing service');
      }
    } catch (error) {
      this.context.loggingService.error('Failed to share code', error);
      throw new Error(
        'Failed to share code: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  }

  public dispose(): void {
    this.subscriptions.forEach((d) => d.dispose());
    this.subscriptions = [];
  }
}
