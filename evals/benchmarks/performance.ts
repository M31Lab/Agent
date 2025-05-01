import { performance } from 'perf_hooks';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../../.benchmark-results');

interface BenchmarkResult {
  name: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

async function runBenchmark(
  name: string,
  fn: () => Promise<any>,
  metadata?: Record<string, any>
): Promise<BenchmarkResult> {
  const start = performance.now();
  await fn();
  const end = performance.now();
  
  return {
    name,
    duration: end - start,
    timestamp: new Date().toISOString(),
    metadata
  };
}

async function saveResults(results: BenchmarkResult[]): Promise<void> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const fileName = `benchmark-${new Date().toISOString().replace(/:/g, '-')}.json`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`Benchmark results saved to ${filePath}`);
}

async function main() {
  const results: BenchmarkResult[] = [];
  
  // Test extension activation time
  results.push(await runBenchmark('Extension Activation', async () => {
    // Simulate extension activation
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
    // Wait for activation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
  }));
  
  // Test API response time
  results.push(await runBenchmark('API Response Time', async () => {
    // Simulate a basic API call
    const extension = vscode.extensions.getExtension('m31-agent');
    if (extension) {
      const api = await extension.activate();
      await api.makeRequest('Test prompt');
    }
  }, { apiEndpoint: 'openrouter' }));
  
  // Test file system operations
  results.push(await runBenchmark('File System Operations', async () => {
    // Test file reading and writing
    const tempFile = path.join(OUTPUT_DIR, 'temp-benchmark.txt');
    fs.writeFileSync(tempFile, 'Benchmark test content');
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.readFileSync(tempFile, 'utf8');
    fs.unlinkSync(tempFile);
  }));
  
  await saveResults(results);
  
  // Print summary
  console.log('\nBenchmark Summary:');
  results.forEach(result => {
    console.log(`${result.name}: ${result.duration.toFixed(2)}ms`);
  });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
} 