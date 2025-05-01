# M31-Agent: AI-Powered Coding Assistant

## Overview

M31-Agent is a powerful AI coding assistant for VS Code that helps developers write, understand, and navigate code more efficiently. Powered by OpenRouter AI, this extension brings natural language understanding to your coding workflow, allowing you to chat with an AI assistant directly from your editor.

## Features

- **AI Chat**: Engage in natural language conversations with the AI about your code and programming problems
- **Code Generation**: Generate code snippets or complete functions based on natural language descriptions
- **Code Explanation**: Select any code and get a detailed explanation of what it does
- **Terminal Commands**: Run or generate terminal commands using natural language
- **Codebase Navigation**: Easily find relevant files and understand project structure
- **Multi-Language Support**: Works with all major programming languages including JavaScript, TypeScript, Python, Java, C/C++, C#, Go, Ruby, PHP, Rust, and more

## Installation

You can install M31-Agent directly from the VS Code Marketplace:

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "M31-Agent"
4. Click Install

## Quick Start

1. **Get an OpenRouter API Key**:
   - Sign up at [openrouter.ai](https://openrouter.ai/)
   - Generate an API key from your account dashboard

2. **Configure the Extension**:
   - Open the command palette (Ctrl+Shift+P / Cmd+Shift+P)
   - Run the command "M31-Agent: Configure Settings"
   - Enter your API key when prompted

3. **Start using M31-Agent**:
   - Click the M31-Agent icon in the status bar, or
   - Use the keyboard shortcut (Ctrl+Alt+M / Cmd+Alt+M), or
   - Open the command palette and run "M31-Agent: Show Chat"

## Key Commands

- **M31-Agent: Show Chat** - Open the AI chat panel
- **M31-Agent: Generate Code** - Generate code based on a description
- **M31-Agent: Explain Code** - Explain the selected code
- **M31-Agent: Run Command** - Execute or generate a terminal command
- **M31-Agent: Navigate Codebase** - Find and navigate to files in your project
- **M31-Agent: Configure Settings** - Configure the extension settings

## Usage Examples

### Generate Code
```
> Generate a React component that displays a list of users with pagination
```

### Explain Code
Select a piece of code and run the "M31-Agent: Explain Code" command to get a detailed explanation of what the code does.

### Run Terminal Commands
```
> Run a command to find all JavaScript files modified in the last 7 days
```

### Navigate Codebase
```
> Find files related to user authentication
```

## Configuration Options

- **API Key**: Your OpenRouter API key
- **AI Model**: Select from various available models (GPT-4, Claude, etc.)
- **Max Tokens**: Maximum response length
- **Temperature**: Controls randomness of responses (0.0-1.0)
- **Require Confirmation**: Prompt for confirmation before running commands
- **Telemetry**: Enable/disable anonymous usage data collection

## Privacy & Security

- Your code is only sent to the AI service when you explicitly request assistance
- API keys are stored securely in VS Code's secret storage
- All API communication is encrypted with TLS
- You must confirm before any file modifications or terminal commands are executed

## Feedback & Support

- [GitHub Issue Tracker](https://github.com/m31-ai/m31-agent-vscode/issues)
- [Documentation](https://github.com/m31-ai/m31-agent-vscode/wiki)
- Email: support@m31-ai.com

## License

MIT - See LICENSE file for details 