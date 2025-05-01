import { ExtensionContext } from '../models/context/extensionContext';
import { registerCodeExecutionCommands } from './codeExecution/codeExecutionCommands';
import { StatusBarManager } from '../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../components/chat/chatPanelProvider';
import { registerCommand, registerAllCommands } from './commandRegistry';

export { registerCommand, registerAllCommands, registerCodeExecutionCommands };

export function registerCommands(
    context: ExtensionContext,
    statusBarManager: StatusBarManager, 
    chatPanelProvider: ChatPanelProvider
): void {
    // Register all commands through the command registry
    registerAllCommands(context, {
        statusBarManager,
        chatPanelProvider
    });
    
    // Register code execution commands separately
    registerCodeExecutionCommands(context);
}

export * from './codeGeneration/explainCodeCommand';
export * from './codeGeneration/generateCodeCommand';
export * from './terminal/runCommandCommand';
export * from './fileSystem/navigateCodebaseCommand';
export * from './ui/configureSettingsCommand'; 