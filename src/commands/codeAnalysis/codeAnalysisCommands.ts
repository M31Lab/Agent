import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { AnalyzeCodebaseCommand } from './analyzeCodebaseCommand';

export function registerCodeAnalysisCommands(context: ExtensionContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Register analyze codebase command
  const analyzeCodebaseCommand = new AnalyzeCodebaseCommand(context);
  disposables.push(analyzeCodebaseCommand.register());

  // Register the command in package.json
  // Note: this should be added to the package.json file:
  /*
    "contributes": {
        "commands": [
            {
                "command": "m31-agent.codeAnalysis.analyzeCodebase",
                "title": "Analyze Codebase Structure",
                "category": "M31 Agent"
            }
        ]
    }
    */

  return disposables;
}
