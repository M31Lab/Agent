import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { GitService, CommitMessageGenerationOptions } from '../../services/git/gitService';

export class GenerateCommitMessageCommand {
  constructor(private context: ExtensionContext) {}

  public register(): vscode.Disposable {
    return vscode.commands.registerCommand('m31-agent.git.generateCommitMessage', async () => {
      try {
        // Initialize GitService if needed
        if (!this.context.gitService) {
          this.context.gitService = GitService.getInstance(this.context);
        }

        // Check if there are staged changes
        const stagedChanges = await this.context.gitService.getStagedChanges();
        if (stagedChanges.length === 0) {
          vscode.window.showWarningMessage(
            'No staged changes found. Please stage your changes before generating a commit message.'
          );
          return;
        }

        // Show progress indicator
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Generating commit message...',
            cancellable: false,
          },
          async () => {
            // Get options for commit message generation
            const options: CommitMessageGenerationOptions = {
              includeSummary: true,
              includeDetails: true,
              useConventionalCommit: true,
            };

            // Generate commit message
            const commitMessage = await this.context.gitService?.generateCommitMessage(options);

            if (!commitMessage) {
              vscode.window.showErrorMessage('Failed to generate commit message.');
              return;
            }

            // Show commit message in input box for editing
            const editedMessage = await vscode.window.showInputBox({
              prompt: 'Review and edit commit message',
              value: commitMessage,
              placeHolder: 'Commit message',
              valueSelection: [
                0,
                commitMessage.indexOf('\n') > 0
                  ? commitMessage.indexOf('\n')
                  : commitMessage.length,
              ],
            });

            if (editedMessage) {
              // Commit changes with edited message
              const success = await this.context.gitService?.commitChanges(editedMessage);
              if (success) {
                vscode.window.showInformationMessage('Changes committed successfully.');

                // Track successful commit
                this.context.telemetryService.trackEvent('git_commit', {
                  messageLength: editedMessage.length.toString(),
                  filesCount: stagedChanges.length.toString(),
                });
              } else {
                vscode.window.showErrorMessage('Failed to commit changes.');
              }
            }
          }
        );
      } catch (error) {
        this.context.loggingService.error('Failed to generate commit message', error);
        vscode.window.showErrorMessage(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }
}
