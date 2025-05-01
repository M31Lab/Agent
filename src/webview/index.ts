// Main entry point for the webview
import { vscode } from './utils/vscode';
import './styles/index.css';

// Initialize message passing with VS Code
const messageHandler = (event: MessageEvent) => {
    const message = event.data;
    
    switch (message.command) {
        case 'initialize':
            renderApp(message.data);
            break;
        case 'receiveMessage':
            addMessage(message.message);
            break;
        case 'clearChat':
            clearMessages();
            break;
        case 'setProcessing':
            setProcessingState(message.isProcessing);
            break;
        case 'showError':
            showError(message.message);
            break;
    }
};

window.addEventListener('message', messageHandler);

// Initialize UI elements
const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;
const clearButton = document.getElementById('clear-button') as HTMLButtonElement;
const errorContainer = document.getElementById('error-container') as HTMLDivElement;

// Handle form submission
const handleSubmit = () => {
    const messageText = messageInput.value.trim();
    if (messageText) {
        const userMessage = {
            role: 'user',
            content: messageText
        };
        
        addMessage(userMessage);
        vscode.postMessage({
            command: 'sendMessage',
            text: messageText
        });
        
        messageInput.value = '';
        setProcessingState(true);
    }
};

// Attach event listeners
sendButton.addEventListener('click', handleSubmit);
clearButton.addEventListener('click', () => {
    vscode.postMessage({
        command: 'clearChat'
    });
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
});

// Render the chat interface
function renderApp(initialData: any) {
    if (initialData.messages && initialData.messages.length) {
        initialData.messages.forEach((message: any) => {
            addMessage(message);
        });
    }
}

// Add a message to the chat
function addMessage(message: any) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(message.role);
    
    const contentElement = document.createElement('div');
    contentElement.classList.add('content');
    
    // Support markdown rendering with code highlighting
    contentElement.innerHTML = formatMessageContent(message.content);
    
    messageElement.appendChild(contentElement);
    chatContainer.appendChild(messageElement);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Clear all messages
function clearMessages() {
    chatContainer.innerHTML = '';
}

// Set processing state (loading indicator)
function setProcessingState(isProcessing: boolean) {
    document.body.classList.toggle('processing', isProcessing);
    sendButton.disabled = isProcessing;
    messageInput.disabled = isProcessing;
    
    if (isProcessing) {
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('message', 'assistant', 'loading');
        loadingElement.innerHTML = '<div class="loading-indicator"><div></div><div></div><div></div></div>';
        chatContainer.appendChild(loadingElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } else {
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }
}

// Show error message
function showError(message: string) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}

// Format message content with markdown and code highlighting
function formatMessageContent(content: string): string {
    // Simple formatting - in a real implementation use a markdown library
    // Replace code blocks
    content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Replace inline code
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Replace line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Let VS Code know the webview is ready
    vscode.postMessage({
        command: 'webviewReady'
    });
}); 