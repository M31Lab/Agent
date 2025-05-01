import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { McpService } from '../../services/mcp/mcpService';
import { ExtensionContext } from '../../models/context/extensionContext';
import { McpEndpoint, McpParameter } from '../../models/mcpTool';

export function registerMcpCommands(
    context: ExtensionContext
): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    const mcpService = McpService.getInstance(context);
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.mcp.addTool', async () => {
            try {
                const name = await vscode.window.showInputBox({
                    prompt: 'Enter a name for the MCP tool',
                    placeHolder: 'Tool name'
                });
                
                if (!name) {
                    return;
                }
                
                const description = await vscode.window.showInputBox({
                    prompt: 'Enter a description for the MCP tool',
                    placeHolder: 'Tool description'
                });
                
                if (!description) {
                    return;
                }
                
                const author = await vscode.window.showInputBox({
                    prompt: 'Enter the author name',
                    placeHolder: 'Author',
                    value: 'M31-Agent'
                });
                
                if (!author) {
                    return;
                }
                
                // Create a template for the MCP server
                const templatePath = await createMcpServerTemplate(context, name);
                
                // Create an initial endpoint
                const initialEndpoint: McpEndpoint = {
                    id: 'initial',
                    name: 'execute',
                    description: 'Execute the tool function',
                    parameters: [
                        {
                            name: 'input',
                            description: 'The input to process',
                            type: 'string',
                            required: true
                        }
                    ],
                    returnSchema: { type: 'object' }
                };
                
                // Create the tool
                const toolId = await mcpService.createTool(
                    name,
                    description,
                    author,
                    [initialEndpoint]
                );
                
                // Create the server
                const serverConfig = await mcpService.createServer(
                    `${name} Server`,
                    templatePath,
                    undefined, // Use default port
                    true // Auto-start
                );
                
                vscode.window.showInformationMessage(`MCP tool "${name}" created successfully`);
                
                // Open the template file for editing
                const document = await vscode.workspace.openTextDocument(templatePath);
                await vscode.window.showTextDocument(document);
                
                return { toolId, serverConfig };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to create MCP tool: ${errorMessage}`);
            }
        })
    );
    
    disposables.push(
        vscode.commands.registerCommand('m31-agent.mcp.listTools', async () => {
            try {
                const tools = mcpService.getAllTools();
                
                if (tools.length === 0) {
                    vscode.window.showInformationMessage('No MCP tools found');
                    return;
                }
                
                const toolItems = tools.map(tool => ({
                    label: tool.name,
                    description: tool.description,
                    detail: `Author: ${tool.author}, Version: ${tool.version}`,
                    toolId: tool.id
                }));
                
                const selectedTool = await vscode.window.showQuickPick(toolItems, {
                    placeHolder: 'Select a tool to view or manage'
                });
                
                if (!selectedTool) {
                    return;
                }
                
                const actions = [
                    { label: 'View Details', value: 'view' },
                    { label: 'Add Endpoint', value: 'add-endpoint' },
                    { label: 'Delete Tool', value: 'delete' }
                ];
                
                const selectedAction = await vscode.window.showQuickPick(actions, {
                    placeHolder: 'Select an action'
                });
                
                if (!selectedAction) {
                    return;
                }
                
                const tool = mcpService.getToolById(selectedTool.toolId);
                if (!tool) {
                    vscode.window.showErrorMessage(`Tool ${selectedTool.label} not found`);
                    return;
                }
                
                switch (selectedAction.value) {
                    case 'view':
                        // Display tool details
                        const detailsPanel = vscode.window.createWebviewPanel(
                            'mcpToolDetails',
                            `MCP Tool: ${tool.name}`,
                            vscode.ViewColumn.One,
                            {}
                        );
                        
                        detailsPanel.webview.html = generateToolDetailsHtml(tool);
                        break;
                        
                    case 'add-endpoint':
                        // Add a new endpoint
                        await addEndpointToTool(context, tool.id);
                        break;
                        
                    case 'delete':
                        // Confirm deletion
                        const confirmDelete = await vscode.window.showWarningMessage(
                            `Are you sure you want to delete the tool "${tool.name}"?`,
                            { modal: true },
                            'Delete'
                        );
                        
                        if (confirmDelete === 'Delete') {
                            await mcpService.deleteToolById(tool.id);
                            vscode.window.showInformationMessage(`Tool "${tool.name}" deleted`);
                        }
                        break;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Error managing MCP tools: ${errorMessage}`);
            }
        })
    );
    
    return disposables;
}

async function createMcpServerTemplate(
    context: ExtensionContext,
    toolName: string
): Promise<string> {
    // Create a directory for MCP servers if it doesn't exist
    const mcpDir = path.join(context.globalStoragePath, 'mcp-tools', 'servers');
    await fs.mkdir(mcpDir, { recursive: true });
    
    // Sanitize tool name for filename
    const sanitizedName = toolName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const serverFilePath = path.join(mcpDir, `${sanitizedName}_server.js`);
    
    // Create a basic template
    const template = `
const http = require('http');
const url = require('url');

/**
 * ${toolName} MCP Server
 * 
 * This server provides an HTTP API for the ${toolName} MCP tool.
 * Edit this file to implement your custom tool functionality.
 */

function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Extract the endpoint from the path
    const endpoint = path.split('/').filter(Boolean)[1];
    
    // Handle API requests
    if (path.startsWith('/api/')) {
        if (endpoint === 'execute' && req.method === 'POST') {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    
                    // TODO: Implement your tool functionality here
                    const result = {
                        message: 'Tool executed successfully',
                        input: data.input,
                        timestamp: new Date().toISOString()
                    };
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
}

// Export the handler function for the MCP service
exports.handler = handleRequest;

// For local testing
if (require.main === module) {
    const server = http.createServer(handleRequest);
    const port = process.env.PORT || 9000;
    
    server.listen(port, () => {
        console.log(\`${toolName} MCP server running on port \${port}\`);
    });
}
`;

    await fs.writeFile(serverFilePath, template, 'utf8');
    return serverFilePath;
}

async function addEndpointToTool(
    context: ExtensionContext,
    toolId: string
): Promise<void> {
    const mcpService = McpService.getInstance(context);
    
    const tool = mcpService.getToolById(toolId);
    if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
    }
    
    const name = await vscode.window.showInputBox({
        prompt: 'Enter a name for the endpoint',
        placeHolder: 'Endpoint name'
    });
    
    if (!name) {
        return;
    }
    
    const description = await vscode.window.showInputBox({
        prompt: 'Enter a description for the endpoint',
        placeHolder: 'Endpoint description'
    });
    
    if (!description) {
        return;
    }
    
    const parameters: McpParameter[] = [];
    
    let addMore = true;
    while (addMore) {
        const paramName = await vscode.window.showInputBox({
            prompt: 'Enter parameter name (or leave empty to finish)',
            placeHolder: 'Parameter name'
        });
        
        if (!paramName) {
            addMore = false;
            continue;
        }
        
        const paramDescription = await vscode.window.showInputBox({
            prompt: 'Enter parameter description',
            placeHolder: 'Parameter description'
        });
        
        const paramType = await vscode.window.showQuickPick(
            ['string', 'number', 'boolean', 'object', 'array'],
            { placeHolder: 'Select parameter type' }
        );
        
        const isRequired = await vscode.window.showQuickPick(
            ['Yes', 'No'],
            { placeHolder: 'Is this parameter required?' }
        );
        
        if (paramName && paramDescription && paramType && isRequired) {
            parameters.push({
                name: paramName,
                description: paramDescription,
                type: paramType as any,
                required: isRequired === 'Yes'
            });
        }
    }
    
    const endpoint: McpEndpoint = {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name,
        description,
        parameters,
        returnSchema: { type: 'object' }
    };
    
    // Add the endpoint to the tool
    tool.endpoints.push(endpoint);
    tool.lastModified = Date.now();
    
    // Update the tool
    await mcpService.updateTool(tool);
    
    vscode.window.showInformationMessage(`Endpoint "${name}" added to tool "${tool.name}"`);
}

function generateToolDetailsHtml(tool: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Tool: ${tool.name}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        h1, h2, h3 {
            color: var(--vscode-editor-foreground);
        }
        .tool-header {
            margin-bottom: 20px;
        }
        .tool-meta {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
        }
        .endpoint {
            border: 1px solid var(--vscode-panel-border);
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
        }
        .parameter {
            margin-left: 20px;
            padding: 5px 0;
        }
        .required {
            color: var(--vscode-errorForeground);
        }
    </style>
</head>
<body>
    <div class="tool-header">
        <h1>${tool.name}</h1>
        <div class="tool-meta">
            <p>${tool.description}</p>
            <p>Author: ${tool.author}</p>
            <p>Version: ${tool.version}</p>
            <p>Created: ${new Date(tool.created).toLocaleString()}</p>
            <p>Last Modified: ${new Date(tool.lastModified).toLocaleString()}</p>
        </div>
    </div>
    
    <h2>Endpoints</h2>
    ${tool.endpoints.map((endpoint: McpEndpoint) => `
        <div class="endpoint">
            <h3>${endpoint.name}</h3>
            <p>${endpoint.description}</p>
            
            <h4>Parameters</h4>
            ${endpoint.parameters.length === 0 ? '<p>No parameters</p>' : 
                endpoint.parameters.map((param: McpParameter) => `
                    <div class="parameter">
                        <p>
                            <strong>${param.name}</strong> 
                            (${param.type}) 
                            ${param.required ? '<span class="required">[Required]</span>' : '[Optional]'}
                        </p>
                        <p>${param.description}</p>
                    </div>
                `).join('')
            }
        </div>
    `).join('')}
</body>
</html>
`;
} 