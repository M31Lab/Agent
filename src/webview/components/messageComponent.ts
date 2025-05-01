import { ChatMessage } from '../interfaces/messageHandlers';
import { markdownToHtml } from '../utils/markdown';

/**
 * Class for creating and rendering chat message elements
 */
export class MessageComponent {
    /**
     * Creates a chat message element
     */
    public static createMessageElement(message: ChatMessage): HTMLElement {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(message.role);
        
        if (message.id) {
            messageElement.setAttribute('data-message-id', message.id);
        }
        
        const headerElement = document.createElement('div');
        headerElement.classList.add('message-header');
        
        const roleLabel = document.createElement('span');
        roleLabel.classList.add('role-label');
        roleLabel.textContent = this.formatRole(message.role);
        headerElement.appendChild(roleLabel);
        
        if (message.timestamp) {
            const timeElement = document.createElement('span');
            timeElement.classList.add('timestamp');
            timeElement.textContent = this.formatTimestamp(message.timestamp);
            headerElement.appendChild(timeElement);
        }
        
        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        
        // Use markdown renderer to format the content
        contentElement.innerHTML = markdownToHtml(message.content);
        
        // Add copy button for assistant messages
        if (message.role === 'assistant') {
            const actionsElement = document.createElement('div');
            actionsElement.classList.add('message-actions');
            
            // Add copy button
            const copyButton = document.createElement('button');
            copyButton.classList.add('action-button');
            copyButton.title = 'Copy message';
            copyButton.innerHTML = '<span class="codicon codicon-copy"></span>';
            copyButton.addEventListener('click', () => this.copyMessageContent(message.content));
            
            actionsElement.appendChild(copyButton);
            
            // If message contains code, add insert to editor button
            if (message.content.includes('```')) {
                const insertButton = document.createElement('button');
                insertButton.classList.add('action-button');
                insertButton.title = 'Insert code to editor';
                insertButton.innerHTML = '<span class="codicon codicon-insert"></span>';
                insertButton.addEventListener('click', () => this.insertCodeToEditor(message.content));
                
                actionsElement.appendChild(insertButton);
            }
            
            messageElement.appendChild(actionsElement);
        }
        
        messageElement.appendChild(headerElement);
        messageElement.appendChild(contentElement);
        
        return messageElement;
    }
    
    /**
     * Creates a loading indicator element
     */
    public static createLoadingElement(): HTMLElement {
        const loadingElement = document.createElement('div');
        loadingElement.classList.add('message', 'assistant', 'loading');
        
        const loadingIndicator = document.createElement('div');
        loadingIndicator.classList.add('loading-indicator');
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            loadingIndicator.appendChild(dot);
        }
        
        loadingElement.appendChild(loadingIndicator);
        
        return loadingElement;
    }
    
    /**
     * Formats the role for display
     */
    private static formatRole(role: string): string {
        switch (role) {
            case 'user':
                return 'You';
            case 'assistant':
                return 'AI';
            case 'system':
                return 'System';
            default:
                return role.charAt(0).toUpperCase() + role.slice(1);
        }
    }
    
    /**
     * Formats a timestamp for display
     */
    private static formatTimestamp(timestamp: number): string {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Copies message content to clipboard
     */
    private static copyMessageContent(content: string): void {
        // Use the VS Code API via messaging
        window.parent.postMessage({
            command: 'copyToClipboard',
            text: content
        }, '*');
        
        // Show a temporary "Copied!" tooltip
        this.showCopiedTooltip();
    }
    
    /**
     * Shows a tooltip indicating content was copied
     */
    private static showCopiedTooltip(): void {
        const tooltip = document.createElement('div');
        tooltip.classList.add('copied-tooltip');
        tooltip.textContent = 'Copied!';
        
        document.body.appendChild(tooltip);
        
        // Position in the center of the viewport
        const rect = tooltip.getBoundingClientRect();
        tooltip.style.top = `${(window.innerHeight - rect.height) / 2}px`;
        tooltip.style.left = `${(window.innerWidth - rect.width) / 2}px`;
        
        // Remove after animation
        setTimeout(() => {
            tooltip.remove();
        }, 2000);
    }
    
    /**
     * Sends code to be inserted into the editor
     */
    private static insertCodeToEditor(markdown: string): void {
        // Extract code blocks
        const codeBlocks: string[] = [];
        const regex = /```(?:\w*\n)?([\s\S]*?)```/g;
        
        let match;
        while ((match = regex.exec(markdown)) !== null) {
            codeBlocks.push(match[1].trim());
        }
        
        if (codeBlocks.length > 0) {
            // Send the first code block to the extension
            window.parent.postMessage({
                command: 'insertCode',
                code: codeBlocks[0]
            }, '*');
        }
    }
} 