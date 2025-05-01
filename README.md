# ✨ M31-Agent: Your AI-Powered Coding Companion for VS Code ✨

![M31-Agent Logo](resources/icon.svg)

[![VSCode Marketplace](https://img.shields.io/visual-studio-marketplace/v/m31-ai.m31-agent.svg)](https://marketplace.visualstudio.com/items?itemName=m31-ai.m31-agent)  
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/m31-ai.m31-agent.svg)](https://marketplace.visualstudio.com/items?itemName=m31-ai.m31-agent)  
[![Rating](https://img.shields.io/visual-studio-marketplace/r/m31-ai.m31-agent.svg)](https://marketplace.visualstudio.com/items?itemName=m31-ai.m31-agent)  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📚 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Comparison with Other Coding Assistants](#comparison-with-other-coding-assistants)
- [Installation](#installation)
- [Quick Start Guide](#quick-start-guide)
- [OpenRouter AI Integration](#openrouter-ai-integration)
- [User Interface](#user-interface)
- [Detailed Feature Documentation](#detailed-feature-documentation)
  - [AI Chat](#ai-chat)
  - [Code Generation](#code-generation)
  - [Code Explanation](#code-explanation)
  - [Terminal Commands](#terminal-commands)
  - [Codebase Navigation](#codebase-navigation)
  - [Code Refactoring](#code-refactoring)
  - [Debugging Assistance](#debugging-assistance)
  - [Documentation Generation](#documentation-generation)
  - [Test Generation](#test-generation)
- [Configuration and Settings](#configuration-and-settings)
- [Language Support](#language-support)
- [Advanced Usage](#advanced-usage)
- [Integration with Development Workflows](#integration-with-development-workflows)
- [API Reference](#api-reference)
- [Extension Architecture](#extension-architecture)
- [Privacy and Security](#privacy-and-security)
- [AI Provider Options](#ai-provider-options)
- [Performance Optimizations](#performance-optimizations)
- [❓ Troubleshooting and FAQs](#troubleshooting-and-faqs)
- [🤝 Contributing](#contributing)
- [👨‍💻 Development Guide](#development-guide)
- [📅 Roadmap](#roadmap)
- [📅 Changelog](#changelog)
- [📄 Legal Information](#legal-information)
- [🤝 Support and Community](#support-and-community)
- [📄 License](#license)

---

## 🌌 Overview

Welcome to M31-Agent, your personal AI coding companion for Visual Studio Code! Just like the Andromeda Galaxy (M31) lights up the night sky, M31-Agent illuminates your coding journey by bringing the power of natural language understanding directly into your workspace.

This intelligent assistant revolutionizes how you interact with your codebase by leveraging OpenRouter AI's advanced capabilities. Say goodbye to context switching and hello to seamless coding assistance that understands your needs and adapts to your environment.

Named after the magnificent Andromeda Galaxy, M31-Agent serves as your personal navigator through the vast universe of code. Whether you're charting unfamiliar territory in a new codebase or accelerating through familiar constellations of your own projects, M31-Agent is there to guide you.

Perfect for everyone from coding newcomers looking to understand complex concepts to seasoned veterans seeking to automate repetitive tasks, M31-Agent becomes your indispensable sidekick in the adventure of modern software development.

---

## 🚀 Key Features

M31-Agent comes packed with a stellar array of AI-powered features designed to supercharge your coding workflow:

### 🛠️ Core Features

- **💬 AI Chat**: Have natural conversations about your code right in your editor! Ask questions, discuss problems, and get insights without ever leaving VS Code. Perfect for both quick questions and in-depth discussions.

- **✍️ Code Generation**: Transform your ideas into code with simple natural language descriptions. Watch as M31-Agent crafts code snippets, complete functions, or entire modules that follow your project's existing patterns and conventions.

- **🔍 Code Explanation**: Highlight any puzzling code and get crystal-clear explanations of what it does, how it works, and why certain approaches were taken. Explanations can be tailored to your knowledge level from beginner to expert.

- **🖥️ Terminal Commands**: Forget complex command syntax! Just describe what you want to do, and M31-Agent will generate or run the terminal commands for you, saving precious time and mental energy.

- **🧭 Codebase Navigation**: Explore your project with ease by asking natural questions about your codebase structure. Find relevant files, functions, and classes without memorizing paths or using complex searches.

- **🌐 Multi-Language Support**: No matter what programming language is your favorite, M31-Agent speaks it fluently! Get intelligent assistance for all major languages and frameworks, with context-aware help for your specific syntax.

### ⭐ Advanced Features

- **♻️ Code Refactoring**: Level up your code quality with smart refactoring suggestions. M31-Agent identifies improvement opportunities and can implement the changes for you with a simple confirmation.

- **🐛 Debugging Assistance**: Describe your problems in plain language and receive debugging guidance, potential fixes, and explanations of cryptic error messages.

- **📝 Documentation Generation**: Automatically create comprehensive documentation for functions, classes, and modules based on the code itself, ensuring your docs stay consistent and up-to-date.

- **🧪 Test Generation**: Boost your test coverage with AI-generated unit tests and test cases based on your implementation code.

- **💡 Context-Aware Completions**: Go beyond basic code completion with intelligent suggestions that understand your broader codebase and common patterns.

- **📚 Learning Resources**: Get instant links to relevant documentation, tutorials, and examples related to the code you're working with or problems you're trying to solve.

---

## 🏆 Comparison with Other Coding Assistants

| Feature                     | M31-Agent                  | GitHub Copilot | Tabnine       | Kite          |
|-----------------------------|----------------------------|----------------|--------------|---------------|
| **🤖 AI Provider**             | OpenRouter (multiple models) | OpenAI Codex   | Proprietary AI | Proprietary AI |
| **✍️ Code Generation**         | ✅ Extensive               | ✅ Extensive   | ✅ Limited    | ✅ Limited    |
| **💬 Natural Language Chat**   | ✅ Advanced                | ✅ Basic       | ❌ No        | ❌ No         |
| **🔍 Code Explanation**        | ✅ Comprehensive           | ✅ Basic       | ❌ No        | ✅ Basic      |
| **🖥️ Terminal Command Generation** | ✅ Yes                 | ❌ No          | ❌ No        | ❌ No         |
| **🧭 Codebase Navigation**     | ✅ Advanced                | ❌ No          | ❌ No        | ✅ Basic      |
| **🔄 Multi-Model Access**      | ✅ Yes                    | ❌ No          | ❌ No        | ❌ No         |
| **📝 Documentation Generation**| ✅ Yes                    | ✅ Limited     | ❌ No        | ✅ Limited    |
| **🧪 Test Generation**         | ✅ Yes                    | ✅ Limited     | ❌ No        | ❌ No         |
| **💰 Pricing Model**           | Usage-based (OpenRouter)  | Subscription   | Freemium     | Freemium     |
| **🔒 Privacy Focus**           | ✅ High                   | ⚠️ Medium      | ⚠️ Medium    | ⚠️ Medium    |

M31-Agent shines brightest with its flexible AI model selection through OpenRouter, comprehensive natural language capabilities, and unique features like terminal command generation and advanced codebase navigation.

---

## 📥 Installation

Getting M31-Agent into your VS Code environment is a breeze! Here's how to bring this powerful assistant to your fingertips:

### 🔍 Method 1: Install via VS Code Extensions View

1. Open Visual Studio Code  
2. Click on the Extensions icon in the Activity Bar (or press `Ctrl+Shift+X` / `Cmd+Shift+X`)  
3. Search for "M31-Agent"  
4. Click "Install" on the M31-Agent extension  

### ⌨️ Method 2: Install via VS Code Command Palette

1. Open Visual Studio Code  
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)  
3. Type "Extensions: Install Extension"  
4. Enter "M31-Agent" in the search field  
5. Select the M31-Agent extension from the list and click "Install"  

### 🌐 Method 3: Install from VS Code Marketplace Website

1. Visit [M31-Agent on the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=m31-ai.m31-agent)  
2. Click the "Install" button  
3. Confirm when VS Code prompts to launch and install the extension  

### 💻 System Requirements

- Visual Studio Code version 1.80.0 or higher  
- Stable internet connection for API communication  
- Minimum 4GB RAM recommended  
- Node.js 14.0 or higher (bundled with VS Code)  
- OpenRouter API account with valid API key  

### 🔧 Installation Troubleshooting

Ran into a snag? Here's how to fix common installation issues:

1. **📊 VS Code Version**: Ensure you're running VS Code version 1.80.0 or higher  
2. **🔌 Connectivity Issues**: Check your internet connection and firewall settings  
3. **⚠️ Conflicting Extensions**: Temporarily disable other AI coding assistants to prevent conflicts  
4. **💥 Extension Host Crashes**: Update VS Code to the latest version  
5. **🔑 Permissions Issues**: Ensure VS Code has proper permissions for extension installation  

---

## 🚀 Quick Start Guide

Let's get you up and running with M31-Agent in no time! Follow these simple steps to begin your enhanced coding experience:

### 🔑 1. Get an OpenRouter API Key

Before using M31-Agent, you'll need an OpenRouter API key:

1. Sign up for an account at [openrouter.ai](https://openrouter.ai/)  
2. Navigate to the API Keys section in your OpenRouter dashboard  
3. Generate a new API key with appropriate rate limits and model access  
4. Save this key for configuring M31-Agent  

### ⚙️ 2. Configure M31-Agent

After installation, configure the extension with your API key:

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)  
2. Run the command "M31-Agent: Configure Settings"  
3. Enter your OpenRouter API key when prompted  
4. Select your preferred default AI model from the available options  
5. Adjust additional settings like maximum token length and temperature as needed  

### 🎮 3. Start Using M31-Agent

You can activate M31-Agent using any of these methods:

- Click the M31-Agent icon in the VS Code status bar  
- Use the keyboard shortcut (`Ctrl+Alt+M` / `Cmd+Alt+M`)  
- Open the Command Palette and run "M31-Agent: Show Chat"  
- Right-click on selected code and choose "M31-Agent: Explain Code"  

### 💬 4. Your First Interaction

Try these beginner-friendly commands to familiarize yourself with M31-Agent:

```plaintext
> Explain what this extension does
```

```plaintext
> Generate a simple function to calculate the Fibonacci sequence
```

```plaintext
> What are the key files in this project?
```

### 🧠 5. Working with Context

M31-Agent works best when it has context. When asking questions about your code:

- Select the relevant code before asking for an explanation  
- Provide specific details in your questions  
- Refer to files by name in navigation requests  
- Let the agent know what language or framework you're using for generation tasks  

---

## 🔄 OpenRouter AI Integration

M31-Agent harnesses the power of OpenRouter AI to give you access to multiple cutting-edge language models, providing flexibility and intelligence in your coding assistant.

### 🤔 What is OpenRouter?

OpenRouter is like a universal translator for AI models - it's an API gateway service that provides unified access to various AI models from different providers including OpenAI, Anthropic, Google, and more. This means you can choose the perfect AI brain for each specific coding task!

### 🧠 Supported Models

M31-Agent puts a universe of AI models at your fingertips through OpenRouter:

- **🔮 OpenAI GPT-4o**: Most capable general-purpose model with extensive coding abilities  
- **⚡ OpenAI GPT-4 Turbo**: Highly capable general-purpose model optimized for coding  
- **💨 OpenAI GPT-3.5 Turbo**: Fast and economical model for simpler coding tasks  
- **🧠 Anthropic Claude 3 Opus**: Highest capability Claude model with excellent reasoning  
- **⚖️ Anthropic Claude 3 Sonnet**: Balanced capability and performance for coding tasks  
- **🚀 Anthropic Claude 3 Haiku**: Fast and efficient Claude model for quick responses  
- **💎 Google Gemini Pro**: Google's advanced large language model with strong coding capabilities  

### 🎯 Model Selection Guidance

Different models excel at different tasks - here's how to pick the perfect partner:

- For complex code generation and refactoring, GPT-4o or Claude 3 Opus is recommended  
- For quick code explanations and simple generations, GPT-3.5 Turbo or Claude 3 Haiku works well  
- For balanced performance and quality, GPT-4 Turbo or Claude 3 Sonnet is ideal  
- For projects with specialized needs, experiment with different models  

### 💰 API Usage and Pricing

When using M31-Agent, keep these pricing considerations in mind:

- OpenRouter charges based on the model used and the number of tokens processed  
- Tokens include both your input (prompts, code context) and the model's output  
- Set appropriate token limits in M31-Agent settings to control costs  
- Monitor your usage through the OpenRouter dashboard  

M31-Agent includes optional telemetry that helps us improve the extension while respecting your privacy. All API calls to OpenRouter are made using your personal API key, ensuring you retain control over model selection and usage.

---

## ⌨️ Key Commands

Here are the essential commands to supercharge your coding experience:

- **💬 M31-Agent: Show Chat** - Open the AI chat panel  
- **✍️ M31-Agent: Generate Code** - Generate code based on a description  
- **🔍 M31-Agent: Explain Code** - Explain the selected code  
- **🖥️ M31-Agent: Run Command** - Execute or generate a terminal command  
- **🧭 M31-Agent: Navigate Codebase** - Find and navigate to files in your project  
- **⚙️ M31-Agent: Configure Settings** - Configure the extension settings  

---

## 🎬 Usage Examples

### ✨ Generate Code

```plaintext
> Generate a React component that displays a list of users with pagination
```

## ⚙️ Settings

- **🔥 Temperature**: Controls randomness of responses (0.0-1.0)
- **✅ Require Confirmation**: Prompt for confirmation before running commands
- **📊 Telemetry**: Enable/disable anonymous usage data collection

## 🔒 Privacy & Security

- Your code is only sent to the AI service when you explicitly request assistance
- API keys are stored securely in VS Code's secret storage
- All API communication is encrypted with TLS
- You must confirm before any file modifications or terminal commands are executed

## 📣 Feedback & Support

- [🐞 GitHub Issue Tracker](https://github.com/m31-ai/m31-agent-vscode/issues)
- [📚 Documentation](https://github.com/m31-ai/m31-agent-vscode/wiki)
- [✉️ Email Support](mailto:support@m31-ai.com)

## 📄 License

MIT - See LICENSE file for details

## 🎨 User Interface

M31-Agent features a thoughtfully designed user interface that integrates seamlessly with VS Code while providing powerful functionality.

### 💬 Chat Panel

The primary interface is the M31-Agent Chat Panel, which provides:

- **💾 Persistent Chat History**: Your conversations with the AI are preserved across sessions
- **🌈 Syntax Highlighting**: Code in responses is properly formatted and highlighted
- **🖱️ Interactive Elements**: Clickable actions and code snippets that can be inserted into your editor
- **👁️ Context Display**: Visibility into what code context the AI is considering
- **🧵 Multi-Thread Support**: Create separate conversation threads for different topics or projects

### 📊 Status Bar Integration

The M31-Agent icon in the VS Code status bar provides:

- **⚡ Quick Access**: Single-click activation of the chat panel
- **🚦 Status Indicator**: Visual feedback on the current state of the agent (ready, thinking, error)
- **🔄 Model Selection**: Quick access to change the active AI model

### 📝 Context Menu Options

Right-click on code to access M31-Agent functions directly:

- **🔍 Explain Selected Code**: Get an explanation of the highlighted code
- **✨ Generate Code Here**: Insert AI-generated code at the cursor position
- **♻️ Refactor Selection**: Receive suggestions for improving selected code
- **🧪 Generate Unit Tests**: Create tests for the selected function or class

### ⌨️ Command Palette Integration

All M31-Agent features are accessible through the VS Code Command Palette:

- Start typing "M31-Agent" to see all available commands
- Custom keyboard shortcuts can be assigned to frequently used commands
- Command history makes it easy to repeat previous operations

### 🖼️ Webview Panels

For more complex interactions, M31-Agent uses dedicated webview panels:

- **📚 Code Explanation Panel**: Displays detailed code explanations with sections for syntax, logic, and best practices
- **🔍 Navigation Results**: Shows search results with file previews and jump-to-file capabilities
- **⚙️ Settings Configuration**: Visual interface for adjusting all M31-Agent settings

## 📚 Detailed Feature Documentation

### 💬 AI Chat

The AI Chat feature provides a natural language interface for interacting with the coding assistant. It supports:

#### 🚀 Quick Chat

- Access via the status bar icon or keyboard shortcut (`Ctrl+Alt+M` / `Cmd+Alt+M`)
- Perfect for quick questions without disrupting your workflow
- Context-aware of your current file and selected code
- Supports both simple queries and multi-turn conversations

#### 📋 Dedicated Chat Panel

- Persistent, threaded conversations organized by topic
- Rich formatting of code snippets and explanations
- File references that can be clicked to navigate to the referenced code
- Support for code block execution directly from the chat

#### ✨ Chat Features

- **🧠 Code-Aware Context**: The AI understands the code you're working with and references it appropriately
- **📜 History Recall**: Access and reference previous parts of your conversation
- **📊 Multi-Modal Input**: Include screenshots, links, and formatted text in your queries
- **📤 Export Conversations**: Save important discussions as Markdown or HTML for future reference
- **💡 Smart Suggestions**: Get contextual suggestions for follow-up questions
- **🗂️ Conversation Management**: Create, rename, and delete conversation threads

#### 💭 Example Prompts

```
> Help me understand how this auth middleware works
```

```
> What's the best way to implement pagination for this API?
```

```
> What design pattern would be most appropriate for this component?
```

### ✍️ Code Generation

M31-Agent's code generation capabilities help you write code faster and with fewer errors:

#### ⭐ Features

- **🧩 Context-Aware Generation**: Generated code matches your project's style and patterns
- **📁 Multi-File Awareness**: Generation takes into account imports and dependencies across files
- **🛠️ Framework-Specific Generation**: Tailored to popular frameworks like React, Angular, Vue, Express, Django, etc.
- **🔄 Incremental Generation**: Build up complex implementations through conversational refinement
- **📋 Template Integration**: Generate code based on existing templates in your project

#### 🎮 Generation Modes

- **⚡ Inline Generation**: Quick snippets inserted at your cursor position
- **🧩 Function Generation**: Complete functions based on signatures or descriptions
- **🧱 Component Generation**: Full UI components with proper styling and behavior
- **🌐 API Endpoint Generation**: Server routes with validation, error handling, and business logic
- **🧪 Test Case Generation**: Unit and integration tests for your code

#### 💯 Best Practices for Code Generation

- Be specific about languages, frameworks, and versions
- Provide clear descriptions of desired functionality
- Reference existing patterns in your codebase
- Specify error handling and edge case requirements
- Iterate on generated code with follow-up requests

#### 💭 Example Prompts

```
> Generate a React component for a user profile that displays user data and allows editing
```

```
> Write a Python function that takes a list of dictionaries and sorts them by a specified key
```

```
> Create an API endpoint for user registration with email validation
```

### 🔍 Code Explanation

The Code Explanation feature helps you understand unfamiliar code quickly:

#### 📊 Explanation Components

- **📝 Syntax Breakdown**: Explanation of language-specific syntax elements
- **🔄 Logical Flow**: How the code executes and processes data
- **🎯 Function Purpose**: What the code is designed to accomplish
- **🧩 Context Integration**: How the code fits into the broader codebase
- **⚡ Performance Analysis**: Identification of potential bottlenecks or inefficiencies
- **🔒 Security Considerations**: Highlighting of potential vulnerabilities or risks

#### 📈 Explanation Levels

- **🌱 Basic**: High-level overview suitable for beginners
- **🌿 Intermediate**: Detailed explanation with some technical depth
- **🌲 Advanced**: In-depth analysis including design patterns and optimization opportunities
- **🎓 Academic**: Theoretical foundations and computer science principles

#### 📊 Visualization

- **📌 Code Annotation**: Inline comments explaining key parts of the code
- **🔀 Flow Diagrams**: Visual representation of execution paths (for complex functions)
- **📊 Memory Usage**: Visualization of data structures and memory allocation

#### 💭 Example Prompts

```
> Explain this Redux middleware in simple terms
```

```
> What does this regex pattern match and how does it work?
```

```
> Analyze the time complexity of this sorting algorithm
```

### 🖥️ Terminal Commands

M31-Agent can help you run and generate terminal commands:

#### ⌨️ Command Generation

- **🔄 Natural Language to Command**: Describe what you want to do, and get the exact command
- **💻 Platform-Specific Commands**: Commands tailored to your operating system (Windows, macOS, Linux)
- **🔗 Complex Command Building**: Multi-step commands with pipes, redirects, and conditions
- **🧰 Tool-Specific Syntax**: Specialized commands for git, docker, npm, and other development tools

#### ▶️ Command Execution

- **✅ Execute with Confirmation**: Review generated commands before execution
- **🎛️ Parameter Customization**: Fine-tune generated commands before running
- **📊 Execution Monitoring**: Track command progress and output
- **🛠️ Error Recovery**: Get help understanding and fixing command errors

#### 🔒 Safety Features

- **👍 Confirmation Required**: Explicitly approve commands before execution
- **⚠️ Destructive Command Warning**: Extra confirmation for potentially dangerous operations
- **🔑 Permission Checking**: Verification of necessary permissions before execution
- **👁️ Execution Preview**: See what will happen before commands run

#### 💭 Example Prompts

```
> Generate a command to find all JavaScript files modified in the last week
```

```
> How do I recursively search for text in all Python files?
```

```
> Create a git command to rebase my current branch onto main and resolve conflicts
```

### 🧭 Codebase Navigation

Navigate large and complex codebases with ease using M31-Agent's intelligent navigation features:

#### 🔍 Search Capabilities

- **🔮 Semantic Search**: Find files and code based on functionality rather than just keywords
- **💬 Natural Language Queries**: Ask questions about your codebase in plain English
- **📍 Definition Finding**: Quickly locate where functions, classes, and variables are defined
- **🔎 Usage Search**: Find all instances where a particular element is used
- **🔗 Dependency Tracing**: Follow import and dependency chains through your codebase

#### 🧩 Navigation Views

- **📁 File Explorer Integration**: Enhanced file navigation with AI-powered suggestions
- **🗂️ Symbol Browser**: Hierarchical view of classes, functions, and variables
- **📊 Call Graph Visualization**: Visual representation of function calls and relationships
- **👆 Interactive Results**: Click on search results to jump directly to relevant code

#### 🧠 Context Building

- **📋 Codebase Summary**: Get high-level overviews of project structure and architecture
- **🔄 Component Relationships**: Understand how different parts of your application interact
- **📚 Documentation Integration**: Link between code and available documentation
- **🗺️ History Tracking**: Navigate through previously visited locations

#### 💭 Example Prompts

```
> Find where the user authentication logic is implemented
```

```
> Show me all the places where the database connection is used
```

```
> What are the main entry points for this application?
```

### 📝 Documentation Generation

Automatically create and maintain documentation for your code:

#### 📑 Documentation Types

- **📌 Function Documentation**: Generate JSDoc, docstrings, or equivalent for functions
- **🌐 API Documentation**: Create OpenAPI/Swagger specs for REST endpoints
- **🧩 Component Documentation**: Document props, events, and usage for UI components
- **📚 README Generation**: Create project-level documentation with setup and usage instructions
- **🏗️ Architecture Documentation**: Describe system design and component interactions

#### ✨ Features

- **🔮 Intelligent Inference**: Generate documentation based on code analysis
- **🎨 Multi-Format Support**: Output in Markdown, HTML, JSDoc, and other formats
- **🔄 Update Existing Docs**: Refresh outdated documentation to match code changes
- **🧪 Example Generation**: Create usage examples to demonstrate functionality
- **🌍 Multilingual Support**: Generate documentation in multiple human languages

#### 💭 Example Prompts

```
> Document this React component with all its props and usage examples
```

```
> Generate JSDoc comments for all the functions in this utility file
```

```
> Create a README for this project based on its structure and usage
```

### 🧪 Test Generation

Improve code quality with AI-powered test generation:

#### 🧪 Test Types

- **📊 Unit Tests**: Individual function and method testing
- **🧩 Integration Tests**: Testing interactions between components
- **🖥️ UI Tests**: Testing user interface components and interactions
- **🌐 API Tests**: Endpoint testing with various inputs and scenarios
- **⚡ Performance Tests**: Benchmarking and load testing

#### 🛠️ Testing Frameworks

- **JavaScript/TypeScript**: Jest, Mocha, Jasmine, Cypress
- **Python**: pytest, unittest
- **Java**: JUnit, TestNG
- **C#**: NUnit, xUnit
- **And many others based on your project's language and framework

#### ✨ Features

- **🎯 Test Case Identification**: Discover edge cases and scenarios to test
- **🧩 Mocking Helper**: Generate appropriate mocks and stubs
- **✅ Assert Selection**: Choose the most appropriate assertions for each test
- **📊 Coverage Analysis**: Identify untested code paths
- **📁 Test Suite Organization**: Structure tests logically for maintainability

#### 💭 Example Prompts

```
> Generate unit tests for this authentication service
```

```
> Create API tests for this Express endpoint with different inputs
```

```
> Write UI tests for this React form component
```

## 📄 Configuration and Settings

M31-Agent offers extensive configuration options to customize the extension to your preferences and workflow:

### 🎛️ Core Settings

- **🔑 API Key**: Your OpenRouter API key (stored securely)
- **🤖 AI Model**: Select from various available models (GPT-4o, Claude 3, etc.)
- **📏 Max Tokens**: Maximum response length (256-8192)
- **🔥 Temperature**: Controls randomness of responses (0.0-1.0)
- **✅ Require Confirmation**: Prompt for confirmation before running commands or writing files
- **🌐 API Endpoint**: OpenRouter API endpoint (customizable for enterprise deployments)
- **📊 Enable Telemetry**: Toggle anonymous usage data collection
- **📝 Log Level**: Control verbosity of extension logs (debug, info, warning, error, none)
- **👋 Show Welcome on Startup**: Toggle welcome message when the extension starts

### 🔧 Advanced Settings

#### ⚡ Performance Settings

- **🔄 Response Streaming**: Enable/disable streaming responses as they're generated
- **🧠 Context Window Management**: Control how much code context is sent to the AI
- **💾 Cache Settings**: Configure response caching for improved performance
- **🔙 Background Processing**: Allow certain operations to run in the background

#### 🎨 UI Customization

- **🌓 Theme Integration**: Light/dark theme support with customizable highlighting
- **📋 Panel Position**: Configure where chat and explanation panels appear
- **📊 Status Bar Customization**: Show/hide status bar icon and information
- **🔤 Font Settings**: Adjust font size and family for AI responses
- **🎨 Code Formatting**: Control how code in responses is formatted and highlighted

#### 🔄 Workflow Integration

- **🧠 Auto-Context**: Automatically include relevant files in the context for queries
- **📂 Project-Specific Settings**: Configure different settings for different projects
- **⌨️ Keyboard Shortcuts**: Customize keyboard shortcuts for all commands
- **📝 Editor Integration**: Configure how the extension interacts with the editor
- **🔄 VCS Integration**: Settings for integration with git and other version control systems

### 🧩 Setting Management

M31-Agent settings can be configured through multiple interfaces:

- **🖥️ VS Code Settings UI**: Access through the standard VS Code settings panel
- **📝 JSON Configuration**: Edit settings.json directly for advanced configurations
- **⌨️ Command Palette**: Quickly access common settings through dedicated commands
- **🧙‍♂️ Configuration Wizard**: Interactive setup process for new installations

## 🌐 Language Support

M31-Agent provides deep support for a wide range of programming languages, adapting its capabilities to the specific syntax, patterns, and best practices of each language.

### 📚 Supported Languages

M31-Agent offers comprehensive support for:

#### 💻 Mainstream Languages

- **📜 JavaScript/TypeScript**: Full support for modern JS/TS features, React, Angular, Vue, Node.js
- **🐍 Python**: Support for Python 2.7+ and 3.x, including popular frameworks like Django, Flask, FastAPI
- **☕ Java**: Support for Java 8-21, Spring, Jakarta EE, Android development
- **🔷 C#**: Support for .NET Framework and .NET Core/5/6/7/8
- **⚡ C/C++**: Support for modern C++11/14/17/20/23 standards
- **🐘 PHP**: Support for PHP 7.x/8.x, Laravel, Symfony, WordPress
- **🐹 Go**: Support for Go modules, goroutines, and idiomatic Go patterns
- **💎 Ruby**: Support for Ruby 2.x/3.x, Rails, Sinatra
- **🍎 Swift**: Support for Swift 5.x, iOS/macOS app development
- **🤖 Kotlin**: Support for Kotlin JVM, Android, multiplatform

#### 🔬 Specialized Languages

- **🦀 Rust**: Support for ownership model, traits, and Rust idioms
- **⚡ Scala**: Support for functional programming patterns and Akka
- **λ Haskell**: Support for pure functional programming concepts
- **🔄 Clojure**: Support for LISP syntax and functional patterns
- **📊 R**: Support for data analysis and visualization
- **🍏 Objective-C**: Support for legacy iOS/macOS development
- **📱 Dart**: Support for Flutter development
- **🐪 Perl**: Support for text processing and system scripting
- **🌙 Lua**: Support for game development and embedded scripting
- **📜 Shell Scripting**: Bash, PowerShell, and other shell languages

#### 🌐 Web Technologies

- **🔖 HTML/CSS**: Complete support for semantic HTML5 and modern CSS
- **🗃️ SQL**: Support for multiple dialects (MySQL, PostgreSQL, SQLite, MS SQL)
- **⚛️ GraphQL**: Schema definition and query optimization
- **📋 JSON/YAML**: Configuration file formats and data exchange
- **📝 Markdown**: Documentation and content formatting

### 🧠 Language-Specific Features

M31-Agent adapts its capabilities to each language:

- **📖 Syntax Awareness**: Understanding of language-specific syntax and idioms
- **🧩 Framework Integration**: Knowledge of popular frameworks for each language
- **📏 Style Guide Compliance**: Adherence to language-specific style guides and conventions
- **📦 Ecosystem Knowledge**: Familiarity with package managers, build tools, and libraries
- **👍 Best Practices**: Recommendations based on language-specific best practices
- **⚠️ Error Patterns**: Recognition of common errors and anti-patterns in each language

### 🔍 Language Detection

M31-Agent automatically detects the language you're working with based on:

- File extensions
- Shebang lines
- Content analysis
- Project structure
- Editor language mode

## 🚀 Advanced Usage

Beyond the basic features, M31-Agent offers advanced capabilities for power users:

### 💪 Power User Features

- **📂 Multi-File Operations**: Execute changes across multiple files in a single operation
- **⚡ Batch Code Generation**: Generate related components or modules as a set
- **🧠 Advanced Context Management**: Explicitly control what context is provided to the AI
- **📋 Custom Prompt Templates**: Create and save templates for common requests
- **🔄 Result Filtering and Transformation**: Process AI outputs through custom filters
- **💾 Session Management**: Save, restore, and share AI interaction sessions
- **🏢 Workspace-Specific Settings**: Configure different behaviors for different projects

### 💻 CLI Integration

M31-Agent can be accessed through the VS Code terminal:

```bash
# Generate code directly from the terminal
m31 generate "Create a function that parses CSV data" --language typescript

# Explain code from a file
m31 explain --file path/to/file.js --lines 10-25

# Run in batch mode
m31 batch --commands-file tasks.txt --output results/
```

### 🤖 Scripting and Automation

Integrate M31-Agent into your development scripts and automation:

- **🧩 Programmatic API**: Access M31-Agent functionality from extension scripts
- **🔄 Task Integration**: Include AI operations in VS Code tasks
- **🔄 CI/CD Hooks**: Run code analysis or generation during continuous integration
- **🔀 Git Hooks**: Trigger AI reviews or formatting on commit or push
- **⌨️ Custom Commands**: Define project-specific commands in settings

### 🧙‍♂️ Advanced Prompt Engineering

Get better results with advanced prompting techniques:

- **🔗 Chain-of-Thought Prompting**: Break complex problems into logical steps
- **🎓 Few-Shot Learning**: Provide examples to guide the AI's output style
- **👤 Persona Setting**: Direct the AI to adopt specific expertise or perspectives
- **🚧 Constraint Specification**: Explicitly define limitations and requirements
- **🧅 Context Layering**: Build context progressively for complex tasks

### 💭 Example Advanced Prompts

```
> Acting as a security expert, audit this authentication code for vulnerabilities
```

```
> Refactor this React component using the latest React 18 patterns. The component should be more modular, use hooks effectively, and follow accessibility best practices.
```

```
> Generate a RESTful API for a blog with post, comment, and user resources. Include validation, error handling, and security measures. The database is PostgreSQL, and we're using Express on Node.js.
```

## 🔄 Integration with Development Workflows

M31-Agent is designed to integrate seamlessly with modern development workflows:

### 🔄 Version Control Integration

- **👁️ Pre-commit Code Review**: Get AI feedback before committing changes
- **📝 Commit Message Generation**: Generate descriptive commit messages based on changes
- **🌿 Branch Management**: Get suggestions for branch organization and merging strategies
- **📊 Diff Analysis**: Understand complex changes between versions
- **🔀 Conflict Resolution**: Assistance with resolving merge conflicts

### 🚀 CI/CD Pipeline Integration

- **🔍 Automated Code Review**: Integrate AI code reviews into CI pipelines
- **📝 Documentation Verification**: Ensure documentation stays in sync with code
- **📊 Test Coverage Analysis**: Identify areas needing better test coverage
- **🚦 Quality Gate Integration**: Use AI insights as quality gates in deployment pipelines
- **📋 Release Notes Generation**: Automatically draft release notes from changes

### 👥 Code Review Workflows

- **📝 PR Description Generation**: Create detailed pull request descriptions
- **💬 Review Comment Responses**: Get help responding to review comments
- **💡 Code Improvement Suggestions**: Proactive suggestions during review
- **📏 Standards Compliance**: Check adherence to project coding standards
- **🔒 Security Review**: Identify potential security issues during review

### 👥 Collaboration Features

- **🧠 Knowledge Sharing**: Export AI explanations to share with team members
- **👋 Onboarding Assistance**: Help new team members understand codebase
- **👥 Pair Programming Support**: AI assistance during pair programming sessions
- **🌍 Shared Contexts**: Team-specific configuration and context settings
- **📊 Meeting Preparation**: Generate code summaries for technical discussions

### 📋 Project Management Integration

- **📋 Task Analysis**: Break down technical requirements into implementation steps
- **⏱️ Effort Estimation**: Get input on complexity and effort for development tasks
- **📝 Technical Documentation**: Generate documentation for project management tools
- **🔄 Dependency Analysis**: Identify cross-task dependencies in implementation
- **⚠️ Risk Assessment**: Highlight potential technical risks in planned changes

## 🧩 API Reference

M31-Agent provides a comprehensive API for extending and integrating its capabilities:

### 🔌 Extension API

Access M31-Agent functionality programmatically from other extensions or scripts:

```typescript
// Import the M31-Agent API
import * as m31 from 'm31-agent-api';

// Generate code
const generatedCode = await m31.generateCode({
  prompt: 'Create a function to validate email addresses',
  language: 'typescript',
  maxTokens: 500
});

// Explain code
const explanation = await m31.explainCode({
  code: 'const sum = (a, b) => a + b;',
  level: 'intermediate'
});

// Execute a command
const result = await m31.executeCommand({
  command: 'Find large files in the project',
  requireConfirmation: true
});
```

### 📡 Events and Hooks

Subscribe to M31-Agent events to integrate with your own extensions:

```typescript
// Listen for response events
m31.events.onResponse.subscribe((response) => {
  console.log('Got AI response:', response.text);
});

// Listen for code generation events
m31.events.onCodeGenerated.subscribe((code) => {
  // Process generated code
});

// Register pre-processing hooks
m31.hooks.registerPromptPreprocessor((prompt) => {
  // Modify or enhance prompts before they're sent
  return enhancedPrompt;
});
```

### ⚙️ Configuration API

Programmatically control M31-Agent settings:

```typescript
// Get current configuration
const config = await m31.getConfiguration();

// Update settings
await m31.updateConfiguration({
  model: 'anthropic/claude-3-opus',
  temperature: 0.7
});

// Register a custom model
await m31.registerCustomModel({
  id: 'my-custom-model',
  displayName: 'My Team Model',
  endpoint: 'https://api.example.com/ai',
  authHeader: 'X-API-Key'
});
```

### 🧰 Custom Commands

Define and register custom M31-Agent commands:

```typescript
// Register a custom command
m31.commands.register({
  id: 'generateApiEndpoint',
  name: 'Generate API Endpoint',
  description: 'Generate a complete API endpoint from a description',
  handler: async (params) => {
    // Implementation
    return result;
  }
});
```

### 🔌 Extension Points

M31-Agent provides several extension points for customization:

- **🤖 Custom Model Providers**: Integrate additional AI providers
- **📋 Prompt Templates**: Define specialized templates for common tasks
- **🧠 Context Providers**: Customize how context is gathered and processed
- **🎨 Response Formatters**: Control how AI responses are displayed
- **🎮 Command Handlers**: Implement custom command processing logic

## 🏗️ Extension Architecture

M31-Agent is built on a modular, extensible architecture designed for performance and maintainability:

### 🧩 Core Components

![M31-Agent Architecture Diagram](resources/architecture-diagram.png)

The extension is organized into several core components:

- **🏠 Extension Host**: The main entry point that registers commands and manages lifecycle
- **🤖 AI Service**: Handles communication with OpenRouter AI and other providers
- **🧠 Context Providers**: Gathers and processes relevant code context
- **⚙️ Command Processors**: Implements specific commands like code generation and explanation
- **🎨 UI Components**: Manages webview panels, status bar, and other UI elements
- **💾 State Management**: Maintains extension state and configuration
- **📂 File System Utilities**: Safely interacts with workspace files
- **💻 Terminal Integration**: Securely manages terminal command execution

### 📁 Directory Structure

The extension follows a structured organization:

```
m31-agent/
├── src/                      # Source code
│   ├── api/                  # API communication 
│   │   ├── client/           # API client implementations
│   │   ├── endpoints/        # Endpoint definitions
│   │   ├── interfaces/       # API type definitions
│   │   └── middlewares/      # Request/response processors
│   ├── commands/             # Command implementations
│   ├── components/           # UI components
│   │   ├── chat/             # Chat interface components
│   │   ├── contextMenu/      # Editor context menu integration
│   │   ├── panels/           # Webview panel implementations
│   │   ├── statusBar/        # Status bar integration
│   │   └── webview/          # Shared webview components
│   ├── config/               # Configuration management
│   ├── hooks/                # Extension points and hooks
│   ├── models/               # Data models and interfaces
│   ├── services/             # Core services
│   │   ├── ai/               # AI service implementations
│   │   ├── context/          # Context gathering services
│   │   ├── telemetry/        # Usage tracking
│   │   └── security/         # Security and validation
│   ├── state/                # State management
│   ├── tests/                # Test infrastructure
│   ├── utils/                # Utility functions
│   ├── webview/              # Webview front-end
│   │   ├── components/       # React components
│   │   ├── hooks/            # React hooks
│   │   ├── state/            # Front-end state management
│   │   └── styles/           # CSS and styling
│   └── extension.ts          # Extension entry point
├── resources/                # Static resources
├── package.json              # Extension manifest
└── README.md                 # Documentation
```

### 🧩 Key Design Patterns

M31-Agent employs several design patterns for maintainability and extensibility:

- **🔍 Service Locator**: Centralized access to services and dependencies
- **🎮 Command Pattern**: Encapsulated command implementations
- **👁️ Observer Pattern**: Event-based communication between components
- **💉 Dependency Injection**: Flexible component dependencies
- **🏭 Factory Pattern**: Dynamic creation of specialized components
- **🧩 Strategy Pattern**: Swappable implementations for key algorithms
- **📚 Repository Pattern**: Abstracted data access and persistence
- **🔌 Adapter Pattern**: Unified interfaces for different AI providers

### 🛠️ Technology Stack

M31-Agent is built using modern technologies:

- **📜 TypeScript**: Strongly-typed implementation for reliability
- **⚛️ React**: Component-based UI for webview panels
- **📦 Webpack**: Module bundling and optimization
- **🔍 ESLint/Prettier**: Code quality and formatting
- **🧪 Jest**: Comprehensive test framework
- **💻 VS Code API**: Deep integration with editor capabilities
- **🌐 Axios**: HTTP client for API communication
- **🆔 UUID**: Unique identifier generation
- **📡 WebSockets**: Real-time communication for streaming responses

## 🔒 Privacy and Security

M31-Agent is designed with privacy and security as core principles:

### 📊 Data Handling

- **💻 Local Processing**: Whenever possible, operations occur locally
- **📤 Minimal Data Transfer**: Only necessary code context is sent to AI services
- **🧹 No Persistent Storage**: Conversation data remains in your VS Code session only
- **🎛️ Configurable Context**: Control exactly what files and information are included
- **🎭 Data Anonymization**: Optional anonymization of sensitive identifiers
- **🔐 Encrypted Communication**: All API communication uses TLS encryption
- **👀 No Training on Your Code**: Your code is not used to train AI models

### 🔑 API Key Management

- **🔒 Secure Storage**: API keys are stored in VS Code's secure storage system
- **🤫 No Key Sharing**: Your API key is never shared with our servers
- **📡 Direct API Communication**: Requests go directly from your client to OpenRouter
- **🔄 Key Rotation Support**: Easy process for updating or rotating API keys
- **🎯 Scoped Tokens**: Support for tokens with limited capabilities

### 🛡️ Permission Model

M31-Agent implements a strict permission model:

- **📂 Explicit File Access**: Requires permission to access and modify files
- **⚙️ Command Execution Confirmation**: Confirmation required before running commands
- **🚧 Workspace Restrictions**: Options to limit access to specific workspace areas
- **👓 Read-Only Mode**: Optional mode that prevents any file modifications
- **📝 Audit Logging**: Optional logging of all operations for review

### 🔐 Security Features

- **🧪 Input Validation**: Thorough validation of all inputs to prevent injection attacks
- **🧹 Sanitized Outputs**: Careful handling of AI-generated content
- **📦 Execution Sandboxing**: Terminal commands run in isolated environments
- **✅ Content Verification**: Option to review all generated code before application
- **🛡️ Vulnerability Checking**: Analysis of generated code for common security issues
- **🔍 Regular Security Audits**: The extension undergoes regular security reviews

### 📜 Compliance

- **🇪🇺 GDPR Compliance**: Full compliance with European data protection regulations
- **🔒 SOC 2 Considerations**: Designed with security and availability in mind
- **🔍 Transparency**: Clear documentation of all data handling practices
- **📖 Open Source**: Code is available for inspection and audit

## 🏢 AI Provider Options

M31-Agent supports multiple AI providers through OpenRouter, giving you flexibility in choosing the models that best suit your needs:

### 🟢 OpenAI Models

- **🔮 GPT-4o**: OpenAI's most advanced model with superior coding capabilities
  - ✨ Strengths: Advanced reasoning, broad knowledge, excellent code generation
  - 🎯 Best for: Complex programming tasks, novel solutions, detailed explanations
  - ⚠️ Limitations: Higher latency, more expensive

- **⚡ GPT-4 Turbo**: Powerful model with expanded context window
  - ✨ Strengths: Large context handling, good balance of performance and capability
  - 🎯 Best for: Working with larger files, system design, refactoring
  - ⚠️ Limitations: Slightly less capable than GPT-4o

- **🚀 GPT-3.5 Turbo**: Fast and economical general-purpose model
  - ✨ Strengths: Low latency, cost-effective, good for simpler tasks
  - 🎯 Best for: Quick explanations, simple generations, everyday assistance
  - ⚠️ Limitations: Less sophisticated reasoning, more likely to make mistakes

### 🟣 Anthropic Models

- **🧠 Claude 3 Opus**: Anthropic's most capable AI assistant
  - ✨ Strengths: Exceptional reasoning, nuanced understanding, safety features
  - 🎯 Best for: Complex code understanding, architectural design, secure coding
  - ⚠️ Limitations: Higher cost, not optimized for all programming languages

- **⚖️ Claude 3 Sonnet**: Balanced performance and capabilities
  - ✨ Strengths: Good reasoning with faster performance, cost-effective
  - 🎯 Best for: Everyday coding assistance, documentation, explanation
  - ⚠️ Limitations: Less capable than Opus for very complex tasks

- **💨 Claude 3 Haiku**: Fast and efficient assistant
  - ✨ Strengths: Very low latency, cost-effective
  - 🎯 Best for: Quick responses, simple code generation, basic explanations
  - ⚠️ Limitations: Limited complexity handling, shorter outputs

### 🔵 Google Models

- **💎 Gemini Pro**: Google's advanced AI model
  - ✨ Strengths: Strong coding abilities, multi-modal understanding
  - 🎯 Best for: General coding tasks, visualization explanations
  - ⚠️ Limitations: Smaller context window, less specialized for some programming languages

### 🎯 Model Selection Guidance

Choosing the right model depends on several factors:

#### 🧩 Task Complexity

- **🔧 Simple Tasks** (explaining a function, generating a small utility): GPT-3.5 Turbo, Claude 3 Haiku
- **⚙️ Moderate Tasks** (building a component, refactoring code): GPT-4 Turbo, Claude 3 Sonnet
- **🏗️ Complex Tasks** (system design, security auditing): GPT-4o, Claude 3 Opus

#### ⏱️ Response Speed Requirements

- **⚡ Immediate Responses**: Claude 3 Haiku, GPT-3.5 Turbo
- **⚖️ Balanced**: Claude 3 Sonnet, Gemini Pro
- **🧠 Depth Over Speed**: GPT-4o, Claude 3 Opus

#### 💰 Cost Considerations

- **💸 Budget-Conscious**: GPT-3.5 Turbo, Claude 3 Haiku
- **⚖️ Balanced**: Claude 3 Sonnet, Gemini Pro
- **💎 Quality-Focused**: GPT-4o, Claude 3 Opus

## ⚡ Performance Optimizations

M31-Agent employs various strategies to ensure optimal performance and responsiveness:

### 🧠 Intelligent Context Management

- **🎯 Contextual Relevance**: Only relevant files and code snippets are included in context
- **🧩 Incremental Context**: Context is built progressively for complex queries
- **📄 Semantic Chunking**: Large files are split into meaningful segments
- **⭐ Importance Weighting**: More relevant context is prioritized
- **📉 Token Optimization**: Context is formatted to minimize token usage

### 💾 Caching Strategies

- **📦 Response Caching**: Frequently requested explanations and generations are cached
- **🧠 Context Caching**: Preprocessed context is stored for reuse
- **💬 Model State Preservation**: Conversation state is maintained efficiently
- **🗂️ Workspace Indexing**: Codebase structure is indexed for faster navigation
- **🔄 Invalidation Rules**: Smart cache invalidation based on file changes

### ⚡ Parallel Processing

- **🔄 Asynchronous Operations**: Non-blocking operations for UI responsiveness
- **⏱️ Background Processing**: Heavy tasks run in background threads
- **🚇 Request Pipelining**: Multiple API requests are managed efficiently
- **📦 Batched Updates**: UI updates are batched for performance
- **🔄 Progressive Loading**: Results are displayed as they become available

### 📊 Resource Management

- **📉 Memory Usage Optimization**: Efficient memory usage for large codebases
- **🔄 Connection Pooling**: Reuse of API connections
- **🛏️ Lazy Loading**: Components and features load only when needed
- **🧹 Resource Cleanup**: Proper disposal of unused resources
- **🚦 Throttling and Debouncing**: Prevention of excessive API calls

### 📈 Performance Monitoring

- **⏱️ Response Time Tracking**: Monitoring of API and processing latency
- **📊 Resource Usage Metrics**: Tracking of memory and CPU utilization
- **🔍 Performance Profiling**: Identification of bottlenecks
- **🔄 Adaptive Optimization**: Dynamic adjustment based on performance data
- **📊 Telemetry Analysis**: Usage patterns inform optimization priorities

## ❓ Troubleshooting and FAQs

### 🛠️ Common Issues

#### 🔐 Authentication Issues

**Problem**: "Unable to authenticate with OpenRouter API"
- **🔧 Solution 1**: Verify your API key in settings
- **🔧 Solution 2**: Check your OpenRouter account status
- **🔧 Solution 3**: Ensure your network allows connections to api.openrouter.ai

**Problem**: "API key is invalid or expired"
- **🔧 Solution**: Generate a new API key in the OpenRouter dashboard

#### ⚡ Performance Issues

**Problem**: "AI responses are very slow"
- **🔧 Solution 1**: Switch to a faster model (Claude 3 Haiku or GPT-3.5 Turbo)
- **🔧 Solution 2**: Reduce maximum token length in settings
- **🔧 Solution 3**: Check your internet connection
- **🔧 Solution 4**: Limit the context scope in advanced settings

**Problem**: "VS Code becomes unresponsive during large operations"
- **🔧 Solution 1**: Increase the "maxContextSize" in advanced settings
- **🔧 Solution 2**: Enable "backgroundProcessing" in settings
- **🔧 Solution 3**: Split operations into smaller chunks

#### 🧩 Feature Issues

**Problem**: "Code generation is not matching my project style"
- **🔧 Solution 1**: Select more files for context in advanced settings
- **🔧 Solution 2**: Be more specific in your generation prompts
- **🔧 Solution 3**: Create style guide examples for the AI to follow

**Problem**: "Terminal commands are not executing"
- **🔧 Solution 1**: Ensure command execution is enabled in security settings
- **🔧 Solution 2**: Check terminal permissions on your system
- **🔧 Solution 3**: Try running with elevated privileges if required

#### 🧰 Extension Issues

**Problem**: "Extension fails to activate"
- **🔧 Solution 1**: Check VS Code version (requires 1.80.0+)
- **🔧 Solution 2**: Try reinstalling the extension
- **🔧 Solution 3**: Examine VS Code logs for errors

**Problem**: "Settings are not being saved"
- **🔧 Solution 1**: Check file permissions for VS Code configuration directory
- **🔧 Solution 2**: Use the "Reset Settings" command to restore defaults
- **🔧 Solution 3**: Configure settings through the JSON settings file

### ❓ Frequently Asked Questions

#### 🔍 General Questions

**Q: Is my code sent to external servers?**
A: Yes, but only when you explicitly request AI assistance. Only the code you specifically reference or select, along with minimal necessary context, is sent to OpenRouter's API.

**Q: How much does using M31-Agent cost?**
A: M31-Agent itself is free, but it requires an OpenRouter account which charges based on API usage (token count). You control costs by selecting models and managing token limits.

**Q: Can I use M31-Agent offline?**
A: No, M31-Agent requires an internet connection to communicate with AI services. However, non-AI features like navigation helpers still work offline.

**Q: Does M31-Agent work with all programming languages?**
A: Yes, M31-Agent supports all major programming languages, with specialized features for the most common ones like JavaScript, Python, Java, C#, and others.

#### 💻 Technical Questions

**Q: How does M31-Agent handle large codebases?**
A: M31-Agent uses intelligent context management, semantic code analysis, and workspace indexing to efficiently handle large codebases without performance issues.

**Q: Can I use custom AI models with M31-Agent?**
A: Yes, through OpenRouter you can access various models, and the extension also supports custom endpoint configuration for enterprise deployments.

**Q: How do I increase the context window for complex projects?**
A: Adjust the "maxContextSize" and "contextStrategy" settings in the advanced configuration to provide more context to the AI.

**Q: Does M31-Agent support multiple workspaces?**
A: Yes, M31-Agent works with VS Code's multi-root workspaces, treating each folder as a separate context with its own configuration.

#### 🔒 Security Questions

**Q: How secure is my API key?**
A: Your API key is stored in VS Code's secure storage system and is never exposed or shared with third parties.

**Q: Can the AI modify my files without permission?**
A: No, by default all file modifications require explicit confirmation. This setting can be configured in security settings.

**Q: Is the communication with OpenRouter encrypted?**
A: Yes, all API communication uses TLS encryption to ensure data security in transit.

**Q: Does M31-Agent access all files in my workspace?**
A: By default, M31-Agent only accesses files you explicitly reference or are directly relevant to your queries. You can further restrict access in security settings.

## 👥 Contributing

We welcome contributions to M31-Agent! Whether you're fixing bugs, improving documentation, or proposing new features, your help makes M31-Agent better for everyone.

### 🤝 Ways to Contribute

- **💻 Code Contributions**: Submit pull requests for bug fixes or features
- **📝 Documentation**: Help improve or translate the documentation
- **🐛 Bug Reports**: Submit detailed bug reports
- **💡 Feature Requests**: Suggest new capabilities or improvements
- **📋 Examples**: Share example use cases and workflows
- **🧪 Testing**: Help test pre-release versions and report issues
- **🙋‍♂️ Community Support**: Help answer questions from other users

### 🚀 Getting Started

1. **🍴 Fork the Repository**: Start by forking the M31-Agent repository on GitHub
2. **📥 Clone Your Fork**: `git clone https://github.com/your-username/m31-agent-vscode.git`
3. **📦 Install Dependencies**: `npm install` in the repository root
4. **🌿 Create a Branch**: `git checkout -b my-feature-branch`
5. **✏️ Make Changes**: Implement your changes following our coding standards
6. **🧪 Run Tests**: `npm test` to ensure your changes pass all tests
7. **📤 Submit a Pull Request**: Push your branch and create a PR against the main repository

### 📏 Contribution Guidelines

- **🎨 Code Style**: Follow the existing code style (TypeScript with strict typing)
- **📝 Commit Messages**: Use clear, concise commit messages that explain the changes
- **📚 Documentation**: Update documentation to reflect your changes
- **🧪 Tests**: Include tests for new features or bug fixes
- **🔗 Issue References**: Reference relevant issues in your pull request
- **📏 Pull Request Size**: Keep PRs focused and reasonably sized
- **💬 Code Review**: Be responsive to code review feedback

### 💻 Development Environment

See the [Development Guide](#development-guide) section for detailed setup instructions.

## 👨‍💻 Development Guide

This guide walks you through setting up a development environment for M31-Agent and understanding the codebase structure.

### 📋 Prerequisites

- Node.js (v14.0 or higher)
- npm (v6.0 or higher)
- Visual Studio Code (v1.80.0 or higher)
- Git

### 🚀 Setup Instructions

1. **📥 Clone the Repository**
   ```bash
   git clone https://github.com/m31-ai/m31-agent-vscode.git
   cd m31-agent-vscode
   ```

2. **📦 Install Dependencies**
   ```bash
   npm install
   ```

3. **🏗️ Build the Extension**
   ```bash
   npm run compile
   ```

4. **▶️ Launch in Development Mode**
   - Press F5 in VS Code to launch a new window with the extension loaded
   - Alternatively, run `npm run watch` to compile and watch for changes

### 📂 Project Structure

See the [Extension Architecture](#extension-architecture) section for a detailed directory structure.

### ⚙️ Key Development Tasks

- **🏗️ Building**: `npm run compile`
- **👁️ Watching**: `npm run watch`
- **🔍 Linting**: `npm run lint`
- **🧪 Testing**: `npm run test`
- **📦 Packaging**: `npm run package`
- **📤 Publishing**: `vsce publish`

### 🐞 Debugging

- Use VS Code's built-in debugger to debug the extension
- Extension logs are available in the Output panel under "M31-Agent"
- Enable debug mode in settings for verbose logging

### 🧪 Testing

- **🧩 Unit Tests**: Test individual components and utilities
- **🔄 Integration Tests**: Test interaction between components
- **🧰 Extension Tests**: Test the extension in a VS Code environment
- **👥 Manual Testing**: Test features in real-world scenarios

### 📝 Documentation

- Update README.md with new features or changes
- Document API changes in code comments
- Update the changelog with notable changes

### 📤 Submitting Changes

See the [Contributing](#contributing) section for guidelines on submitting changes.

## 🗺️ Roadmap

M31-Agent is continuously evolving. Here's what we're planning for future releases:

### ⏱️ Short-term (Next 3 Months)

- **✨ Enhanced Code Generation**: Improved context awareness and style matching
- **📑 Multi-File Editing**: Generate and modify code across multiple files
- **🐞 Advanced Debugger Integration**: AI-assisted debugging with runtime information
- **🌍 Extended Language Support**: Enhanced capabilities for Rust, Go, and Swift
- **⚡ Performance Improvements**: Faster responses and reduced resource usage
- **🧠 Context Visualization**: Visual representation of what context is being used

### 📅 Medium-term (3-9 Months)

- **👥 Collaborative Features**: Share AI conversations and insights with team members
- **📊 Workspace Analytics**: Code quality and complexity insights
- **🧭 Advanced Project Navigation**: Semantic navigation of large codebases
- **🎯 Custom Model Fine-tuning**: Adapt models to your specific codebase and patterns
- **🏗️ Architecture Visualization**: AI-generated diagrams of code structure and flow
- **📝 Natural Language Requirements**: Generate code from requirement descriptions
- **♻️ Automated Refactoring Suggestions**: Proactive code improvement recommendations

### 🔮 Long-term (9+ Months)

- **🧠 Learning and Adaptation**: AI that learns your coding style and preferences
- **📋 Project Plan Generation**: Create implementation plans from feature descriptions
- **📈 Code Evolution Tracking**: Understand how code changes over time
- **👥 Intelligent Pair Programming**: Advanced real-time collaboration with AI
- **🧰 Cross-IDE Support**: Expand beyond VS Code to other popular IDEs
- **🔒 Advanced Security Analysis**: Detect security vulnerabilities and suggest fixes
- **🏠 Custom Model Hosting**: Support for self-hosted AI models

### 🚧 Currently In Development

- **🧪 Improved Test Generation**: More comprehensive test coverage
- **🎨 Expanded Web Interface**: Enhanced UI for complex interactions
- **📊 Metadata Enrichment**: Better understanding of code intent and purpose
- **🔌 Additional AI Providers**: Support for more AI services beyond OpenRouter
- **🌓 IDE Theme Integration**: Better visual integration with VS Code themes

We prioritize our roadmap based on user feedback and needs. Have a suggestion? Let us know through our [feedback channels](#support-and-community).

## 📣 Changelog

### 🚀 v0.1.0 (Current Release)

- 🎉 Initial public release
- ✨ Core features: AI Chat, Code Generation, Code Explanation, Terminal Commands, Codebase Navigation
- 🔄 OpenRouter AI integration with support for multiple models
- 🧩 VS Code extension with webview UI
- ⚙️ Configuration options for model selection and parameters
- 🔒 Security features for API key storage and command execution

### 🔮 Upcoming Release (v0.2.0)

- 🧠 Improved context handling for larger codebases
- ✨ Enhanced code generation with better style matching
- 🌍 Additional language-specific features
- ⚡ Performance optimizations for faster responses
- 🎨 User interface improvements based on initial feedback
- 📚 Expanded documentation and examples

## ⚖️ Legal Information

### 📜 Terms of Use

By using M31-Agent, you agree to the following terms:

1. You will not use M31-Agent to generate, upload, or distribute code that violates applicable laws or regulations.
2. You are responsible for the code generated using M31-Agent and should review it before implementation.
3. You will not attempt to reverse engineer or modify the extension in ways that violate the license.
4. You understand that AI-generated code may contain errors or security issues and should be reviewed carefully.
5. Your use of OpenRouter's API is subject to their terms of service.

### 🔏 Data Privacy Policy

M31-Agent is committed to protecting your privacy:

1. **📊 Data Collection**: M31-Agent collects minimal usage data for improving the extension if telemetry is enabled.
2. **🏢 Code Privacy**: Your code is sent to AI providers only when you explicitly request assistance.
3. **🏢 API Keys**: Your API keys are stored securely in VS Code's secret storage.
4. **🧹 No Permanent Storage**: M31-Agent does not permanently store your code or conversations.
5. **🏢 Third-Party Services**: When using M31-Agent, your data may be processed by OpenRouter and their associated AI providers.

### 📄 Third-Party Licenses

M31-Agent uses the following open-source components:

- **🏢 VS Code Extension API**: [MIT License](https://github.com/microsoft/vscode/blob/main/LICENSE.txt)
- **📜 TypeScript**: [Apache License 2.0](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt)
- **⚛️ React**: [MIT License](https://github.com/facebook/react/blob/main/LICENSE)
- **🌐 Axios**: [MIT License](https://github.com/axios/axios/blob/master/LICENSE)
- **🆔 UUID**: [MIT License](https://github.com/uuidjs/uuid/blob/main/LICENSE.md)

Full details of third-party licenses are available in the LICENSE-THIRD-PARTY file.

### ™️ Trademark Information

- M31-Agent and the M31-Agent logo are trademarks of M31-AI.
- Visual Studio Code is a trademark of Microsoft Corporation.
- OpenAI, GPT-4, and GPT-3.5 are trademarks of OpenAI.
- Claude is a trademark of Anthropic.
- Gemini is a trademark of Google LLC.

## 🤝 Support and Community

### 🙋‍♂️ Getting Help

- **📚 Documentation**: Comprehensive documentation at [docs.m31-ai.com](https://docs.m31-ai.com)
- **🏢 GitHub Issues**: Report bugs and request features on our [GitHub Issue Tracker](https://github.com/m31-ai/m31-agent-vscode/issues)
- **✉️ Email Support**: Contact us at support@m31-ai.com
- **🏢 Community Forum**: Join discussions at [forum.m31-ai.com](https://forum.m31-ai.com)
- **🏢 Discord Community**: Real-time chat with developers and users at [discord.gg/m31-agent](https://discord.gg/m31-agent)

### 🤝 Resources

- **🏢 Tutorials**: Step-by-step guides at [m31-ai.com/tutorials](https://m31-ai.com/tutorials)
- **🏢 API Documentation**: Details on extending M31-Agent at [docs.m31-ai.com/api](https://docs.m31-ai.com/api)
- **🏢 Examples**: Sample use cases at [github.com/m31-ai/m31-agent-examples](https://github.com/m31-ai/m31-agent-examples)
- **📰 Blog**: Latest updates and tips at [m31-ai.com/blog](https://m31-ai.com/blog)
- **📹 YouTube Channel**: Video tutorials at [youtube.com/m31-ai](https://youtube.com/m31-ai)

### 👥 Community Guidelines

When interacting with the M31-Agent community:

1. Be respectful and considerate of others
2. Stay on topic in discussions
3. Share knowledge and help fellow users
4. Provide detailed information when reporting issues
5. Follow the code of conduct available at [github.com/m31-ai/m31-agent-vscode/CODE_OF_CONDUCT.md](https://github.com/m31-ai/m31-agent-vscode/CODE_OF_CONDUCT.md)

## 📄 License

M31-Agent is licensed under the MIT License. 💫
