import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('Debug Extension: Starting activation...');
    
    try {
        // Register a simple command
        const disposable = vscode.commands.registerCommand('m31-agent.debug', () => {
            vscode.window.showInformationMessage('Debug command executed successfully!');
        });
        
        context.subscriptions.push(disposable);
        
        console.log('Debug Extension: Activated successfully');
        vscode.window.showInformationMessage('M31 Agent Debug Extension activated successfully');
    } catch (error) {
        console.error('Debug Extension: Activation error:', error);
        vscode.window.showErrorMessage(`Debug Extension activation error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function deactivate(): void {
    console.log('Debug Extension: Deactivated');
} 