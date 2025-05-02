import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import {
  TerminalCommand,
  TerminalCommandResult,
  TerminalOutput,
  TerminalOutputType,
  TerminalSession,
  TerminalOptions,
} from '../../models/terminalExecution';

export class TerminalService {
  private terminals: Map<string, vscode.Terminal> = new Map();
  private sessions: Map<string, TerminalSession> = new Map();
  private commandResults: Map<string, TerminalCommandResult> = new Map();
  private activeCommand: Map<string, TerminalCommand> = new Map();
  private outputBuffers: Map<string, string[]> = new Map();

  private readonly eventEmitter = new vscode.EventEmitter<TerminalEvent>();
  private readonly disposables: vscode.Disposable[] = [];

  public readonly onTerminalEvent = this.eventEmitter.event;

  constructor() {
    this.disposables.push(this.eventEmitter);
    this.disposables.push(
      vscode.window.onDidCloseTerminal((terminal) => {
        for (const [id, term] of this.terminals.entries()) {
          if (term === terminal) {
            this.terminals.delete(id);

            const session = this.getSessionByTerminalId(id);
            if (session) {
              session.status = 'idle';

              this.emitEvent({
                type: 'terminalClosed',
                sessionId: session.id,
                timestamp: Date.now(),
              });
            }

            break;
          }
        }
      })
    );

    this.disposables.push(
      vscode.window.onDidWriteTerminalData((e) => {
        for (const [id, term] of this.terminals.entries()) {
          if (term === e.terminal) {
            const session = this.getSessionByTerminalId(id);
            if (session && session.currentCommand) {
              const buffer = this.outputBuffers.get(id) || [];
              buffer.push(e.data);
              this.outputBuffers.set(id, buffer);

              const output: TerminalOutput = {
                commandId: session.currentCommand.id,
                type: TerminalOutputType.Stdout,
                text: e.data,
                timestamp: Date.now(),
              };

              session.outputs.push(output);

              this.emitEvent({
                type: 'terminalOutput',
                sessionId: session.id,
                output,
                timestamp: Date.now(),
              });

              break;
            }
          }
        }
      })
    );
  }

  public createSession(options?: TerminalOptions): string {
    const sessionId = uuidv4();
    const terminalId = uuidv4();

    const terminal = vscode.window.createTerminal({
      name: `M31 Agent Terminal ${sessionId.substring(0, 8)}`,
      shellPath: options?.shellPath,
      shellArgs: options?.shellArgs,
      cwd: options?.cwd,
      env: options?.env,
      strictEnv: true,
    });

    this.terminals.set(terminalId, terminal);

    const session: TerminalSession = {
      id: sessionId,
      status: 'idle',
      currentDirectory: options?.cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
      history: [],
      outputs: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.sessions.set(sessionId, session);
    this.outputBuffers.set(terminalId, []);

    terminal.show(true);

    this.emitEvent({
      type: 'sessionCreated',
      sessionId,
      timestamp: Date.now(),
    });

    return sessionId;
  }

  public async executeCommand(
    sessionId: string,
    commandText: string,
    options: {
      requireConfirmation?: boolean;
      isBackground?: boolean;
      description?: string;
      directory?: string;
    } = {}
  ): Promise<TerminalCommandResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Terminal session ${sessionId} not found`);
    }

    if (session.status === 'running' && !options.isBackground) {
      throw new Error(`Terminal session ${sessionId} is already running a command`);
    }

    const requireConfirmation =
      options.requireConfirmation ??
      vscode.workspace.getConfiguration('m31-agent').get('requireConfirmation', true);

    const command: TerminalCommand = {
      id: uuidv4(),
      command: commandText,
      isBackground: options.isBackground || false,
      requireConfirmation,
      createdAt: Date.now(),
      directory: options.directory || session.currentDirectory,
      description: options.description,
    };

    let executeCommand = !requireConfirmation;

    if (requireConfirmation) {
      const result = await vscode.window.showInformationMessage(
        `Execute terminal command: ${commandText}`,
        { modal: true },
        'Execute',
        'Cancel'
      );

      executeCommand = result === 'Execute';
    }

    if (!executeCommand) {
      const result: TerminalCommandResult = {
        id: command.id,
        command: command.command,
        exitCode: null,
        stdout: '',
        stderr: 'Command execution was cancelled by user',
        isRunning: false,
        startTime: Date.now(),
        endTime: Date.now(),
      };

      this.commandResults.set(command.id, result);

      this.emitEvent({
        type: 'commandCancelled',
        sessionId,
        command,
        result,
        timestamp: Date.now(),
      });

      return result;
    }

    session.history.push(command);
    session.currentCommand = command;
    session.status = 'running';
    session.lastActivity = Date.now();

    this.activeCommand.set(sessionId, command);

    const terminalId = this.getTerminalIdBySessionId(sessionId);
    if (!terminalId) {
      throw new Error(`Terminal for session ${sessionId} not found`);
    }

    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal for session ${sessionId} not found`);
    }

    // Clear output buffer
    this.outputBuffers.set(terminalId, []);

    const result: TerminalCommandResult = {
      id: command.id,
      command: command.command,
      exitCode: null,
      stdout: '',
      stderr: '',
      isRunning: true,
      startTime: Date.now(),
    };

    this.commandResults.set(command.id, result);

    this.emitEvent({
      type: 'commandStarted',
      sessionId,
      command,
      timestamp: Date.now(),
    });

    terminal.show(true);
    terminal.sendText(commandText, true);

    // For background commands, we don't wait for completion
    if (command.isBackground) {
      setTimeout(() => {
        if (this.commandResults.has(command.id)) {
          const currentResult = this.commandResults.get(command.id)!;
          if (currentResult.isRunning) {
            // Keep the command running but remove it as the current command
            if (session.currentCommand?.id === command.id) {
              session.currentCommand = undefined;
              session.status = 'idle';
            }

            this.emitEvent({
              type: 'commandBackgrounded',
              sessionId,
              command,
              timestamp: Date.now(),
            });
          }
        }
      }, 1000);

      return result;
    }

    // For foreground commands, we simulate waiting for completion
    // In a real implementation, this would use the Terminal API to get command results
    return new Promise<TerminalCommandResult>((resolve) => {
      // This is a simplified approach that waits a bit then resolves
      // In a real implementation, you'd monitor the terminal output or use a proper API
      setTimeout(() => {
        const buffer = this.outputBuffers.get(terminalId) || [];
        const output = buffer.join('');

        const updatedResult: TerminalCommandResult = {
          ...result,
          isRunning: false,
          stdout: output,
          exitCode: 0,
          endTime: Date.now(),
        };

        this.commandResults.set(command.id, updatedResult);

        if (session.currentCommand?.id === command.id) {
          session.currentCommand = undefined;
          session.status = 'idle';
        }

        this.emitEvent({
          type: 'commandCompleted',
          sessionId,
          command,
          result: updatedResult,
          timestamp: Date.now(),
        });

        resolve(updatedResult);
      }, 2000);
    });
  }

  public cancelCommand(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentCommand) {
      return false;
    }

    const command = session.currentCommand;
    const terminalId = this.getTerminalIdBySessionId(sessionId);
    if (!terminalId) {
      return false;
    }

    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      return false;
    }

    // Send SIGINT (Ctrl+C) to the terminal
    terminal.sendText('\u0003', false);

    const result = this.commandResults.get(command.id);
    if (result) {
      result.isRunning = false;
      result.exitCode = 130; // SIGINT exit code
      result.endTime = Date.now();
      result.stderr += '\nCommand was cancelled';

      this.emitEvent({
        type: 'commandCancelled',
        sessionId,
        command,
        result,
        timestamp: Date.now(),
      });
    }

    session.currentCommand = undefined;
    session.status = 'idle';

    return true;
  }

  public closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.status === 'running') {
      this.cancelCommand(sessionId);
    }

    const terminalId = this.getTerminalIdBySessionId(sessionId);
    if (terminalId) {
      const terminal = this.terminals.get(terminalId);
      if (terminal) {
        terminal.dispose();
        this.terminals.delete(terminalId);
      }

      this.outputBuffers.delete(terminalId);
    }

    this.sessions.delete(sessionId);

    this.emitEvent({
      type: 'sessionClosed',
      sessionId,
      timestamp: Date.now(),
    });

    return true;
  }

  public getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getCommandResult(commandId: string): TerminalCommandResult | undefined {
    return this.commandResults.get(commandId);
  }

  public getAllSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  private getSessionByTerminalId(terminalId: string): TerminalSession | undefined {
    for (const [sessionId, session] of this.sessions.entries()) {
      const thisTerminalId = this.getTerminalIdBySessionId(sessionId);
      if (thisTerminalId === terminalId) {
        return session;
      }
    }
    return undefined;
  }

  private getTerminalIdBySessionId(sessionId: string): string | undefined {
    for (const [terminalId, _] of this.terminals.entries()) {
      const thisSession = this.getSessionByTerminalId(terminalId);
      if (thisSession?.id === sessionId) {
        return terminalId;
      }
    }
    return undefined;
  }

  private emitEvent(event: TerminalEvent): void {
    this.eventEmitter.fire(event);
  }

  public dispose(): void {
    for (const [sessionId, _] of this.sessions.entries()) {
      this.closeSession(sessionId);
    }

    this.sessions.clear();
    this.terminals.clear();
    this.commandResults.clear();
    this.activeCommand.clear();
    this.outputBuffers.clear();

    this.disposables.forEach((d) => d.dispose());
  }
}

export type TerminalEventType =
  | 'sessionCreated'
  | 'sessionClosed'
  | 'commandStarted'
  | 'commandCompleted'
  | 'commandCancelled'
  | 'commandBackgrounded'
  | 'terminalOutput'
  | 'terminalClosed';

export interface TerminalEvent {
  type: TerminalEventType;
  sessionId: string;
  command?: TerminalCommand;
  result?: TerminalCommandResult;
  output?: TerminalOutput;
  timestamp: number;
}
