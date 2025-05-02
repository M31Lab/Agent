# Evaluation Scripts

This directory contains scripts and test cases for evaluating the M31-Agent extension's performance, accuracy, and reliability across different scenarios.

## Structure

- `benchmarks/`: Performance benchmarking tests
- `integration/`: End-to-end tests for full workflows
- `scenarios/`: Common use case scenarios for testing
- `metrics/`: Scripts for collecting and reporting metrics

## Running Evaluations

To run all evaluations:

```bash
npm run evals
```

To run a specific evaluation category:

```bash
npm run evals:benchmarks
npm run evals:integration
npm run evals:scenarios
```

## Adding New Evaluations

When adding new evaluation scripts, please follow these guidelines:

1. Place scripts in the appropriate subdirectory
2. Include clear success/failure criteria
3. Document any dependencies or setup requirements
4. Add appropriate entry in the `package.json` scripts section
