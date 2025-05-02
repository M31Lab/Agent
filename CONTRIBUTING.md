# Contributing to M31-Agent

Thank you for your interest in contributing to M31-Agent! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Contribution Workflow](#contribution-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Communication](#communication)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to support@m31-ai.com.

## Getting Started

### Prerequisites

- Node.js (v14.0 or higher)
- npm (v6.0 or higher)
- Visual Studio Code (v1.80.0 or higher)
- Git

### Setting Up the Development Environment

1. **Fork the Repository**

   Start by forking the M31-Agent repository on GitHub.

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/M31Lab/Agent.git
   cd Agent
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Set Up the Development Environment**

   ```bash
   npm run compile
   ```

5. **Launch in Development Mode**

   Press F5 in VS Code to launch a new window with the extension loaded. Alternatively, run:

   ```bash
   npm run watch
   ```

## Contribution Workflow

1. **Check Existing Issues and Discussions**

   Before starting work, check if there's already an issue or discussion about the feature or bug you want to address.

2. **Create an Issue**

   If no issue exists, create one to discuss your proposed changes.

3. **Branch Strategy**

   Create a new branch for your work:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

4. **Make Your Changes**

   Implement your changes following our [coding guidelines](#coding-guidelines).

5. **Test Your Changes**

   Run tests to make sure your changes don't break existing functionality:

   ```bash
   npm test
   ```

6. **Commit Your Changes**

   Follow our [commit message guidelines](#commit-messages).

7. **Push Your Changes**

   ```bash
   git push origin your-branch-name
   ```

8. **Create a Pull Request**

   Create a pull request from your branch to the main M31-Agent repository.

## Pull Request Guidelines

### PR Title and Description

- Use clear, descriptive titles
- Reference related issues with "Fixes #123" or "Relates to #123"
- Include a description of the changes and the motivation for them
- Include screenshots or GIFs for UI changes

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without functionality changes
- `perf`: Performance improvements
- `test`: Adding or improving tests
- `build`: Build system or external dependency changes
- `ci`: CI configuration changes
- `chore`: Other changes that don't modify src or test files

Example:

```
feat(code-generation): add support for React component generation

- Adds template system for React components
- Implements context-aware props detection
- Updates documentation

Fixes #123
```

### PR Reviews

- Be responsive to review comments
- Address all feedback
- Ask for clarification if needed
- Be patient and respectful

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode for all TypeScript files
- Use interfaces for object shapes
- Minimize use of `any` type

### File Structure

- Follow the existing project structure
- Place components in appropriate directories
- Create new directories if necessary for new features

### Naming Conventions

- Use descriptive, meaningful names
- Use PascalCase for classes, interfaces, and type aliases
- Use camelCase for variables, functions, and method names
- Use UPPER_CASE for constants
- Use kebab-case for file names

### Code Style

- Use 2 spaces for indentation
- Add semicolons at the end of statements
- Use single quotes for strings
- Limit line length to 100 characters
- Avoid unnecessary comments
- Use descriptive variable names instead of comments
- Use async/await over Promise chaining
- Avoid deep nesting

## Testing

### Test Types

- **Unit Tests**: For individual functions and components
- **Integration Tests**: For interactions between components
- **Extension Tests**: For testing the extension in a VS Code environment

### Testing Guidelines

- Write tests for all new features
- Update tests for modified features
- Maintain at least 80% code coverage
- Run all tests before submitting a PR
- Describe tests clearly

### Running Tests

```bash
# Run all tests
npm test

# Run specific tests
npm test -- --testPathPattern=path/to/test

# Run tests with coverage
npm test -- --coverage
```

## Documentation

- Update README.md for new features or changes
- Add inline documentation for complex code
- Create or update API documentation
- Follow JSDoc standards for code documentation
- Include examples where appropriate

## Issue Reporting

When reporting issues, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected and actual results
- Version information (VS Code, M31-Agent, OS)
- Screenshots or error logs if applicable
- Use issue templates if available

## Feature Requests

When requesting features, please include:

- A clear and descriptive title
- Detailed description of the feature
- Use cases and benefits
- Potential implementation approaches
- Mockups or diagrams if applicable

## Communication

- **GitHub Issues**: For bug reports and feature requests
- **Pull Requests**: For code contributions
- **Discussions**: For general questions and ideas
- **Discord**: For real-time communication
- **Email**: support@m31-ai.com for private communications

Thank you for contributing to M31-Agent!
