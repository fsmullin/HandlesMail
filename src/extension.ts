import * as vscode from 'vscode';
import { PreviewPanel } from './preview';

let previewPanel: PreviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('HTML Email Preview extension activated');

  // Register preview command
  const previewCommand = vscode.commands.registerCommand(
    'htmlEmailPreview.preview',
    () => {
      if (vscode.window.activeTextEditor) {
        showPreview(context);
      } else {
        vscode.window.showErrorMessage('No active editor');
      }
    }
  );

  // Register toggle command
  const toggleCommand = vscode.commands.registerCommand(
    'htmlEmailPreview.togglePreview',
    () => {
      if (previewPanel) {
        previewPanel.dispose();
        previewPanel = undefined;
      } else {
        showPreview(context);
      }
    }
  );

  // Listen for active editor changes
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && previewPanel && isHtmlFile(editor.document.uri)) {
      previewPanel.update(editor.document);
    }
  });

  // Listen for document changes
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (previewPanel && isHtmlFile(event.document.uri)) {
      const config = vscode.workspace.getConfiguration('htmlEmailPreview');
      if (config.get('autoPreview', true)) {
        previewPanel.update(event.document);
      }
    }
  });

  context.subscriptions.push(previewCommand, toggleCommand);
}

function showPreview(context: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isHtmlFile(editor.document.uri)) {
    vscode.window.showErrorMessage('Please open an HTML file to preview');
    return;
  }

  if (previewPanel) {
    previewPanel.reveal();
  } else {
    previewPanel = new PreviewPanel(context, editor.document);
    previewPanel.onDispose(() => {
      previewPanel = undefined;
    });
  }
}

function isHtmlFile(uri: vscode.Uri): boolean {
  return uri.fsPath.endsWith('.html');
}

export function deactivate() {
  if (previewPanel) {
    previewPanel.dispose();
  }
}
