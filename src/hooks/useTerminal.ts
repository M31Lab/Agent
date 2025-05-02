import { TerminalService } from '../services/terminal/terminalService';



export function useTerminal(): {
    getTerminalService: () => TerminalService | undefined;
    executeCommand: (command: string) => Promise<void>;
    executeCommandWithResult: (command: string) => Promise<string>;
} {
    const getTerminalService = (): TerminalService | undefined => {
        return TerminalService.getInstance();
    };

    const executeCommand = async (command: string): Promise<void> => {
        const terminal = getTerminalService();
        if (!terminal) {
            throw new Error('Terminal service not initialized');
        }

        // Create a session and execute the command
        const sessionId = terminal.createSession();
        try {
            await terminal.executeCommand(sessionId, command);
        } finally {
            // Clean up the session when done
            terminal.closeSession(sessionId);
        }
    };

    const executeCommandWithResult = async (command: string): Promise<string> => {
        const terminal = getTerminalService();
        if (!terminal) {
            throw new Error('Terminal service not initialized');
        }

        const result = await terminal.executeCommandWithOutput(command);
        return result.output;
    };

    return {
        getTerminalService,
        executeCommand,
        executeCommandWithResult
    };
}