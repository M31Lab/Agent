import { useRef } from 'react';

interface VSCodeApi {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
}

declare function acquireVsCodeApi(): VSCodeApi;

export const useVsCodeApi = (): VSCodeApi => {
  const vscodeApiRef = useRef<VSCodeApi | null>(null);

  if (!vscodeApiRef.current) {
    try {
      vscodeApiRef.current = acquireVsCodeApi();
    } catch (error) {
      console.error('Failed to acquire VS Code API:', error);

      vscodeApiRef.current = {
        postMessage: (message: unknown) => {
          console.error('VS Code API not available for message:', message);
        },
        getState: () => {
          console.error('VS Code API not available for getState');
          return {};
        },
        setState: (state: unknown) => {
          console.error('VS Code API not available for setState:', state);
        },
      };
    }
  }

  return vscodeApiRef.current;
};
