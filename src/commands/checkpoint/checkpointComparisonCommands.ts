import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';

export function registerCheckpointComparisonCommands(
  context: ExtensionContext
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  const comparisonService = context.checkpointComparisonService;
  const checkpointService = context.checkpointService;

  if (!comparisonService || !checkpointService) {
    context.loggingService.error('Checkpoint comparison or checkpoint service not initialized');
    return disposables;
  }

  disposables.push(
    vscode.commands.registerCommand('m31-agent.checkpoint.compare', async () => {
      try {
        const checkpoints = checkpointService.getAllCheckpoints().map((cp) => ({
          label: cp.name,
          description: cp.description,
          detail: `Created: ${new Date(cp.timestamp).toLocaleString()}`,
          id: cp.id,
        }));

        if (checkpoints.length === 0) {
          vscode.window.showInformationMessage('No checkpoints found. Create a checkpoint first.');
          return;
        }

        const fromCheckpoint = await vscode.window.showQuickPick(
          [
            {
              label: 'Current Workspace',
              id: 'current',
              description: 'Compare from current workspace state',
            },
            ...checkpoints,
          ],
          {
            placeHolder: 'Compare from (source)',
          }
        );

        if (!fromCheckpoint) {
          return;
        }

        const toCheckpoints =
          fromCheckpoint.id === 'current'
            ? checkpoints
            : [
                {
                  label: 'Current Workspace',
                  id: 'current',
                  description: 'Compare to current workspace state',
                },
                ...checkpoints.filter((cp) => cp.id !== fromCheckpoint.id),
              ];

        const toCheckpoint = await vscode.window.showQuickPick(toCheckpoints, {
          placeHolder: 'Compare to (target)',
        });

        if (!toCheckpoint) {
          return;
        }

        // Show comparison options
        const options = await vscode.window.showQuickPick(
          [
            {
              label: 'Standard Comparison',
              description: 'Standard file comparison',
              includeUnchangedFiles: false,
              showBinaryFiles: false,
            },
            {
              label: 'Detailed Comparison',
              description: 'Include unchanged files',
              includeUnchangedFiles: true,
              showBinaryFiles: false,
            },
            {
              label: 'Complete Comparison',
              description: 'Include unchanged files and binary files',
              includeUnchangedFiles: true,
              showBinaryFiles: true,
            },
          ],
          {
            placeHolder: 'Select comparison options',
          }
        );

        if (!options) {
          return;
        }

        // Open visualization
        await comparisonService.visualizeDiff(fromCheckpoint.id, toCheckpoint.id, {
          includeUnchangedFiles: options.includeUnchangedFiles,
          showBinaryFiles: options.showBinaryFiles,
        });

        // Track telemetry
        context.telemetryService.trackEvent('checkpoint_compared', {
          sourceType: fromCheckpoint.id === 'current' ? 'current' : 'checkpoint',
          targetType: toCheckpoint.id === 'current' ? 'current' : 'checkpoint',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Checkpoint comparison failed: ${errorMessage}`);
      }
    })
  );

  disposables.push(
    vscode.commands.registerCommand('m31-agent.checkpoint.restoreWithOptions', async () => {
      try {
        const checkpoints = checkpointService.getAllCheckpoints().map((cp) => ({
          label: cp.name,
          description: cp.description,
          detail: `Created: ${new Date(cp.timestamp).toLocaleString()}`,
          id: cp.id,
        }));

        if (checkpoints.length === 0) {
          vscode.window.showInformationMessage('No checkpoints found.');
          return;
        }

        const checkpoint = await vscode.window.showQuickPick(checkpoints, {
          placeHolder: 'Select a checkpoint to restore',
        });

        if (!checkpoint) {
          return;
        }

        const options = await vscode.window.showQuickPick(
          [
            {
              label: 'Restore Workspace Only',
              description: 'Restore files without task state',
              restoreTaskState: false,
              restoreTerminalState: false,
              restoreEditorState: true,
            },
            {
              label: 'Restore Task and Workspace',
              description: 'Restore files and task state',
              restoreTaskState: true,
              restoreTerminalState: false,
              restoreEditorState: true,
            },
            {
              label: 'Full Restore',
              description: 'Restore everything (files, task, terminal)',
              restoreTaskState: true,
              restoreTerminalState: true,
              restoreEditorState: true,
            },
          ],
          {
            placeHolder: 'Select restore options',
          }
        );

        if (!options) {
          return;
        }

        const success = await checkpointService.restoreCheckpoint(checkpoint.id, {
          restoreTaskState: options.restoreTaskState,
          restoreTerminalState: options.restoreTerminalState,
          restoreEditorState: options.restoreEditorState,
        });

        if (success) {
          vscode.window.showInformationMessage(
            `Checkpoint ${checkpoint.label} restored successfully`
          );

          // Track telemetry
          context.telemetryService.trackEvent('checkpoint_restored', {
            restoreTaskState: options.restoreTaskState.toString(),
            restoreTerminalState: options.restoreTerminalState.toString(),
            restoreEditorState: options.restoreEditorState.toString(),
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Checkpoint restore failed: ${errorMessage}`);
      }
    })
  );

  return disposables;
}
