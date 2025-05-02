import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting test suite');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('m31-ai.m31-agent'));
  });

  test('Simple test', () => {
    assert.strictEqual(1 + 1, 2);
  });
}); 