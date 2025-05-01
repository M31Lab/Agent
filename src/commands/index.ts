import { ExtensionContext } from '../models/context/extensionContext';
import { CodeExecutionCommands } from './codeExecution/codeExecutionCommands';
import { StatusBarManager } from '../components/statusBar/statusBarManager';
import { ChatPanelProvider } from '../components/chat/chatPanelProvider';
import { registerCommand, registerAllCommands } from './commandRegistry';
import { registerBrowserCommands } from './browserCommands';
import { registerTerminalCommands } from './terminalCommands';
import { registerCheckpointCommands } from './checkpointCommands';
import { registerContextToolsCommands } from './contextToolsCommands';
import { registerCustomToolsCommands } from './customToolsCommands';

export { 
    registerCommand, 
    registerAllCommands, 
    registerBrowserCommands,
    registerTerminalCommands,
    registerCheckpointCommands,
    registerContextToolsCommands,
    registerCustomToolsCommands
};

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
    if (context.terminalService) {
        const codeExecutionCommands = new CodeExecutionCommands(context, context.terminalService);
        context.registerDisposable(codeExecutionCommands);
    }
    
    // Register agent-specific commands if services are available
    if (context.browserService) {
        registerBrowserCommands(context.vscodeContext, context.browserService);
    }
    
    if (context.terminalService) {
        registerTerminalCommands(context.vscodeContext, context.terminalService);
    }
    
    if (context.checkpointService) {
        registerCheckpointCommands(context.vscodeContext, context.checkpointService);
    }
    
    if (context.contextToolsService) {
        registerContextToolsCommands(context.vscodeContext, context.contextToolsService);
    }
    
    if (context.customToolsService) {
        registerCustomToolsCommands(context.vscodeContext, context.customToolsService);
    }
}

export * from './codeGeneration/explainCodeCommand';
export * from './codeGeneration/generateCodeCommand';
export * from './terminal/runCommandCommand';
export * from './fileSystem/navigateCodebaseCommand';
export * from './ui/configureSettingsCommand'; 