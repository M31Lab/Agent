import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';

enum StatusBarState {
    Default = 'default',
    Loading = 'loading',
    Error = 'error',
    Active = 'active',
    Inactive = 'inactive'
}

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private state: StatusBarState = StatusBarState.Default;
    private loadingAnimation: string[] = ['◐', '◓', '◑', '◒'];
    private loadingInterval: NodeJS.Timeout | undefined;
    private loadingFrame: number = 0;
    private context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.name = 'M31 Agent';
        this.statusBarItem.command = 'm31-agent.showChat';
        this.setDefaultState();
    }

    public initialize(): void {
        this.context.registerDisposable(this.statusBarItem);
        this.statusBarItem.show();
        this.context.loggingService.debug('Status bar initialized');
    }

    public setDefaultState(): void {
        this.state = StatusBarState.Default;
        this.stopLoadingAnimation();
        this.statusBarItem.text = '$(rocket) M31 Agent';
        this.statusBarItem.tooltip = 'M31 Agent - Click to open chat';
        this.context.loggingService.debug('Status bar state set to default');
    }

    public setLoadingState(message: string = 'Processing'): void {
        this.state = StatusBarState.Loading;
        this.statusBarItem.tooltip = message;
        this.startLoadingAnimation(message);
        this.context.loggingService.debug('Status bar state set to loading');
    }

    public setErrorState(message: string): void {
        this.state = StatusBarState.Error;
        this.stopLoadingAnimation();
        this.statusBarItem.text = '$(error) M31 Agent';
        this.statusBarItem.tooltip = `Error: ${message}`;
        this.context.loggingService.debug('Status bar state set to error');
        
        // Automatically reset to default state after 5 seconds
        setTimeout(() => {
            if (this.state === StatusBarState.Error) {
                this.setDefaultState();
            }
        }, 5000);
    }

    public setActiveState(message: string = 'Active'): void {
        this.state = StatusBarState.Active;
        this.stopLoadingAnimation();
        this.statusBarItem.text = '$(check) M31 Agent';
        this.statusBarItem.tooltip = message;
        this.context.loggingService.debug('Status bar state set to active');
    }

    public setInactiveState(message: string = 'Inactive'): void {
        this.state = StatusBarState.Inactive;
        this.stopLoadingAnimation();
        this.statusBarItem.text = '$(circle-slash) M31 Agent';
        this.statusBarItem.tooltip = message;
        this.context.loggingService.debug('Status bar state set to inactive');
    }

    private startLoadingAnimation(message: string): void {
        this.stopLoadingAnimation();
        this.loadingFrame = 0;
        
        this.loadingInterval = setInterval(() => {
            this.loadingFrame = (this.loadingFrame + 1) % this.loadingAnimation.length;
            const frame = this.loadingAnimation[this.loadingFrame];
            this.statusBarItem.text = `$(sync~spin) M31 Agent`;
            this.statusBarItem.tooltip = `${message}...`;
        }, 250);
    }

    private stopLoadingAnimation(): void {
        if (this.loadingInterval) {
            clearInterval(this.loadingInterval);
            this.loadingInterval = undefined;
        }
    }

    public dispose(): void {
        this.stopLoadingAnimation();
        this.statusBarItem.dispose();
    }
} 