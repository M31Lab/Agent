# M31-Agent Project Structure

## Overview

This document provides an overview of the M31-Agent project structure, development workflow, and key directories/files.

## Directory Structure

```
m31-agent/
├── .changeset/               # Changeset files for versioning and changelog
├── .changes/                 # Change templates for changie
├── .m31rules/                # Rules for the M31 AI agent
├── .github/                  # GitHub Actions workflows and templates
├── .husky/                   # Git hooks for code quality
├── .vscode/                  # VS Code configuration files
├── dist/                     # Compiled output (generated)
├── docs/                     # Documentation files
│   └── api/                  # API documentation (generated)
├── evals/                    # Evaluation scripts and benchmarks
│   ├── benchmarks/           # Performance benchmarking tests
│   ├── integration/          # Integration tests
│   └── scenarios/            # Scenario-based tests
├── node_modules/             # Dependencies (generated)
├── resources/                # Static resources for the extension
├── scripts/                  # Utility scripts for development
└── src/                      # Source code
    ├── api/                  # API communication modules
    ├── commands/             # VSCode commands implementation
    ├── components/           # UI components
    ├── config/               # Configuration handling
    ├── hooks/                # React hooks
    ├── models/               # Data models and interfaces
    ├── services/             # Core services
    ├── state/                # State management
    ├── test/                 # Unit tests
    └── utils/                # Utility functions
```

## Key Files

- `.changeset/config.json`: Configuration for changesets versioning
- `.m31rules/default.json`: Default rules for the M31 AI agent
- `.husky/pre-commit`: Pre-commit hooks for code quality
- `.nvmrc`: Node.js version specification
- `.vscode/launch.json`: VS Code launch configurations
- `codecov.yml`: Codecov configuration
- `package.json`: Project dependencies and scripts
- `tsconfig.json`: TypeScript configuration
- `webpack.config.js`: Webpack build configuration
- `LICENSE`: Project license

## Development Workflow

### Getting Started

1. Clone the repository
2. Use the correct Node.js version: `nvm use`
3. Install dependencies: `npm install`
4. Start development: `npm run watch`

### Creating a Change

1. Make your code changes
2. Run tests: `npm run test`
3. Create a changeset: `npm run changeset`
4. Commit your changes with the changeset

### Running Evaluations

Evaluations help ensure the extension works as expected:

- Run all evaluations: `npm run evals`
- Run benchmarks: `npm run evals:benchmarks`
- Run integration tests: `npm run evals:integration`
- Run scenario tests: `npm run evals:scenarios`

### Pre-release Checks

Before releasing a new version:

1. Check for outdated dependencies: `npm run check-deps`
2. Run the pre-release script: `npm run prerelease`
3. Verify all tests pass: `npm run ci`

### Releasing

To release a new version:

1. Run `npm run prerelease` and select the appropriate version
2. Review and approve the changes
3. Run `npm run release` to publish

## Git Hooks

- **pre-commit**: Runs linting and type checking
- **commit-msg**: Ensures commit messages follow conventions

## Configuration Files

- **ESLint**: Code quality rules
- **Prettier**: Code formatting rules
- **TypeScript**: Type definitions and compilation settings
- **Webpack**: Build configuration

## Documentation

- Generate API docs: `npm run docs`
- View API documentation in `docs/api/`

## Continuous Integration

The project uses GitHub Actions for CI/CD:

- Runs tests and linting on pull requests
- Builds the extension
- Publishes new versions to the VS Code Marketplace on release

## Scripts Directory

Contains utility scripts for development:

- `check-dependencies.js`: Checks for outdated dependencies
- `prerelease.js`: Prepares a new release version
- `postinstall.js`: Runs post-installation setup 