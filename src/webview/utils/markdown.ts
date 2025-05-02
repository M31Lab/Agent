/**
 * Utility functions for handling markdown content
 */

/**
 * Converts markdown to HTML for display in the webview
 * This is a basic implementation - in production you'd use a library like marked
 */
export function markdownToHtml(markdown: string): string {
    if (!markdown) {
        return '';
    }

    let html = markdown;

    // Handle code blocks with syntax highlighting
    html = html.replace(/```(\w*)([\s\S]*?)```/g, (match, language, code) => {
        return `<pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
    });

    // Handle inline code
    html = html.replace(/`([^`]+)`/g, (match, code) => {
        return `<code>${escapeHtml(code)}</code>`;
    });

    // Handle paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    
    // Handle line breaks
    html = html.replace(/\n/g, '<br>');
    
    // Handle bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Wrap in paragraph tags if needed
    if (!html.startsWith('<')) {
        html = `<p>${html}</p>`;
    }
    
    return html;
}

/**
 * Escapes HTML special characters
 */
export function escapeHtml(html: string): string {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Extracts code blocks from markdown
 */
export function extractCodeBlocks(markdown: string): string[] {
    const codeBlocks: string[] = [];
    const regex = /```(?:\w*\n)?([\s\S]*?)```/g;
    
    let match;
    while ((match = regex.exec(markdown)) !== null) {
        codeBlocks.push(match[1].trim());
    }
    
    return codeBlocks;
}

/**
 * Check if string contains a code block
 */
export function containsCodeBlock(text: string): boolean {
    return /```[\s\S]*?```/g.test(text);
}

/**
 * Adds syntax highlighting classes to code blocks (to be used with a syntax highlighting library)
 */
export function highlightCode(html: string): string {
    // Replace with actual syntax highlighting implementation
    // This would typically use a library like highlight.js or prismjs
    return html;
} 