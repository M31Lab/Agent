// Utility for communication with VS Code
declare global {
    interface Window {
        acquireVsCodeApi: () => {
            postMessage(message: any): void;
            getState(): any;
            setState(state: any): void;
        };
    }
}

// Acquire the VS Code API object
let vsCodeApi: any;
try {
    vsCodeApi = window.acquireVsCodeApi();
} catch (error) {
    // Handle the case when running outside of VS Code
    console.error('Failed to acquire VS Code API', error);
    vsCodeApi = {
        postMessage: (message: any) => {
            console.log('VS Code message:', message);
        },
        getState: () => {
            return {};
        },
        setState: (state: any) => {
            console.log('VS Code state:', state);
        }
    };
}

// Export the API for use in other modules
export const vscode = vsCodeApi; 