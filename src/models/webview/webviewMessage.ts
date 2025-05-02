import { WebviewMessageType } from './webviewMessageType';
import { ExtensionConfiguration } from '../settings/extensionConfiguration';

interface BaseWebviewMessage {
  type: WebviewMessageType;
  payload: Record<string, unknown>;
}

interface InitializeMessage extends BaseWebviewMessage {
  type: WebviewMessageType.Initialize;
  payload: Record<string, never>;
}

interface UpdateConfigMessage extends BaseWebviewMessage {
  type: WebviewMessageType.UpdateConfig;
  payload: {
    config: ExtensionConfiguration;
  };
}

interface UserMessageMessage extends BaseWebviewMessage {
  type: WebviewMessageType.UserMessage;
  payload: {
    content: string;
  };
}

interface MessageMessage extends BaseWebviewMessage {
  type: WebviewMessageType.Message;
  payload: {
    message: {
      id: string;
      role: 'user' | 'assistant' | 'system' | 'error';
      content: string;
    };
  };
}

interface ThinkingStartMessage extends BaseWebviewMessage {
  type: WebviewMessageType.ThinkingStart;
  payload: Record<string, never>;
}

interface ThinkingEndMessage extends BaseWebviewMessage {
  type: WebviewMessageType.ThinkingEnd;
  payload: Record<string, never>;
}

interface ErrorMessage extends BaseWebviewMessage {
  type: WebviewMessageType.Error;
  payload: {
    message: string;
    detail?: string;
  };
}

interface ClearChatMessage extends BaseWebviewMessage {
  type: WebviewMessageType.ClearChat;
  payload: Record<string, never>;
}

interface FocusInputMessage extends BaseWebviewMessage {
  type: WebviewMessageType.FocusInput;
  payload: Record<string, never>;
}

interface CancelRequestMessage extends BaseWebviewMessage {
  type: WebviewMessageType.CancelRequest;
  payload: Record<string, never>;
}

interface ExecuteCommandMessage extends BaseWebviewMessage {
  type: WebviewMessageType.ExecuteCommand;
  payload: {
    command: string;
  };
}

interface UpdateStreamContentMessage extends BaseWebviewMessage {
  type: WebviewMessageType.UpdateStreamContent;
  payload: {
    content: string;
  };
}

interface DisplayErrorMessage extends BaseWebviewMessage {
  type: WebviewMessageType.DisplayError;
  payload: {
    message: string;
  };
}

export type WebviewMessage =
  | InitializeMessage
  | UpdateConfigMessage
  | UserMessageMessage
  | MessageMessage
  | ThinkingStartMessage
  | ThinkingEndMessage
  | ErrorMessage
  | ClearChatMessage
  | FocusInputMessage
  | CancelRequestMessage
  | ExecuteCommandMessage
  | UpdateStreamContentMessage
  | DisplayErrorMessage;
