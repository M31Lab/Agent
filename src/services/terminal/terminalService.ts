import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../../services/telemetry/telemetryService';

export interface TerminalCommand {
    command: string;
    description: string;
    timestamp: number;
    workingDirectory?: string;
    status: 'success' | 'error' | 'pending';
    output?: string;
}

export interface CommandResult {
    output: string;
    exitCode: number | null;
}

export class TerminalService implements vscode.Disposable {
    private static instance: TerminalService;
    private terminals: Map<string, vscode.Terminal> = new Map();
    private activeTerminal: vscode.Terminal | undefined;
    private terminalOutputs: Map<string, string> = new Map();
    private executingCommands: Map<string, boolean> = new Map();
    private readonly disposables: vscode.Disposable[] = [];

    private readonly _extensionContext: ExtensionContext;
    private readonly _logging: LoggingService;
    private readonly _telemetry: TelemetryService;

    constructor(extensionContext: ExtensionContext) {
        this._extensionContext = extensionContext;
        this._logging = extensionContext.loggingService;
        this._telemetry = extensionContext.telemetryService;

        this.registerTerminalListeners();
    }

    public static getInstance(extensionContext: ExtensionContext): TerminalService {
        if (!TerminalService.instance) {
            TerminalService.instance = new TerminalService(extensionContext);
        }
        return TerminalService.instance;
    }

    private registerTerminalListeners(): void {
        this.disposables.push(
            vscode.window.onDidOpenTerminal(terminal => {
                this.terminals.set(terminal.name, terminal);
                this._logging.debug(`Terminal opened: ${terminal.name}`);
            }),

            vscode.window.onDidCloseTerminal(terminal => {
                this.terminals.delete(terminal.name);
                this.terminalOutputs.delete(terminal.name);
                this.executingCommands.delete(terminal.name);
                this._logging.debug(`Terminal closed: ${terminal.name}`);
            }),

            vscode.window.onDidChangeActiveTerminal(terminal => {
                this.activeTerminal = terminal || undefined;
                this._logging.debug(`Active terminal changed: ${terminal?.name || 'none'}`);
            })
        );
    }

    public createTerminal(name: string = 'M31 Agent'): vscode.Terminal {
        const terminal = vscode.window.createTerminal(name);
        this.terminals.set(name, terminal);
        this._logging.debug(`Terminal created: ${name}`);
        return terminal;
    }

    public getOrCreateTerminal(name: string = 'M31 Agent'): vscode.Terminal {
        const existingTerminal = this.terminals.get(name);
        if (existingTerminal) {
            return existingTerminal;
        }
        return this.createTerminal(name);
    }

    public async executeCommand(command: string, captureOutput: boolean = false): Promise<string> {
        this._logging.debug(`Executing command: ${command}`);
        
        if (captureOutput) {
            try {
                const result = await this.executeCommandWithOutput(command);
                return result.output;
            } catch (error) {
                this._logging.error(`Error executing command with output: ${error}`);
                throw error;
            }
        } else {
            const terminal = this.getOrCreateTerminal();
            terminal.show();
            terminal.sendText(command);
            return '';
        }
    }

    public async executeCommandWithOutput(command: string): Promise<CommandResult> {
        this._logging.debug(`Executing command with output: ${command}`);
        
        return new Promise<CommandResult>((resolve, reject) => {
            const execProcess = require('child_process').exec;
            
            execProcess(command, { maxBuffer: 10 * 1024 * 1024 }, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    this._logging.error(`Command execution error: ${error}`);
                    resolve({
                        output: stderr || stdout,
                        exitCode: error.code
                    });
                } else {
                    resolve({
                        output: stdout,
                        exitCode: 0
                    });
                }
            });
        });
    }

    public async runInTerminal(text: string): Promise<void> {
        const terminal = this.getOrCreateTerminal();
        terminal.show();
        terminal.sendText(text);
        this._logging.debug(`Text sent to terminal: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    }

    public async executeCode(code: string, languageId: string): Promise<void> {
        this._logging.debug(`Executing code of language: ${languageId}`);
        
        let command = '';
        switch (languageId) {
            case 'javascript':
                command = `node -e "${code.replace(/"/g, '\\"')}"`;
                break;
            case 'typescript':
                command = `ts-node -e "${code.replace(/"/g, '\\"')}"`;
                break;
            case 'python':
                command = `python -c "${code.replace(/"/g, '\\"')}"`;
                break;
            case 'shellscript':
            case 'bash':
                command = code;
                break;
            default:
                throw new Error(`Execution not supported for language: ${languageId}`);
        }
        
        await this.executeCommand(command);
    }

    public async runFile(filePath: string, fileExtension: string): Promise<void> {
        this._logging.debug(`Running file: ${filePath}`);
        
        const command = this.getRunCommandForFile(filePath, fileExtension);
        if (!command) {
            throw new Error(`Running files with extension ${fileExtension} is not supported`);
        }
        
        await this.executeCommand(command);
    }

    private getRunCommandForFile(filePath: string, fileExtension: string): string | null {
        switch (fileExtension.toLowerCase()) {
            case 'js':
                return `node "${filePath}"`;
            case 'ts':
                return `ts-node "${filePath}"`;
            case 'py':
                return `python "${filePath}"`;
            case 'sh':
                return `bash "${filePath}"`;
            case 'java':
                return `java "${filePath}"`;
            case 'c':
                return `gcc "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
            case 'cpp':
                return `g++ "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
            case 'go':
                return `go run "${filePath}"`;
            case 'rb':
                return `ruby "${filePath}"`;
            case 'php':
                return `php "${filePath}"`;
            case 'rs':
                return `rustc "${filePath}" && "${filePath.replace('.rs', '')}"`;
            default:
                return null;
        }
    }

    public async killRunningProcess(): Promise<void> {
        if (process.platform === 'win32') {
            await this.executeCommand('\u0003'); // Ctrl+C
        } else {
            await this.executeCommand('\u0003'); // Ctrl+C
        }
        this._logging.debug('Sent kill signal to running process');
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.terminals.forEach(terminal => terminal.dispose());
        this.terminals.clear();
        this.terminalOutputs.clear();
        this.executingCommands.clear();
    }
}