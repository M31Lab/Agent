import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { ChatRole } from '../../models/ai/chatTypes';

export class AddLogsCommand {
  private apiClient: OpenRouterApiClient;

  constructor(private context: ExtensionContext) {
    this.apiClient = OpenRouterApiClient.getInstance();
  }

  public register(): vscode.Disposable {
    return vscode.commands.registerCommand('m31-agent.code.addLogs', async () => {
      try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showWarningMessage('No active editor found.');
          return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
          vscode.window.showWarningMessage('Please select code to add logs to.');
          return;
        }

        // Get selected text
        const selectedText = editor.document.getText(selection);
        if (!selectedText) {
          vscode.window.showWarningMessage('Selected text is empty.');
          return;
        }

        // Determine the language
        const languageId = editor.document.languageId;

        // Show progress indicator
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Adding logs...',
            cancellable: false,
          },
          async () => {
            // Generate code with logs
            const codeWithLogs = await this.addLogsToCode(selectedText, languageId);

            // Replace selected text with code with logs
            await editor.edit((editBuilder) => {
              editBuilder.replace(selection, codeWithLogs);
            });

            vscode.window.showInformationMessage('Logs added successfully.');

            // Track event
            this.context.telemetryService.trackEvent('add_logs', {
              language: languageId,
              codeLength: selectedText.length.toString(),
            });
          }
        );
      } catch (error) {
        this.context.loggingService.error('Failed to add logs', error);
        vscode.window.showErrorMessage(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async addLogsToCode(code: string, language: string): Promise<string> {
    // Create a prompt for AI to add logs
    const prompt = `Add appropriate logging statements to the following ${language} code. 
Use the most idiomatic logging approach for ${language}.
For JavaScript/TypeScript, use console.log.
For Python, use print or logging.
For Java, use System.out.println or a logger.
For other languages, use the appropriate logging mechanism.
Preserve all functionality and add meaningful log messages that help understand the code flow.
Make sure the code is valid and executable.

Code to add logs to:
\`\`\`${language}
${code}
\`\`\``;

    try {
      const response = await this.apiClient.generateChatCompletion(
        [
          {
            role: ChatRole.System,
            content:
              'You are a helpful coding assistant that adds appropriate logging statements to code while preserving all functionality.',
          },
          {
            role: ChatRole.User,
            content: prompt,
          },
        ],
        {}
      );

      const content = response.choices[0].message.content.trim();

      // Extract code from markdown code blocks if present
      const codeRegex = new RegExp(`\`\`\`(?:${language})?(.*?)\`\`\``, 's');
      const match = content.match(codeRegex);

      if (match && match[1]) {
        return match[1].trim();
      }

      return content;
    } catch (error) {
      this.context.loggingService.error('Failed to add logs to code', error);
      throw new Error(
        'Failed to add logs to code: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  }
}
