import { useCallback } from 'react';

export interface MarkdownOptions {
    skipCodeHighlighting?: boolean;
    inlineCodeClass?: string;
    codeBlockClass?: string;
}

export const useMarkdown = (options: MarkdownOptions = {}): Record<string, unknown>  => {
    const formatMarkdown = useCallback((content: string): string => {
        if (!content) {
            return '';
        }

        let formattedContent = content;
        
        const defaultOptions: Required<MarkdownOptions> = {
            skipCodeHighlighting: false,
            inlineCodeClass: 'inline-code',
            codeBlockClass: 'code-block',
            ...options
        };
        
        // Replace code blocks
        if (!defaultOptions.skipCodeHighlighting) {
            // Handle code blocks with language specification
            formattedContent = formattedContent.replace(
                /```(\w+)?\n([\s\S]*?)```/g, 
                (_, language, code) => {
                    const langClass = language ? ` language-${language}` : '';
                    return `<pre class="${defaultOptions.codeBlockClass}${langClass}"><code>${escapeHtml(code.trim())}</code></pre>`;
                }
            );
        }
        
        // Replace inline code
        formattedContent = formattedContent.replace(
            /`([^`]+)`/g, 
            `<code class="${defaultOptions.inlineCodeClass}">$1</code>`
        );
        
        // Replace headings (h1, h2, h3)
        formattedContent = formattedContent.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        formattedContent = formattedContent.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        formattedContent = formattedContent.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
        
        // Replace bold and italic
        formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Replace links
        formattedContent = formattedContent.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g, 
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Replace unordered lists
        formattedContent = formattedContent.replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>');
        formattedContent = formattedContent.replace(/(<li>.*?<\/li>)\n(?!<li>)/g, '$1</ul>');
        formattedContent = formattedContent.replace(/(?<!<\/ul>)\n<li>/g, '<ul><li>');
        
        // Replace ordered lists
        formattedContent = formattedContent.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li>$1</li>');
        formattedContent = formattedContent.replace(/(<li>.*?<\/li>)\n(?!<li>)/g, '$1</ol>');
        formattedContent = formattedContent.replace(/(?<!<\/ol>)\n<li>/g, '<ol><li>');
        
        // Replace paragraphs and line breaks
        formattedContent = formattedContent.replace(/\n\n/g, '</p><p>');
        formattedContent = formattedContent.replace(/\n/g, '<br>');
        
        // Wrap in paragraph if needed
        if (!formattedContent.startsWith('<')) {
            formattedContent = `<p>${formattedContent}</p>`;
        }
        
        return formattedContent;
    }, [options]);
    
    const extractCodeBlocks = useCallback((markdown: string): string[] => {
        const codeBlocks: string[] = [];
        const regex = /```(?:\w*\n)?([\s\S]*?)```/g;
        
        let match;
        while ((match = regex.exec(markdown)) !== null) {
            codeBlocks.push(match[1].trim());
        }
        
        return codeBlocks;
    }, []);
    
    return {
        formatMarkdown,
        extractCodeBlocks
    };
};

const escapeHtml = (unsafe: string): string => {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}; 