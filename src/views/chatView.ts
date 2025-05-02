import * as vscode from 'vscode';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'm31-agent.chatView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'sendMessage':
          // TODO: Process the message and get a response from the AI
          const response = `Received: ${message.text}`;
          this._view?.webview.postMessage({ command: 'receiveMessage', text: response });
          return;
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return /*html*/`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>M31 Agent Chat</title>
        <style>
          body {
            padding: 10px;
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
          }
          .message-container {
            height: calc(100vh - 120px);
            overflow-y: auto;
            margin-bottom: 10px;
            border: 1px solid var(--vscode-panel-border);
            padding: 8px;
          }
          .input-container {
            display: flex;
          }
          #message-input {
            flex: 1;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 5px;
          }
          button {
            margin-left: 5px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            cursor: pointer;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 5px;
          }
          .user-message {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            align-self: flex-end;
          }
          .ai-message {
            background-color: var(--vscode-editor-selectionBackground);
            align-self: flex-start;
          }
        </style>
      </head>
      <body>
        <div class="message-container" id="messages"></div>
        <div class="input-container">
          <input type="text" id="message-input" placeholder="Ask a question...">
          <button id="send-button">Send</button>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          const messageContainer = document.getElementById('messages');
          const messageInput = document.getElementById('message-input');
          const sendButton = document.getElementById('send-button');

          // Handle sending messages
          function sendMessage() {
            const text = messageInput.value.trim();
            if (text) {
              // Add user message to UI
              const userMessageElement = document.createElement('div');
              userMessageElement.className = 'message user-message';
              userMessageElement.textContent = text;
              messageContainer.appendChild(userMessageElement);
              
              // Clear input
              messageInput.value = '';
              
              // Send message to extension
              vscode.postMessage({
                command: 'sendMessage',
                text: text
              });
              
              // Scroll to bottom
              messageContainer.scrollTop = messageContainer.scrollHeight;
            }
          }

          // Handle incoming messages
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'receiveMessage':
                const aiMessageElement = document.createElement('div');
                aiMessageElement.className = 'message ai-message';
                aiMessageElement.textContent = message.text;
                messageContainer.appendChild(aiMessageElement);
                messageContainer.scrollTop = messageContainer.scrollHeight;
                break;
            }
          });

          // Event listeners
          sendButton.addEventListener('click', sendMessage);
          messageInput.addEventListener('keypress', event => {
            if (event.key === 'Enter') {
              sendMessage();
            }
          });
        </script>
      </body>
      </html>
    `;
  }
} 