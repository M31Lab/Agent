import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { CommandDependencies } from '../commandRegistry';
import { OpenRouterApiClient } from '../../api/client/openRouterApiClient';
import { AIRequestType } from '../../models/ai/aiRequestType';
import { StatusBarManager } from '../../components/statusBar/statusBarManager';

export function registerCodeGenerationCommands(
    context: ExtensionContext,
    dependencies: CommandDependencies
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    const { statusBarManager } = dependencies;

    // Generate Code command
    const generateCode = vscode.commands.registerCommand('m31-agent.generateCode', async () => {
        context.loggingService.info('Executing command: m31-agent.generateCode');
        context.telemetryService.trackCommand('generateCode');
        
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
        context.telemetryService.trackCommand('explainCode');
        
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
        const authenticated = await context.authenticationService.promptForAuthentication();
        if (!authenticated) {
            vscode.window.showErrorMessage('Authentication required to generate code');
            return;
        }
    }
    
    StatusBarManager.getInstance()?.showBusy('Generating code');
    
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
        editor.edit(editBuilder => {
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
    } finally {
        StatusBarManager.getInstance()?.showReady();
    }
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
        const authenticated = await context.authenticationService.promptForAuthentication();
        if (!authenticated) {
            vscode.window.showErrorMessage('Authentication required to explain code');
            return;
        }
    }
    
    StatusBarManager.getInstance()?.showBusy('Analyzing code');
    
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        const language = editor.document.languageId;
        
        const systemPrompt = `You are a code explanation assistant. Explain the given code clearly and concisely.
Focus on the purpose, functionality, and any notable patterns or techniques.
Be thorough but avoid unnecessary verbosity.`;
        
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
    } finally {
        StatusBarManager.getInstance()?.showReady();
    }
}

function getExplanationHtml(code: string, explanation: string, language: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Explanation</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            line-height: 1.6;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
        }
        .code-block {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }
        .explanation {
            padding: 15px;
            margin: 15px 0;
            background-color: var(--vscode-sideBar-background);
            border-radius: 5px;
        }
        h1, h2 {
            color: var(--vscode-titleBar-activeForeground);
        }
    </style>
</head>
<body>
    <h1>Code Explanation</h1>
    
    <h2>Original Code</h2>
    <div class="code-block">
        <pre><code>${escapeHtml(code)}</code></pre>
    </div>
    
    <h2>Explanation</h2>
    <div class="explanation">
        ${explanation.replace(/\n/g, '<br>')}
    </div>
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