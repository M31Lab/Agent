import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { AIRequestType } from '../../models/ai/aiRequestType';

export function registerCodeGenerationCommands(
    context: ExtensionContext,
    { statusBarManager: _ }: CommandDependencies
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];

    // Generate Code command
    const generateCode = vscode.commands.registerCommand('m31-agent.generateCode', async () => {
        context.loggingService.info('Executing command: m31-agent.generateCode');
        context.telemetryService.trackEvent('generateCode');
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        
        const prompt = await vscode.window.showInputBox({
            placeHolder: 'Describe the code you want to generate',
            prompt: 'M31-Agent: Code Generation'
        });
        
        if (!prompt) {
            return;
        }
        
        await generateCodeFromPrompt(context, prompt, editor);
    });
    disposables.push(generateCode);
    
    // Explain Code command
    const explainCode = vscode.commands.registerCommand('m31-agent.explainCode', async () => {
        context.loggingService.info('Executing command: m31-agent.explainCode');
        context.telemetryService.trackEvent('explainCode');
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage('Please select code to explain');
            return;
        }
        
        const selectedText = editor.document.getText(selection);
        await explainSelectedCode(context, selectedText);
    });
    disposables.push(explainCode);

    return disposables;
}

async function generateCodeFromPrompt(
    context: ExtensionContext,
    prompt: string,
    editor: vscode.TextEditor
): Promise<void> {
    const apiClient = OpenRouterApiClient.getInstance();
    if (!apiClient) {
        vscode.window.showErrorMessage('API client not initialized');
        return;
    }
    
    if (!context.authenticationService.isAuthenticated()) {
        const authenticated = await context.authenticationService.ensureAuthenticated();
        if (!authenticated) {
            vscode.window.showErrorMessage('Authentication required to generate code');
            return;
        }
    }
    
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Generating code...',
            cancellable: false
        },
        async () => {
            try {
                const document = editor.document;
                const language = document.languageId;
                const fileName = document.fileName.split('/').pop() || '';
                const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : '';
                
                // Get context around cursor
                const position = editor.selection.active;
                const startLine = Math.max(0, position.line - 10);
                const endLine = Math.min(document.lineCount - 1, position.line + 10);
                const rangeAround = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
                const textAround = document.getText(rangeAround);
                
                const systemPrompt = `You are a code generation assistant. Generate code based on the user's request.
The user is working with a ${language} file ${fileName ? `named ${fileName}` : ''}.
The code should be idiomatic, well-formatted, and follow best practices for ${language}.
Do not include explanations, comments, or markdown formatting - return ONLY the code.`;
                
                const userPrompt = `I'm working on a ${language} ${fileExtension ? `(${fileExtension})` : ''} file and need you to generate code based on my request.

Here's some context from my current file:
\`\`\`${language}
${textAround}
\`\`\`

My cursor is positioned at line ${position.line + 1}.

REQUEST: ${prompt}

Generate ONLY the code I need, without any explanation or markdown.`;
                
                const response = await apiClient.sendRequest({
                    requestType: AIRequestType.Chat,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                });
                
                const generatedCode = response.content.trim();
                
                // Insert the generated code at the cursor position
                await editor.edit(editBuilder => {
                    editBuilder.insert(position, generatedCode);
                });
                
                context.telemetryService.trackEvent('code_generated', 
                    { language, fileExtension: fileExtension || '' },
                    { promptTokens: response.promptTokens, completionTokens: response.completionTokens }
                );
            } catch (error) {
                context.loggingService.error('Failed to generate code', error);
                vscode.window.showErrorMessage('Failed to generate code: ' + 
                    (error instanceof Error ? error.message : String(error)));
            }
        }
    );
}

async function explainSelectedCode(
    context: ExtensionContext,
    selectedCode: string
): Promise<void> {
    const apiClient = OpenRouterApiClient.getInstance();
    if (!apiClient) {
        vscode.window.showErrorMessage('API client not initialized');
        return;
    }
    
    if (!context.authenticationService.isAuthenticated()) {
        const authenticated = await context.authenticationService.ensureAuthenticated();
        if (!authenticated) {
            vscode.window.showErrorMessage('Authentication required to explain code');
            return;
        }
    }
    
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing code...',
            cancellable: false
        },
        async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }
                
                const language = editor.document.languageId;
                
                const systemPrompt = `You are an expert code explanation assistant. Analyze and explain the given code in a structured, comprehensive manner.

Your explanation should include:
1. A high-level overview of what the code does
2. A breakdown of key components, functions, or classes and their purposes
3. The algorithms, patterns, or techniques used
4. Any potential edge cases, performance considerations, or security implications
5. Suggestions for improvements or best practices that could be applied

Structure your response with clear headings and bullet points where appropriate. Be thorough but concise.`;
                
                const userPrompt = `Please explain the following ${language} code:

\`\`\`${language}
${selectedCode}
\`\`\``;
                
                const response = await apiClient.sendRequest({
                    requestType: AIRequestType.Chat,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                });
                
                // Show the explanation in a markdown preview
                const explanation = response.content.trim();
                const explainPanel = vscode.window.createWebviewPanel(
                    'm31-agent.codeExplanation',
                    'Code Explanation',
                    vscode.ViewColumn.Beside,
                    {
                        enableScripts: false
                    }
                );
                
                explainPanel.webview.html = getExplanationHtml(selectedCode, explanation, language);
                
                context.telemetryService.trackEvent('code_explained', 
                    { language },
                    { 
                        promptTokens: response.promptTokens, 
                        completionTokens: response.completionTokens,
                        codeLength: selectedCode.length
                    }
                );
            } catch (error) {
                context.loggingService.error('Failed to explain code', error);
                vscode.window.showErrorMessage('Failed to explain code: ' + 
                    (error instanceof Error ? error.message : String(error)));
            }
        }
    );
}

function getExplanationHtml(code: string, explanation: string, language: string): string {
    // Process markdown in the explanation
    const processedExplanation = processMarkdown(explanation);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Explanation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css">
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            line-height: 1.6;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            max-width: 1200px;
            margin: 0 auto;
        }
        .code-block {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            position: relative;
        }
        .explanation {
            padding: 20px;
            margin: 15px 0;
            background-color: var(--vscode-sideBar-background);
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: var(--vscode-titleBar-activeForeground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
        }
        h1 {
            font-size: 1.8em;
            margin-top: 0;
        }
        h2 {
            font-size: 1.5em;
            margin-top: 25px;
        }
        h3 {
            font-size: 1.2em;
            margin-top: 20px;
        }
        pre {
            margin: 0;
        }
        code {
            font-family: var(--vscode-editor-font-family);
        }
        ul, ol {
            padding-left: 25px;
        }
        li {
            margin-bottom: 5px;
        }
        .language-label {
            position: absolute;
            top: 0;
            right: 10px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 0 0 4px 4px;
            font-size: 0.8em;
            opacity: 0.8;
        }
        .section {
            margin-bottom: 25px;
        }
        .highlight {
            background-color: var(--vscode-editor-selectionBackground);
            padding: 2px 5px;
            border-radius: 3px;
        }
        blockquote {
            border-left: 4px solid var(--vscode-activityBarBadge-background);
            margin-left: 0;
            padding-left: 15px;
            color: var(--vscode-descriptionForeground);
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
        }
        th, td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
        }
    </style>
</head>
<body>
    <h1>Code Explanation</h1>
    
    <h2>Original Code</h2>
    <div class="code-block">
        <div class="language-label">${language}</div>
        <pre><code class="language-${language}">${escapeHtml(code)}</code></pre>
    </div>
    
    <h2>Explanation</h2>
    <div class="explanation">
        ${processedExplanation}
    </div>

    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-java.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-csharp.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-cpp.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-go.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-rust.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-yaml.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markdown.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-sql.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-css.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-html.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            Prism.highlightAll();
        });
    </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function processMarkdown(markdown: string): string {
    // Process code blocks with syntax highlighting
    markdown = markdown.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(code)}</code></pre>`;
    });
    
    // Process inline code
    markdown = markdown.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Process headings
    markdown = markdown.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    markdown = markdown.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    markdown = markdown.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Process bold and italic
    markdown = markdown.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    markdown = markdown.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Process unordered lists
    markdown = markdown.replace(/^\s*[-*+]\s+(.*)/gm, '<li>$1</li>');
    markdown = markdown.replace(/(<li>.*<\/li>)(?!\s*<li>)/gs, '<ul>$1</ul>');
    
    // Process ordered lists
    markdown = markdown.replace(/^\s*\d+\.\s+(.*)/gm, '<li>$1</li>');
    markdown = markdown.replace(/(<li>.*<\/li>)(?!\s*<li>)/gs, '<ol>$1</ol>');
    
    // Process blockquotes
    markdown = markdown.replace(/^>\s(.*$)/gm, '<blockquote>$1</blockquote>');
    
    // Process links
    markdown = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Process line breaks
    markdown = markdown.replace(/\n/g, '<br>');
    
    return markdown;
}
