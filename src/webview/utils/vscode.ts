// Utility for communication with VS Code
declare global {
    interface Window {
        acquireVsCodeApi: () => VSCodeAPI;
    }
}

// Define the VS Code API interface
interface VSCodeAPI {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
}

// Acquire the VS Code API object
let vsCodeApi: VSCodeAPI;
try {
    vsCodeApi = window.acquireVsCodeApi();
} catch (error) {
    // Handle the case when running outside of VS Code
    console.error('Failed to acquire VS Code API', error);
    vsCodeApi = {
        postMessage: (message: unknown): void => {
            console.log('VS Code message:', message);
        },
        getState: (): unknown => {
            return {};
        },
        setState: (state: unknown): void => {
            console.log('VS Code state:', state);
        }
    };
}

// Export the API for use in other modules
export const vscode = vsCodeApi; 