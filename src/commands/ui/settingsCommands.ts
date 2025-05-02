import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { AuthenticationService } from '../../services/authentication/authenticationService';
import { ConfigurationService } from '../../services/configuration/configurationService';

export function registerSettingsCommands(
  context: ExtensionContext,
  _dependencies: CommandDependencies
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Configure Settings command
  const configureSettings = vscode.commands.registerCommand(
    'm31-agent.configureSettings',
    async () => {
      context.loggingService.info('Executing command: m31-agent.configureSettings');
      context.telemetryService.trackEvent('configureSettings');

      const options = [
        'Configure API Key',
        'Select AI Model',
        'Configure AI Parameters',
        'Toggle Telemetry',
        'View Logs',
      ];

      const selection = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select a setting to configure',
      });

      if (!selection) {
        return;
      }

      switch (selection) {
        case 'Configure API Key':
          await configureApiKey(context);
          break;
        case 'Select AI Model':
          await selectAiModel(context);
          break;
        case 'Configure AI Parameters':
          configureAiParameters(context);
          break;
        case 'Toggle Telemetry':
          toggleTelemetry(context);
          break;
        case 'View Logs':
          viewLogs(context);
          break;
      }
    }
  );
  disposables.push(configureSettings);

  return disposables;
}

async function configureApiKey(_context: ExtensionContext): Promise<void> {
  const authService = AuthenticationService.getInstance();
  if (!authService) {
    vscode.window.showErrorMessage('Authentication service not initialized');
    return;
  }

  await (authService as unknown).authenticate();
}

async function selectAiModel(_context: ExtensionContext): Promise<void> {
  const configService = ConfigurationService.getInstance();
  if (!configService) {
    vscode.window.showErrorMessage('Configuration service not initialized');
    return;
  }

  const models = [
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-opus',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3-haiku',
    'google/gemini-pro',
  ];

  const selection = await vscode.window.showQuickPick(
    models.map((model) => ({ label: model })),
    {
      placeHolder: 'Select an AI model',
    }
  );

  if (!selection) {
    return;
  }

  await vscode.workspace
    .getConfiguration('m31-agent')
    .update('modelId', selection.label, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`AI model set to ${selection.label}`);
}

function configureAiParameters(_context: ExtensionContext): void {
  vscode.commands.executeCommand('workbench.action.openSettings', 'm31-agent');
}

function toggleTelemetry(_context: ExtensionContext): void {
  const configService = ConfigurationService.getInstance();
  if (!configService) {
    vscode.window.showErrorMessage('Configuration service not initialized');
    return;
  }

  const currentSetting = (configService as unknown).getConfiguration('enableTelemetry', true);
  vscode.workspace
    .getConfiguration('m31-agent')
    .update('enableTelemetry', !currentSetting, vscode.ConfigurationTarget.Global);

  vscode.window.showInformationMessage(`Telemetry ${!currentSetting ? 'enabled' : 'disabled'}`);
}

function viewLogs(_context: ExtensionContext): void {
  _context.loggingService.info('Showing logs');
  (_context.loggingService as unknown).showOutputChannel
    ? (_context.loggingService as unknown).showOutputChannel()
    : vscode.window.showInformationMessage('Logs are available in the Output panel');
}
