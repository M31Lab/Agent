import * as vscode from 'vscode';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ExtensionContext } from '../../models/context/extensionContext';
import { ChatMessage, ChatRole, ChatSession } from '../../models/ai/chatTypes';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';

export class ChatPanelProvider {
    private panel: vscode.WebviewPanel | undefined;
    private context: ExtensionContext;
    private sessions: ChatSession[] = [];
    private activeSessionId: string | null = null;
    private apiClient: OpenRouterApiClient;
    private static readonly viewType = 'm31-agent.chatView';
    private isProcessing: boolean = false;

    constructor(context: ExtensionContext) {
        this.context = context;
        this.apiClient = new OpenRouterApiClient(
            context.configurationService,
            context.authenticationService,
            context.loggingService
        );
        this.loadSessions();
        
        // Create default session if none exists
        if (this.sessions.length === 0) {
            this.createNewSession();
        } else {
            this.activeSessionId = this.sessions[0].id;
        }
    }

    public async show(): Promise<void> {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            ChatPanelProvider.viewType,
            'M31 Agent Chat',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(this.context.extensionPath, 'resources'))
                ]
            }
        );

        this.panel.iconPath = {
            light: vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'light', 'chat.svg')),
            dark: vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'dark', 'chat.svg'))
        };

        this.panel.webview.html = this.getWebviewContent();

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                await this.handleWebviewMessage(message);
            },
            undefined,
            this.context.subscriptions
        );

        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
            },
            null,
            this.context.subscriptions
        );

        // Send initial state to webview
        await this.updateWebview();
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>M31 Agent Chat</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 0;
                        margin: 0;
                        width: 100vw;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .chat-container {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        overflow: hidden;
                    }
                    .messages-container {
                        flex: 1;
                        overflow-y: auto;
                        padding: 1rem;
                    }
                    .message {
                        margin-bottom: 1rem;
                        padding: 0.5rem 1rem;
                        border-radius: 0.5rem;
                        max-width: 85%;
                    }
                    .user-message {
                        align-self: flex-end;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        margin-left: auto;
                    }
                    .assistant-message {
                        align-self: flex-start;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        color: var(--vscode-editor-foreground);
                    }
                    .system-message {
                        align-self: center;
                        background-color: var(--vscode-banner-background);
                        color: var(--vscode-banner-foreground);
                        font-style: italic;
                        text-align: center;
                        max-width: 90%;
                    }
                    .input-container {
                        display: flex;
                        padding: 1rem;
                        border-top: 1px solid var(--vscode-panel-border);
                    }
                    #message-input {
                        flex: 1;
                        padding: 0.5rem;
                        resize: none;
                        height: 2.5rem;
                        max-height: 10rem;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 0.25rem;
                        font-family: var(--vscode-font-family);
                    }
                    #send-button {
                        margin-left: 0.5rem;
                        padding: 0.5rem 1rem;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 0.25rem;
                        cursor: pointer;
                    }
                    #send-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .toolbar {
                        display: flex;
                        padding: 0.5rem 1rem;
                        background-color: var(--vscode-panel-background);
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .toolbar button {
                        margin-right: 0.5rem;
                        padding: 0.25rem 0.5rem;
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border: none;
                        border-radius: 0.25rem;
                        cursor: pointer;
                    }
                    .loading {
                        text-align: center;
                        padding: 1rem;
                        font-style: italic;
                        color: var(--vscode-descriptionForeground);
                    }
                    pre {
                        background-color: var(--vscode-textCodeBlock-background);
                        padding: 1rem;
                        border-radius: 0.5rem;
                        overflow-x: auto;
                        margin: 0.5rem 0;
                    }
                    code {
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                    }
                </style>
            </head>
            <body>
                <div class="chat-container">
                    <div class="toolbar">
                        <button id="new-chat-button">New Chat</button>
                        <button id="clear-chat-button">Clear Chat</button>
                        <button id="export-chat-button">Export Chat</button>
                    </div>
                    <div class="messages-container" id="messages-container"></div>
                    <div class="input-container">
                        <textarea id="message-input" placeholder="Type a message..." rows="1"></textarea>
                        <button id="send-button">Send</button>
                    </div>
                </div>
                <script>
                    (function() {
                        const vscode = acquireVsCodeApi();
                        const messagesContainer = document.getElementById('messages-container');
                        const messageInput = document.getElementById('message-input');
                        const sendButton = document.getElementById('send-button');
                        const newChatButton = document.getElementById('new-chat-button');
                        const clearChatButton = document.getElementById('clear-chat-button');
                        const exportChatButton = document.getElementById('export-chat-button');
                        
                        let isProcessing = false;
                        
                        // Handle sending messages
                        function sendMessage() {
                            const message = messageInput.value.trim();
                            if (!message || isProcessing) return;
                            
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: message
                            });
                            
                            messageInput.value = '';
                            messageInput.style.height = 'auto';
                        }
                        
                        // Event listeners
                        sendButton.addEventListener('click', sendMessage);
                        
                        messageInput.addEventListener('keydown', (event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                sendMessage();
                            }
                        });
                        
                        messageInput.addEventListener('input', () => {
                            messageInput.style.height = 'auto';
                            messageInput.style.height = messageInput.scrollHeight + 'px';
                        });
                        
                        newChatButton.addEventListener('click', () => {
                            vscode.postMessage({ command: 'newChat' });
                        });
                        
                        clearChatButton.addEventListener('click', () => {
                            vscode.postMessage({ command: 'clearChat' });
                        });
                        
                        exportChatButton.addEventListener('click', () => {
                            vscode.postMessage({ command: 'exportChat' });
                        });
                        
                        // Listen for messages from the extension
                        window.addEventListener('message', (event) => {
                            const message = event.data;
                            
                            switch (message.command) {
                                case 'updateChat':
                                    updateChatMessages(message.messages);
                                    break;
                                case 'setProcessing':
                                    setProcessingState(message.isProcessing);
                                    break;
                            }
                        });
                        
                        // Display chat messages
                        function updateChatMessages(messages) {
                            messagesContainer.innerHTML = '';
                            
                            messages.forEach(msg => {
                                const messageElement = document.createElement('div');
                                messageElement.classList.add('message');
                                
                                switch (msg.role) {
                                    case 'user':
                                        messageElement.classList.add('user-message');
                                        break;
                                    case 'assistant':
                                        messageElement.classList.add('assistant-message');
                                        break;
                                    case 'system':
                                        messageElement.classList.add('system-message');
                                        break;
                                }
                                
                                // Process markdown-like content
                                let content = msg.content;
                                
                                // Handle code blocks
                                content = content.replace(/\`\`\`(\\w*)(\\n)?([\\s\\S]*?)\\n?\`\`\`/g, (match, lang, newline, code) => {
                                    return \`<pre><code class="language-\${lang}">\${code}</code></pre>\`;
                                });
                                
                                // Handle inline code
                                content = content.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
                                
                                // Handle line breaks
                                content = content.replace(/\\n/g, '<br>');
                                
                                messageElement.innerHTML = content;
                                messagesContainer.appendChild(messageElement);
                            });
                            
                            // Scroll to bottom
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                        
                        // Update UI processing state
                        function setProcessingState(processing) {
                            isProcessing = processing;
                            sendButton.disabled = processing;
                            messageInput.disabled = processing;
                            
                            if (processing) {
                                const loadingElement = document.createElement('div');
                                loadingElement.classList.add('loading');
                                loadingElement.id = 'loading-indicator';
                                loadingElement.textContent = 'AI is thinking...';
                                messagesContainer.appendChild(loadingElement);
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            } else {
                                const loadingElement = document.getElementById('loading-indicator');
                                if (loadingElement) {
                                    loadingElement.remove();
                                }
                            }
                        }
                        
                        // Notify the extension that the webview is ready
                        vscode.postMessage({ command: 'ready' });
                    }());
                </script>
            </body>
            </html>`;
    }

    private async handleWebviewMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'ready':
                await this.updateWebview();
                break;
            case 'sendMessage':
                await this.sendMessage(message.text);
                break;
            case 'newChat':
                await this.createNewSession();
                await this.updateWebview();
                break;
            case 'clearChat':
                await this.clearCurrentSession();
                await this.updateWebview();
                break;
            case 'exportChat':
                await this.exportCurrentSession();
                break;
        }
    }

    private async updateWebview(): Promise<void> {
        if (!this.panel) {
            return;
        }

        const activeSession = this.getActiveSession();
        if (!activeSession) {
            return;
        }

        this.panel.webview.postMessage({
            command: 'updateChat',
            messages: activeSession.messages
        });

        this.panel.webview.postMessage({
            command: 'setProcessing',
            isProcessing: this.isProcessing
        });
    }

    public async sendMessage(text: string): Promise<void> {
        if (!text.trim() || this.isProcessing) {
            return;
        }

        const session = this.getActiveSession();
        if (!session) {
            this.context.loggingService.error('No active chat session found');
            return;
        }

        try {
            // Add user message
            const userMessage: ChatMessage = {
                role: ChatRole.User,
                content: text,
                timestamp: Date.now(),
                id: uuidv4()
            };

            session.messages.push(userMessage);
            session.updatedAt = Date.now();
            await this.updateWebview();

            // Start processing
            this.isProcessing = true;
            await this.updateWebview();

            // Ensure API key is set
            const isAuthenticated = await this.context.authenticationService.ensureAuthenticated();
            if (!isAuthenticated) {
                this.addSystemMessage('API key not configured. Please set your OpenRouter API key in the settings.');
                this.isProcessing = false;
                await this.updateWebview();
                return;
            }

            // Prepare chat completion request
            const messages = session.messages
                .filter(m => m.role !== ChatRole.System || session.messages.indexOf(m) === 0)
                .map(m => ({
                    role: m.role,
                    content: m.content
                }));

            // Add a system message if none exists
            if (!messages.find(m => m.role === ChatRole.System)) {
                messages.unshift({
                    role: ChatRole.System,
                    content: 'You are M31 Agent, an AI assistant for VS Code. Be concise, helpful, and clear in your responses. Use markdown formatting when appropriate.'
                });
            }

            // Get completion from OpenRouter
            const modelId = session.modelId || this.context.configurationService.getModelId();
            const response = await this.apiClient.generateChatCompletion(messages, {
                modelId,
                temperature: this.context.configurationService.getTemperature(),
                maxTokens: this.context.configurationService.getMaxTokens()
            });

            // Add assistant response
            const assistantMessage: ChatMessage = {
                role: ChatRole.Assistant,
                content: response.choices[0].message.content,
                timestamp: Date.now(),
                id: uuidv4()
            };

            session.messages.push(assistantMessage);
            session.updatedAt = Date.now();

            // Save sessions and update UI
            this.saveSessions();

            // Track the event
            this.context.telemetryService.trackEvent('chat_message_processed', {
                modelId,
                inputTokens: response.usage.prompt_tokens.toString(),
                outputTokens: response.usage.completion_tokens.toString(),
                totalTokens: response.usage.total_tokens.toString()
            });
        } catch (error) {
            this.context.loggingService.error('Error processing chat message', error);
            this.addSystemMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            this.isProcessing = false;
            await this.updateWebview();
        }
    }

    private addSystemMessage(content: string): void {
        const session = this.getActiveSession();
        if (!session) {
            return;
        }

        const systemMessage: ChatMessage = {
            role: ChatRole.System,
            content,
            timestamp: Date.now(),
            id: uuidv4()
        };

        session.messages.push(systemMessage);
        session.updatedAt = Date.now();
        this.saveSessions();
    }

    public async createNewSession(): Promise<string> {
        const sessionId = uuidv4();
        const newSession: ChatSession = {
            id: sessionId,
            title: `Chat ${this.sessions.length + 1}`,
            messages: [
                {
                    role: ChatRole.System,
                    content: 'You are M31 Agent, an AI assistant for VS Code. Be concise, helpful, and clear in your responses. Use markdown formatting when appropriate.',
                    timestamp: Date.now(),
                    id: uuidv4()
                }
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            modelId: this.context.configurationService.getModelId()
        };

        this.sessions.unshift(newSession);
        this.activeSessionId = sessionId;
        this.saveSessions();

        this.context.telemetryService.trackEvent('chat_session_created');

        return sessionId;
    }

    public async clearCurrentSession(): Promise<void> {
        const session = this.getActiveSession();
        if (!session) {
            return;
        }

        session.messages = [
            {
                role: ChatRole.System,
                content: 'You are M31 Agent, an AI assistant for VS Code. Be concise, helpful, and clear in your responses. Use markdown formatting when appropriate.',
                timestamp: Date.now(),
                id: uuidv4()
            }
        ];
        session.updatedAt = Date.now();
        
        this.saveSessions();
        this.context.telemetryService.trackEvent('chat_session_cleared');
    }

    public async exportCurrentSession(): Promise<void> {
        const session = this.getActiveSession();
        if (!session) {
            throw new Error('No active session to export');
        }

        try {
            const exportData = {
                title: session.title,
                modelId: session.modelId || this.context.configurationService.getModelId(),
                timestamp: new Date().toISOString(),
                messages: session.messages.map(m => ({
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : undefined
                }))
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            
            // Save to file
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().replace(/:/g, '-')}.json`),
                filters: {
                    'JSON': ['json'],
                    'All Files': ['*']
                }
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(jsonString, 'utf8'));
                this.context.telemetryService.trackEvent('chat_session_exported');
            }
        } catch (error) {
            this.context.loggingService.error('Failed to export chat session', error);
            throw error;
        }
    }

    private getActiveSession(): ChatSession | undefined {
        if (!this.activeSessionId) {
            return undefined;
        }
        return this.sessions.find(s => s.id === this.activeSessionId);
    }

    private async loadSessions(): Promise<void> {
        try {
            const storedData = this.context.globalState.get<string>('m31-agent.chatSessions');
            if (storedData) {
                this.sessions = JSON.parse(storedData);
                this.context.loggingService.debug(`Loaded ${this.sessions.length} chat sessions`);
            }
        } catch (error) {
            this.context.loggingService.error('Failed to load chat sessions', error);
            this.sessions = [];
        }
    }

    private saveSessions(): void {
        try {
            // Limit to the 50 most recent sessions
            const recentSessions = this.sessions.slice(0, 50);
            this.context.globalState.update('m31-agent.chatSessions', JSON.stringify(recentSessions));
            this.context.loggingService.debug(`Saved ${recentSessions.length} chat sessions`);
        } catch (error) {
            this.context.loggingService.error('Failed to save chat sessions', error);
        }
    }

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }
} 