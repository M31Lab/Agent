import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CustomToolsService } from '../services/customTools/customToolsService';
import { CustomToolEndpoint } from '../models/customTool';

interface EndpointQuickPickItem extends vscode.QuickPickItem {
    endpoint: CustomToolEndpoint;
}

interface ToolQuickPickItem extends vscode.QuickPickItem {
    tool: any;
}

export function registerCustomToolsCommands(
    context: vscode.ExtensionContext,
    customToolsService: CustomToolsService
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.customTools.create', async () => {
            try {
                const name = await vscode.window.showInputBox({
                    prompt: 'Enter a name for the custom tool',
                    placeHolder: 'MyTool'
                });
                
                if (!name) {
                    return;
                }
                
                const description = await vscode.window.showInputBox({
                    prompt: 'Enter a description for the custom tool',
                    placeHolder: 'This tool does...'
                });
                
                if (!description) {
                    return;
                }
                
                // Let the user select a server file or create one from a template
                const fileOption = await vscode.window.showQuickPick(
                    ['Create from template', 'Select existing file'],
                    { placeHolder: 'How would you like to create the server?' }
                );
                
                if (!fileOption) {
                    return;
                }
                
                let serverCode = '';
                
                if (fileOption === 'Create from template') {
                    serverCode = getServerTemplate(name);
                } else {
                    const files = await vscode.workspace.findFiles('**/*.js');
                    
                    const fileItems = files.map(file => ({
                        label: vscode.workspace.asRelativePath(file),
                        file
                    }));
                    
                    const filePick = await vscode.window.showQuickPick(fileItems, {
                        placeHolder: 'Select a JavaScript server file'
                    });
                    
                    if (!filePick) {
                        return;
                    }
                    
                    serverCode = fs.readFileSync(filePick.file.fsPath, 'utf8');
                }
                
                // Define endpoints
                const endpointCount = await vscode.window.showInputBox({
                    prompt: 'How many endpoints would you like to define?',
                    placeHolder: '1',
                    value: '1',
                    validateInput: input => {
                        const num = parseInt(input);
                        return isNaN(num) || num < 1 || num > 10 
                            ? 'Please enter a number between 1 and 10' 
                            : null;
                    }
                });
                
                if (!endpointCount) {
                    return;
                }
                
                const endpoints: CustomToolEndpoint[] = [];
                
                for (let i = 0; i < parseInt(endpointCount); i++) {
                    const endpointName = await vscode.window.showInputBox({
                        prompt: `Enter a name for endpoint ${i + 1}`,
                        placeHolder: 'getData',
                        value: i === 0 ? 'execute' : `endpoint${i + 1}`
                    });
                    
                    if (!endpointName) {
                        return;
                    }
                    
                    const endpointDescription = await vscode.window.showInputBox({
                        prompt: `Enter a description for ${endpointName}`,
                        placeHolder: 'This endpoint...'
                    });
                    
                    if (!endpointDescription) {
                        return;
                    }
                    
                    const method = await vscode.window.showQuickPick(
                        ['GET', 'POST', 'PUT', 'DELETE'],
                        { placeHolder: 'Select HTTP method' }
                    );
                    
                    if (!method) {
                        return;
                    }
                    
                    const path = await vscode.window.showInputBox({
                        prompt: 'Enter the endpoint path',
                        placeHolder: '/api/data',
                        value: `/${endpointName}`
                    });
                    
                    if (!path) {
                        return;
                    }
                    
                    endpoints.push({
                        id: `endpoint-${i + 1}`,
                        name: endpointName,
                        description: endpointDescription,
                        method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
                        path,
                        requiresAuth: false
                    });
                }
                
                const autoStart = await vscode.window.showQuickPick(
                    ['Yes', 'No'],
                    { placeHolder: 'Auto-start the server?' }
                );
                
                const tool = await customToolsService.createTool(
                    name,
                    description,
                    serverCode,
                    endpoints,
                    {
                        autoStart: autoStart === 'Yes'
                    }
                );
                
                vscode.window.showInformationMessage(`Custom tool created: ${name}`);
                
                return tool;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create custom tool: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.customTools.install', async () => {
            try {
                const url = await vscode.window.showInputBox({
                    prompt: 'Enter the URL of the custom tool server',
                    placeHolder: 'https://example.com',
                    validateInput: input => {
                        return input.startsWith('http://') || input.startsWith('https://') 
                            ? null 
                            : 'URL must start with http:// or https://';
                    }
                });
                
                if (!url) {
                    return;
                }
                
                const tool = await customToolsService.installExternalTool(url);
                
                vscode.window.showInformationMessage(`Custom tool installed: ${tool.name}`);
                
                return tool;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to install custom tool: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.customTools.list', async () => {
            try {
                const tools = customToolsService.getAllTools();
                
                if (tools.length === 0) {
                    vscode.window.showInformationMessage('No custom tools found.');
                    return;
                }
                
                const toolItems: ToolQuickPickItem[] = tools.map(tool => ({
                    label: tool.name,
                    description: tool.description,
                    detail: `Version: ${tool.version}, Endpoints: ${tool.endpoints.length}`,
                    tool
                }));
                
                const toolPick = await vscode.window.showQuickPick(toolItems, {
                    placeHolder: 'Select a custom tool to view or run'
                });
                
                if (!toolPick) {
                    return;
                }
                
                const action = await vscode.window.showQuickPick(
                    ['View Details', 'Start Server', 'Stop Server', 'Invoke Endpoint', 'Uninstall'],
                    { placeHolder: 'Select an action' }
                );
                
                if (!action) {
                    return;
                }
                
                const tool = toolPick.tool;
                
                switch (action) {
                    case 'View Details':
                        await viewToolDetails(tool);
                        break;
                    case 'Start Server':
                        await customToolsService.startToolServer(tool.id);
                        vscode.window.showInformationMessage(`Server started for tool: ${tool.name}`);
                        break;
                    case 'Stop Server':
                        await customToolsService.stopToolServer(tool.id);
                        vscode.window.showInformationMessage(`Server stopped for tool: ${tool.name}`);
                        break;
                    case 'Invoke Endpoint':
                        await invokeToolEndpoint(customToolsService, tool);
                        break;
                    case 'Uninstall':
                        {
                            const confirm = await vscode.window.showWarningMessage(
                                `Are you sure you want to uninstall the tool "${tool.name}"?`,
                                { modal: true },
                                'Uninstall',
                                'Cancel'
                            );
                            
                            if (confirm === 'Uninstall') {
                                await customToolsService.uninstallTool(tool.id);
                                vscode.window.showInformationMessage(`Tool uninstalled: ${tool.name}`);
                            }
                        }
                        break;
                }
                
                return tool;
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to list custom tools: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    );
    
    return disposables;
}

async function viewToolDetails(tool: any): Promise<void> {
    const content = formatToolDetails(tool);
    
    const document = await vscode.workspace.openTextDocument({
        content,
        language: 'markdown'
    });
    
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
}

async function invokeToolEndpoint(customToolsService: CustomToolsService, tool: any): Promise<void> {
    try {
        if (tool.endpoints.length === 0) {
            vscode.window.showErrorMessage('This tool has no endpoints.');
            return;
        }
        
        const endpointItems: EndpointQuickPickItem[] = tool.endpoints.map((endpoint: CustomToolEndpoint) => ({
            label: endpoint.name,
            description: endpoint.description,
            detail: `${endpoint.method} ${endpoint.path}`,
            endpoint: endpoint
        }));
        
        const endpointPick = await vscode.window.showQuickPick(endpointItems, {
            placeHolder: 'Select an endpoint to invoke'
        });
        
        if (!endpointPick) {
            return;
        }
        
        const endpoint = endpointPick.endpoint;
        
        // For simplicity, we'll just handle simple parameter types here
        const parameters: Record<string, any> = {};
        
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            for (const param of endpoint.parameters) {
                const paramValue = await vscode.window.showInputBox({
                    prompt: `Enter value for parameter "${param.name}" (${param.description})`,
                    placeHolder: param.required ? 'Required' : 'Optional',
                    value: param.defaultValue?.toString() || ''
                });
                
                if (param.required && !paramValue) {
                    vscode.window.showErrorMessage(`Parameter "${param.name}" is required.`);
                    return;
                }
                
                if (paramValue) {
                    let convertedValue;
                    // Convert to the correct type
                    switch (param.type) {
                        case 'number':
                            convertedValue = parseFloat(paramValue);
                            break;
                        case 'boolean':
                            convertedValue = paramValue.toLowerCase() === 'true';
                            break;
                        default:
                            convertedValue = paramValue;
                    }
                    parameters[param.name] = convertedValue;
                }
            }
        }
        
        const result = await customToolsService.invokeTool(tool.id, endpoint.id, parameters);
        
        // Display the result
        const resultContent = formatToolResult(endpoint, parameters, result);
        
        const document = await vscode.workspace.openTextDocument({
            content: resultContent,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to invoke endpoint: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function formatToolDetails(tool: any): string {
    let content = `# Custom Tool: ${tool.name}\n\n`;
    
    content += `**Description:** ${tool.description}\n\n`;
    content += `**Version:** ${tool.version}\n`;
    content += `**Server URL:** ${tool.serverUrl}\n`;
    
    if (tool.author) {
        content += `**Author:** ${tool.author}\n`;
    }
    
    content += `**Created:** ${new Date(tool.createdAt).toLocaleString()}\n`;
    content += `**Last Updated:** ${new Date(tool.updatedAt).toLocaleString()}\n\n`;
    
    content += `## Endpoints (${tool.endpoints.length})\n\n`;
    
    for (const endpoint of tool.endpoints) {
        content += `### ${endpoint.name}\n\n`;
        content += `**Description:** ${endpoint.description}\n\n`;
        content += `**Method:** ${endpoint.method}\n`;
        content += `**Path:** ${endpoint.path}\n`;
        
        if (endpoint.parameters && endpoint.parameters.length > 0) {
            content += '\n**Parameters:**\n\n';
            
            for (const param of endpoint.parameters) {
                content += `- \`${param.name}\` (${param.type}${param.required ? ', required' : ''}): ${param.description}\n`;
                
                if (param.defaultValue !== undefined) {
                    content += `  - Default: \`${param.defaultValue}\`\n`;
                }
                
                if (param.options && param.options.length > 0) {
                    content += `  - Options: ${param.options.map((o: any) => `\`${o}\``).join(', ')}\n`;
                }
            }
        }
        
        content += '\n';
    }
    
    return content;
}

function formatToolResult(endpoint: any, parameters: Record<string, any>, result: any): string {
    let content = '# Tool Invocation Result\n\n';
    
    content += `**Endpoint:** ${endpoint.name} (${endpoint.method} ${endpoint.path})\n\n`;
    
    content += '## Parameters\n\n';
    
    if (Object.keys(parameters).length === 0) {
        content += 'No parameters were provided.\n\n';
    } else {
        content += '```json\n';
        content += JSON.stringify(parameters, null, 2);
        content += '\n```\n\n';
    }
    
    content += '## Result\n\n';
    
    if (result.error) {
        content += `**Error:** ${result.error}\n\n`;
    } else {
        content += `**Status:** ${result.status}\n`;
        content += `**Execution Time:** ${result.executionTime}ms\n\n`;
        
        content += '```json\n';
        content += JSON.stringify(result.data, null, 2);
        content += '\n```\n\n';
    }
    
    return content;
}

function getServerTemplate(toolName: string): string {
    return `
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8642;

app.use(cors());
app.use(express.json());

// Manifest endpoint for discovery
app.get('/manifest.json', (req, res) => {
    res.json({
        name: '${toolName}',
        version: '1.0.0',
        description: 'A custom tool for M31-Agent',
        endpoints: {
            'GET /execute': {
                description: 'Execute the main functionality',
                parameters: {
                    query: {
                        type: 'string',
                        description: 'The query to process',
                        required: true
                    },
                    maxResults: {
                        type: 'number',
                        description: 'Maximum number of results to return',
                        required: false,
                        defaultValue: 10
                    }
                },
                returnSchema: {
                    type: 'object',
                    properties: {
                        results: {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        },
                        timestamp: {
                            type: 'number'
                        }
                    }
                }
            }
        }
    });
});

// Main execution endpoint
app.get('/execute', (req, res) => {
    const query = req.query.query;
    const maxResults = parseInt(req.query.maxResults || '10');
    
    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // This is where you would implement your actual logic
    const results = [];
    for (let i = 0; i < maxResults; i++) {
        results.push(\`Result \${i + 1} for query: \${query}\`);
    }
    
    res.json({
        results,
        timestamp: Date.now()
    });
});

// Start the server
app.listen(port, () => {
    console.log(\`Server listening on port \${port}\`);
});
`;
} 