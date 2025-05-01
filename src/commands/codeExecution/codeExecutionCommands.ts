import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { LoggingService } from '../../utils/logging/loggingService';
import { TelemetryService } from '../../services/telemetry/telemetryService';
import { TerminalService } from '../../services/terminal/terminalService';

export class CodeExecutionCommands {
    private readonly _extensionContext: ExtensionContext;
    private readonly _logging: LoggingService;
    private readonly _telemetry: TelemetryService;
    private readonly _terminalService: TerminalService;
    private readonly _disposables: vscode.Disposable[] = [];

    constructor(
        extensionContext: ExtensionContext,
        terminalService: TerminalService
    ) {
        this._extensionContext = extensionContext;
        this._logging = extensionContext.loggingService;
        this._telemetry = extensionContext.telemetryService;
        this._terminalService = terminalService;

        this.registerCommands();
    }

    private registerCommands(): void {
        this._disposables.push(
            vscode.commands.registerCommand('m31-agent.runCommand', this.runCommand.bind(this)),
            vscode.commands.registerCommand('m31-agent.executeSelectedCode', this.executeSelectedCode.bind(this)),
            vscode.commands.registerCommand('m31-agent.createAndRunFile', this.createAndRunFile.bind(this)),
            vscode.commands.registerCommand('m31-agent.executeInTerminal', this.executeInTerminal.bind(this))
        );

        this._logging.info('Registered code execution commands');
    }

    private async runCommand(command?: string): Promise<string> {
        if (!command) {
            command = await vscode.window.showInputBox({
                placeHolder: 'Enter command to run',
                prompt: 'Run command in terminal'
            });
        }

        if (!command) {
            return '';
        }

        this._logging.info(`Running command: ${command}`);
        this._telemetry.trackEvent('command_executed', { commandType: 'terminal' });

        const requireConfirmation = this._extensionContext.configurationService.isRequireConfirmation();
        if (requireConfirmation) {
            const confirmation = await vscode.window.showWarningMessage(
                `Run command: ${command}?`,
                { modal: true },
                'Yes', 'No'
            );

            if (confirmation !== 'Yes') {
                this._logging.info('Command execution cancelled by user');
                return '';
            }
        }

        try {
            return await this._terminalService.executeCommand(command, true);
        } catch (error) {
            this._logging.error(`Error executing command: ${error}`);
            vscode.window.showErrorMessage(`Failed to execute command: ${error}`);
            return '';
        }
    }

    private async executeSelectedCode(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('No code selected');
            return;
        }

        const selectedText = editor.document.getText(selection);
        this._logging.info('Executing selected code');
        this._telemetry.trackEvent('command_executed', { commandType: 'selected_code' });

        // Determine language to execute
        const language = editor.document.languageId;
        await this.executeCodeByLanguage(selectedText, language);
    }

    private async executeCodeByLanguage(code: string, language: string): Promise<void> {
        let command = '';
        let tempFile: string | undefined;

        switch (language) {
            case 'javascript':
            case 'typescript':
                command = `node -e "${code.replace(/"/g, '\\"')}"`;
                break;
            case 'python':
                command = `python -c "${code.replace(/"/g, '\\"')}"`;
                break;
            case 'shellscript':
            case 'bash':
                command = code;
                break;
            default:
                tempFile = await this.createTempFile(code, language);
                if (tempFile) {
                    command = this.getRunCommandForLanguage(language, tempFile);
                }
        }

        if (!command) {
            vscode.window.showWarningMessage(`Execution not supported for language: ${language}`);
            return;
        }

        try {
            await this.runCommand(command);
        } finally {
            if (tempFile) {
                // Clean up temp file if needed
            }
        }
    }

    private async createTempFile(content: string, language: string): Promise<string | undefined> {
        // Implementation would create a temporary file with the content
        // For now, return a placeholder
        return undefined;
    }

    private getRunCommandForLanguage(language: string, filePath: string): string {
        switch (language) {
            case 'javascript':
            case 'typescript':
                return `node ${filePath}`;
            case 'python':
                return `python ${filePath}`;
            case 'java':
                return `java ${filePath}`;
            case 'c':
            case 'cpp':
                return `g++ ${filePath} -o ${filePath}.out && ${filePath}.out`;
            case 'csharp':
                return `dotnet run ${filePath}`;
            case 'go':
                return `go run ${filePath}`;
            case 'rust':
                return `rustc ${filePath} && ${filePath.replace('.rs', '')}`;
            default:
                return '';
        }
    }

    private async createAndRunFile(content: string, language: string, runAfterCreate = true): Promise<void> {
        if (!content || !language) {
            vscode.window.showWarningMessage('Content and language must be provided');
            return;
        }

        try {
            this._logging.info(`Creating file for language: ${language}`);
            this._telemetry.trackEvent('file_created', { language });

            // Create a new untitled file
            const extension = this.getExtensionForLanguage(language);
            const document = await vscode.workspace.openTextDocument({
                content,
                language
            });

            await vscode.window.showTextDocument(document);

            if (runAfterCreate) {
                await vscode.commands.executeCommand('workbench.action.files.save');
                const filePath = document.uri.fsPath;
                if (filePath) {
                    const command = this.getRunCommandForLanguage(language, filePath);
                    if (command) {
                        await this.runCommand(command);
                    }
                }
            }
        } catch (error) {
            this._logging.error(`Error creating file: ${error}`);
            vscode.window.showErrorMessage(`Failed to create file: ${error}`);
        }
    }

    private getExtensionForLanguage(language: string): string {
        switch (language) {
            case 'javascript':
                return '.js';
            case 'typescript':
                return '.ts';
            case 'python':
                return '.py';
            case 'java':
                return '.java';
            case 'c':
                return '.c';
            case 'cpp':
                return '.cpp';
            case 'csharp':
                return '.cs';
            case 'go':
                return '.go';
            case 'rust':
                return '.rs';
            default:
                return '.txt';
        }
    }

    private async executeInTerminal(text?: string): Promise<void> {
        if (!text) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const selection = editor.selection;
                text = selection.isEmpty ? 
                    editor.document.getText() : 
                    editor.document.getText(selection);
            }
        }

        if (!text) {
            vscode.window.showWarningMessage('No text to execute');
            return;
        }

        await this._terminalService.runInTerminal(text);
        this._logging.info('Command executed in terminal');
        this._telemetry.trackEvent('command_executed', { commandType: 'terminal_direct' });
    }

    public dispose(): void {
        this._disposables.forEach(d => d.dispose());
    }
} 