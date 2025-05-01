import { TerminalService } from '../services/terminal/terminalService';

export function useTerminal() {
    const getTerminalService = (): TerminalService | undefined => {
        return TerminalService.getInstance();
    };

    const executeCommand = async (command: string): Promise<void> => {
        const terminal = getTerminalService();
        if (!terminal) {
            throw new Error('Terminal service not initialized');
        }

        return terminal.executeCommand(command);
    };

    const executeCommandWithResult = async (command: string): Promise<string> => {
        const terminal = getTerminalService();
        if (!terminal) {
            throw new Error('Terminal service not initialized');
        }

        return terminal.executeCommandWithResult(command);
    };

    return {
        getTerminalService,
        executeCommand,
        executeCommandWithResult
    };
} 