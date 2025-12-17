import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EmailValidator } from './validator';
import { ResourceInspector } from './resourceInspector';
import { TemplateEngine } from './templateEngine';
import { DataManager, DataFile } from './dataManager';

export class PreviewPanel {
  private panel: vscode.WebviewPanel;
  private document: vscode.TextDocument;
  private disposables: vscode.Disposable[] = [];
  private disposeCallback?: () => void;
  private currentViewport: string = 'desktop-1024';
  private currentClient: string = 'standard';
  private darkMode: boolean = false;
  private validator: EmailValidator;
  private resourceInspector: ResourceInspector;
  private templateEngine: TemplateEngine;
  private dataManager: DataManager;
  private availableDataFiles: DataFile[] = [];
  private currentDataFile: DataFile | null = null;

  constructor(context: vscode.ExtensionContext, document: vscode.TextDocument) {
    this.document = document;
    this.validator = new EmailValidator();
    this.resourceInspector = new ResourceInspector();
    this.templateEngine = new TemplateEngine();
    this.dataManager = new DataManager();

    // Create webview panel
    this.panel = vscode.window.createWebviewPanel(
      'htmlEmailPreview',
      'Email Preview',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.dirname(document.uri.fsPath)),
          vscode.Uri.file(context.extensionPath)
        ],
      }
    );

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        // Validate message structure
        if (!message || typeof message !== 'object' || !message.command) {
          return;
        }
        
        switch (message.command) {
          case 'changeViewport':
            if (typeof message.viewport === 'string' && this.isValidViewport(message.viewport)) {
              this.currentViewport = message.viewport;
            }
            break;
          case 'changeClient':
            if (typeof message.client === 'string' && this.isValidClient(message.client)) {
              this.currentClient = message.client;
              this.update(this.document);
            }
            break;
          case 'toggleDarkMode':
            if (typeof message.darkMode === 'boolean') {
              this.darkMode = message.darkMode;
              this.update(this.document);
            }
            break;
          case 'changeDataFile':
            if (typeof message.filePath === 'string') {
              this.selectDataFile(message.filePath);
            }
            break;
          case 'generateSampleData':
            this.generateAndApplySampleData();
            break;
        }
      },
      null,
      this.disposables
    );

    // Set initial content - load data files first, then update
    this.loadDataFiles().then(() => {
      this.update(document);
    });

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.dispose();
    }, null, this.disposables);
  }

  async update(document: vscode.TextDocument) {
    this.document = document;
    
    // Reload data files when document changes
    await this.loadDataFiles();
    
    this.panel.webview.html = this.getHtmlContent(document.getText());
    this.panel.title = `Email Preview - ${path.basename(document.uri.fsPath)}`;
  }

  reveal() {
    this.panel.reveal(vscode.ViewColumn.Beside);
  }

  dispose() {
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
    if (this.disposeCallback) {
      this.disposeCallback();
    }
  }

  onDispose(callback: () => void) {
    this.disposeCallback = callback;
  }

  private isValidViewport(viewport: string): boolean {
    const validViewports = ['desktop-1920', 'desktop-1024', 'tablet-768', 'mobile-375', 'custom'];
    return validViewports.includes(viewport);
  }

  private isValidClient(client: string): boolean {
    const validClients = ['standard', 'gmail', 'outlook', 'apple'];
    return validClients.includes(client);
  }

  private getHtmlContent(htmlContent: string): string {
    // Check if content is a Handlebars template
    const isTemplate = this.templateEngine.isTemplate(htmlContent);
    let renderedContent = htmlContent;
    let templateVariables: any[] = [];
    let missingVariables: string[] = [];
    let unusedDataProps: string[] = [];
    
    if (isTemplate) {
      const data = this.currentDataFile?.data || {};
      const renderResult = this.templateEngine.render(htmlContent, data);
      renderedContent = renderResult.html;
      templateVariables = renderResult.variables;
      missingVariables = renderResult.missingVariables;
      
      // Find unused data properties
      if (this.currentDataFile) {
        const usedVarNames = templateVariables.map(v => v.name);
        unusedDataProps = this.dataManager.findUnusedProperties(data, usedVarNames);
      }
    }
    
    const sanitized = this.sanitizeHtml(renderedContent);
    const clientStyles = this.getClientSpecificStyles();
    const issues = this.validator.validate(renderedContent, this.currentClient);
    const validationReport = this.validator.generateValidationReport(issues);
    const resources = this.resourceInspector.inspect(renderedContent);
    const resourceReport = this.resourceInspector.generateResourceReport(resources);
    const variableReport = isTemplate ? this.generateVariableReport(templateVariables, missingVariables, unusedDataProps) : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${this.panel.webview.cspSource} https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline' ${this.panel.webview.cspSource}; font-src ${this.panel.webview.cspSource} https:; connect-src 'none';">
  <title>Email Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      background: ${this.darkMode ? '#1e1e1e' : '#f5f5f5'};
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      transition: background-color 0.3s ease;
    }

    .controls {
      background: ${this.darkMode ? '#252526' : 'white'};
      color: ${this.darkMode ? '#cccccc' : '#333'};
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .control-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .controls label {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }

    .controls select, .controls input {
      padding: 6px 10px;
      border: 1px solid ${this.darkMode ? '#3e3e42' : '#ddd'};
      border-radius: 4px;
      font-size: 13px;
      background: ${this.darkMode ? '#3c3c3c' : 'white'};
      color: ${this.darkMode ? '#cccccc' : '#333'};
      cursor: pointer;
    }

    .controls button {
      padding: 6px 12px;
      border: 1px solid ${this.darkMode ? '#3e3e42' : '#ddd'};
      border-radius: 4px;
      font-size: 13px;
      background: ${this.darkMode ? '#3c3c3c' : 'white'};
      color: ${this.darkMode ? '#cccccc' : '#333'};
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .controls button:hover {
      background: ${this.darkMode ? '#505050' : '#f0f0f0'};
    }

    .preview-container {
      background: ${this.darkMode ? '#252526' : 'white'};
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: auto;
    }

    .preview-wrapper {
      padding: 20px;
      background: ${this.darkMode ? '#252526' : 'white'};
    }

    .email-frame {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      border: 1px solid ${this.darkMode ? '#3e3e42' : '#e0e0e0'};
      border-radius: 4px;
      background: white;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      transition: max-width 0.3s ease;
      overflow: hidden;
    }

    .email-content {
      padding: 0px;
      background: white;
      overflow-x: auto;
      max-width: 100%;
      margin: 0;
      vertical-align: top;
    }

    .email-content * {
      max-width: 100%;
      box-sizing: border-box;
    }

    .email-content img {
      height: auto;
    }

    .email-content table {
      table-layout: auto;
      width: auto !important;
      max-width: 100%;
    }

    /* Viewport sizes */
    .viewport-desktop-1920 { max-width: 1920px; }
    .viewport-desktop-1024 { max-width: 1024px; }
    .viewport-tablet-768 { max-width: 768px; }
    .viewport-mobile-375 { max-width: 375px; }
    .viewport-custom { max-width: var(--custom-width, 600px); }

    .info-bar {
      background: ${this.darkMode ? '#1e3a5f' : '#e8f4f8'};
      border-left: 4px solid #0066cc;
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 4px;
      font-size: 13px;
      color: ${this.darkMode ? '#9dd7ff' : '#003366'};
    }

    .client-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
      background: #0066cc;
      color: white;
    }

    .dimension-display {
      font-size: 12px;
      color: ${this.darkMode ? '#858585' : '#666'};
      margin-left: auto;
    }

    /* Validation styles */
    .validation-panel {
      background: ${this.darkMode ? '#252526' : 'white'};
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      color: ${this.darkMode ? '#cccccc' : '#333'};
    }

    .validation-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .validation-report {
      font-size: 13px;
    }

    .validation-summary {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: ${this.darkMode ? '#1e1e1e' : '#f9f9f9'};
      border-radius: 4px;
    }

    .issue-count {
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
    }

    .issue-count.errors {
      background: #ff4444;
      color: white;
    }

    .issue-count.warnings {
      background: #ffa500;
      color: white;
    }

    .issue-count.infos {
      background: #4a9eff;
      color: white;
    }

    .issue-group {
      margin-bottom: 16px;
    }

    .issue-group h4 {
      font-size: 13px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .issue-group.errors h4 { color: #ff4444; }
    .issue-group.warnings h4 { color: #ffa500; }
    .issue-group.info h4 { color: #4a9eff; }

    .issue-group ul {
      list-style: none;
      padding-left: 0;
    }

    .issue-group li {
      padding: 8px 12px;
      margin-bottom: 4px;
      background: ${this.darkMode ? '#1e1e1e' : '#f9f9f9'};
      border-radius: 4px;
      border-left: 3px solid currentColor;
    }

    .issue-group.errors li { border-left-color: #ff4444; }
    .issue-group.warnings li { border-left-color: #ffa500; }
    .issue-group.info li { border-left-color: #4a9eff; }

    .issue-message {
      display: block;
      margin-bottom: 4px;
    }

    .issue-docs {
      color: #0066cc;
      text-decoration: none;
      font-size: 12px;
    }

    .issue-docs:hover {
      text-decoration: underline;
    }

    .validation-success {
      padding: 12px;
      background: #4caf50;
      color: white;
      border-radius: 4px;
      text-align: center;
      font-weight: 500;
    }

    /* Resource Inspector Styles */
    .resource-report {
      font-size: 13px;
    }

    .resource-section {
      margin-bottom: 20px;
    }

    .resource-section h4 {
      font-size: 13px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .resource-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .resource-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: ${this.darkMode ? '#1e1e1e' : '#f9f9f9'};
      border-radius: 4px;
      border: 1px solid ${this.darkMode ? '#3e3e42' : '#e0e0e0'};
    }

    .resource-preview {
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${this.darkMode ? '#252526' : '#fff'};
      border-radius: 4px;
      border: 1px solid ${this.darkMode ? '#3e3e42' : '#ddd'};
    }

    .resource-icon {
      font-size: 24px;
    }

    .resource-details {
      flex: 1;
      min-width: 0;
    }

    .resource-src {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: ${this.darkMode ? '#9cdcfe' : '#0066cc'};
      word-break: break-all;
      margin-bottom: 6px;
    }

    .resource-badges {
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-external {
      background: #4a9eff;
      color: white;
    }

    .badge-warning {
      background: #ffa500;
      color: white;
    }

    .badge-info {
      background: #888;
      color: white;
    }

    .resource-meta {
      font-size: 11px;
      color: ${this.darkMode ? '#858585' : '#666'};
      margin-top: 4px;
    }

    .resource-list-compact {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .resource-item-compact {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: ${this.darkMode ? '#1e1e1e' : '#f9f9f9'};
      border-radius: 4px;
      font-size: 12px;
    }

    .resource-type-icon {
      flex-shrink: 0;
    }

    .resource-src-compact {
      flex: 1;
      font-family: 'Courier New', monospace;
      color: ${this.darkMode ? '#9cdcfe' : '#0066cc'};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .resource-summary {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 12px;
      color: ${this.darkMode ? '#858585' : '#666'};
    }

    .resource-more {
      text-align: center;
      padding: 8px;
      color: ${this.darkMode ? '#858585' : '#666'};
      font-size: 12px;
    }

    .resource-warning {
      padding: 8px 12px;
      background: #fff3cd;
      color: #856404;
      border-radius: 4px;
      font-size: 12px;
    }

    .resource-empty {
      text-align: center;
      padding: 12px;
      color: ${this.darkMode ? '#858585' : '#666'};
      font-style: italic;
    }

    /* Variable Inspector Styles */
    .variable-report {
      font-size: 13px;
    }

    .variable-section {
      margin-bottom: 16px;
    }

    .variable-section h4 {
      font-size: 13px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .variable-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .variable-item {
      padding: 6px 12px;
      background: ${this.darkMode ? '#1e1e1e' : '#f9f9f9'};
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .variable-item.missing {
      border-left: 3px solid #ffa500;
    }

    .variable-item.unused {
      border-left: 3px solid #888;
      opacity: 0.7;
    }

    .variable-name {
      color: ${this.darkMode ? '#9cdcfe' : '#0066cc'};
    }

    .variable-status {
      margin-left: auto;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }

    .variable-status.ok {
      background: #4caf50;
      color: white;
    }

    .variable-status.missing {
      background: #ffa500;
      color: white;
    }

    .variable-status.unused {
      background: #888;
      color: white;
    }

    .no-template-notice {
      padding: 12px;
      text-align: center;
      color: ${this.darkMode ? '#858585' : '#666'};
      font-style: italic;
    }

    ${clientStyles}
  </style>
</head>
<body>
  <div class="info-bar">
    📧 <strong>Email Preview</strong> - Edit your HTML file to see live updates
    <span class="client-badge">${this.getClientName()}</span>
  </div>

  <div class="controls">
    <div class="control-group">
      <label for="viewportSelect">Device:</label>
      <select id="viewportSelect" onchange="changeViewport(this.value)">
        <option value="desktop-1920" ${this.currentViewport === 'desktop-1920' ? 'selected' : ''}>Desktop (1920px)</option>
        <option value="desktop-1024" ${this.currentViewport === 'desktop-1024' ? 'selected' : ''}>Desktop (1024px)</option>
        <option value="tablet-768" ${this.currentViewport === 'tablet-768' ? 'selected' : ''}>Tablet (768px)</option>
        <option value="mobile-375" ${this.currentViewport === 'mobile-375' ? 'selected' : ''}>Mobile (375px)</option>
        <option value="custom">Custom Size</option>
      </select>
    </div>

    <div class="control-group">
      <label for="clientSelect">Email Client:</label>
      <select id="clientSelect" onchange="changeClient(this.value)">
        <option value="standard" ${this.currentClient === 'standard' ? 'selected' : ''}>Standard</option>
        <option value="gmail" ${this.currentClient === 'gmail' ? 'selected' : ''}>Gmail</option>
        <option value="outlook" ${this.currentClient === 'outlook' ? 'selected' : ''}>Outlook</option>
        <option value="apple" ${this.currentClient === 'apple' ? 'selected' : ''}>Apple Mail</option>
      </select>
    </div>

    ${isTemplate ? `
    <div class="control-group">
      <label for="dataFileSelect">Data File:</label>
      <select id="dataFileSelect" onchange="changeDataFile(this.value)">
        <option value="">No data</option>
        ${this.availableDataFiles.map(df => 
          `<option value="${df.path}" ${this.currentDataFile?.path === df.path ? 'selected' : ''}>${df.name}</option>`
        ).join('')}
      </select>
    </div>
    
    <div class="control-group">
      <button onclick="generateSampleData()">Generate Sample Data</button>
    </div>
    ` : ''}

    <div class="control-group">
      <label>
        <input type="checkbox" id="darkModeToggle" ${this.darkMode ? 'checked' : ''} onchange="toggleDarkMode(this.checked)">
        Dark Mode
      </label>
    </div>

    <span class="dimension-display" id="dimensionDisplay"></span>
  </div>

  ${isTemplate && variableReport ? `
  <div class="validation-panel">
    <div class="validation-toggle" onclick="toggleVariables()">
      <span id="variableToggleIcon">▶</span>
      <strong>Template Variables</strong>
      <span style="font-size: 11px; color: #888;">(${templateVariables.length} variable${templateVariables.length !== 1 ? 's' : ''})</span>
    </div>
    <div id="variableContent" style="display: none;">
      ${variableReport}
    </div>
  </div>
  ` : ''}

  <div class="validation-panel">
    <div class="validation-toggle" onclick="toggleValidation()">
      <span id="validationToggleIcon">▶</span>
      <strong>Validation Report</strong>
      <span style="font-size: 11px; color: #888;">(${issues.length} issue${issues.length !== 1 ? 's' : ''})</span>
    </div>
    <div id="validationContent" style="display: none;">
      ${validationReport}
    </div>
  </div>

  <div class="validation-panel">
    <div class="validation-toggle" onclick="toggleResources()">
      <span id="resourceToggleIcon">▶</span>
      <strong>Resource Inspector</strong>
      <span style="font-size: 11px; color: #888;">(${resources.length} resource${resources.length !== 1 ? 's' : ''})</span>
    </div>
    <div id="resourceContent" style="display: none;">
      ${resourceReport}
    </div>
  </div>

  <div class="preview-container">
    <div class="preview-wrapper">
      <div id="viewport" class="email-frame viewport-${this.currentViewport}">
        <div class="email-content" id="emailContent">
          ${sanitized}
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let validationVisible = false;
    let resourcesVisible = false;
    let variablesVisible = false;

    function changeViewport(viewport) {
      const frame = document.getElementById('viewport');
      frame.className = 'email-frame viewport-' + viewport;
      vscode.postMessage({ command: 'changeViewport', viewport: viewport });
      updateDimensionDisplay();
    }

    function changeClient(client) {
      vscode.postMessage({ command: 'changeClient', client: client });
    }

    function changeDataFile(filePath) {
      vscode.postMessage({ command: 'changeDataFile', filePath: filePath });
    }

    function generateSampleData() {
      vscode.postMessage({ command: 'generateSampleData' });
    }

    function toggleDarkMode(enabled) {
      vscode.postMessage({ command: 'toggleDarkMode', darkMode: enabled });
    }

    function toggleVariables() {
      const content = document.getElementById('variableContent');
      const icon = document.getElementById('variableToggleIcon');
      variablesVisible = !variablesVisible;
      content.style.display = variablesVisible ? 'block' : 'none';
      icon.textContent = variablesVisible ? '▼' : '▶';
    }

    function toggleValidation() {
      const content = document.getElementById('validationContent');
      const icon = document.getElementById('validationToggleIcon');
      validationVisible = !validationVisible;
      content.style.display = validationVisible ? 'block' : 'none';
      icon.textContent = validationVisible ? '▼' : '▶';
    }

    function toggleResources() {
      const content = document.getElementById('resourceContent');
      const icon = document.getElementById('resourceToggleIcon');
      resourcesVisible = !resourcesVisible;
      content.style.display = resourcesVisible ? 'block' : 'none';
      icon.textContent = resourcesVisible ? '▼' : '▶';
    }

    function updateDimensionDisplay() {
      const frame = document.getElementById('viewport');
      const width = frame.offsetWidth;
      document.getElementById('dimensionDisplay').textContent = width + 'px';
    }

    window.addEventListener('load', updateDimensionDisplay);
    window.addEventListener('resize', updateDimensionDisplay);
  </script>
</body>
</html>`;
  }

  private getClientName(): string {
    const names: { [key: string]: string } = {
      standard: 'Standard',
      gmail: 'Gmail',
      outlook: 'Outlook',
      apple: 'Apple Mail',
    };
    return names[this.currentClient] || 'Standard';
  }

  private getClientSpecificStyles(): string {
    switch (this.currentClient) {
      case 'gmail':
        return `
    /* Gmail-specific CSS limitations */
    .email-content * {
      /* Gmail strips margin and padding from some elements */
    }
    .email-content table {
      border-collapse: collapse !important;
    }`;
      
      case 'outlook':
        return `
    /* Outlook-specific rendering quirks */
    .email-content table {
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    .email-content img {
      -ms-interpolation-mode: bicubic;
    }`;
      
      case 'apple':
        return `
    /* Apple Mail specific styles */
    .email-content a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
    }`;
      
      default:
        return '';
    }
  }

  private sanitizeHtml(html: string): string {
    // Defense-in-depth HTML sanitization
    // NOTE: The primary security control is the Content Security Policy (CSP) in the webview.
    // This sanitization provides an additional layer of protection but should not be relied upon
    // as the sole security mechanism. CSP prevents execution of inline scripts and restricts
    // resource loading regardless of what gets through this filter.
    let sanitized = html;
    let previousLength = -1;
    
    // Keep sanitizing until no more changes occur (prevents nested attacks)
    // We use a loop because attackers may try nested encodings like <<script>script>
    while (sanitized.length !== previousLength && sanitized.length > 0) {
      previousLength = sanitized.length;
      
      // Remove script tags and their content (with whitespace tolerance)
      sanitized = sanitized.replace(/<script[\s\S]*?<\/script[\s]*>/gi, '');
      sanitized = sanitized.replace(/<script[^>]*>/gi, '');
      
      // Remove inline event handlers with various formats
      // Pattern handles: onclick="..." onclick='...' onclick=... 
      sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
      sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s"'>][^\s>]*/gi, '');
      
      // Remove dangerous protocols (javascript:, data:, vbscript:)
      sanitized = sanitized.replace(/javascript\s*:/gi, 'blocked:');
      sanitized = sanitized.replace(/vbscript\s*:/gi, 'blocked:');
      // Note: data: URLs are allowed for images in CSP and email templates commonly use them
      // but we block them in href/action/formaction/background contexts
      sanitized = sanitized.replace(/\s(href|action|formaction|background)\s*=\s*["']data:[^"']*["']/gi, '');
      
      // Remove potentially dangerous tags (with whitespace tolerance)
      sanitized = sanitized.replace(/<iframe[\s\S]*?<\/iframe[\s]*>/gi, '');
      sanitized = sanitized.replace(/<iframe[^>]*>/gi, '');
      sanitized = sanitized.replace(/<object[\s\S]*?<\/object[\s]*>/gi, '');
      sanitized = sanitized.replace(/<object[^>]*>/gi, '');
      sanitized = sanitized.replace(/<embed[^>]*>/gi, '');
      sanitized = sanitized.replace(/<applet[\s\S]*?<\/applet[\s]*>/gi, '');
      sanitized = sanitized.replace(/<applet[^>]*>/gi, '');
      sanitized = sanitized.replace(/<frame[^>]*>/gi, '');
      sanitized = sanitized.replace(/<frameset[\s\S]*?<\/frameset[\s]*>/gi, '');
      sanitized = sanitized.replace(/<meta[^>]*>/gi, '');
      sanitized = sanitized.replace(/<base[^>]*>/gi, '');
      sanitized = sanitized.replace(/<link\s+rel\s*=\s*["']?import["']?[^>]*>/gi, '');
      
      // Remove form-related tags (forms don't work in email clients anyway)
      sanitized = sanitized.replace(/<\/?form[^>]*>/gi, '');
      sanitized = sanitized.replace(/<input[^>]*>/gi, '');
      sanitized = sanitized.replace(/<button[^>]*>/gi, '');
      sanitized = sanitized.replace(/<textarea[\s\S]*?<\/textarea[\s]*>/gi, '');
      sanitized = sanitized.replace(/<select[\s\S]*?<\/select[\s]*>/gi, '');
    }
    
    return sanitized;
  }

  private async loadDataFiles() {
    this.availableDataFiles = await this.dataManager.autoDetectDataFiles(this.document.uri.fsPath);
    
    // Auto-select the first data file if available and none selected
    if (this.availableDataFiles.length > 0 && !this.currentDataFile) {
      this.currentDataFile = this.availableDataFiles[0];
    }
  }

  private async selectDataFile(filePath: string) {
    if (!filePath) {
      this.currentDataFile = null;
    } else {
      const dataFile = await this.dataManager.loadDataFile(filePath);
      if (dataFile) {
        this.currentDataFile = dataFile;
      }
    }
    this.update(this.document);
  }

  private generateAndApplySampleData() {
    const content = this.document.getText();
    const renderResult = this.templateEngine.render(content, {});
    const sampleData = this.dataManager.generateSampleData(
      renderResult.variables.map(v => v.name)
    );
    
    // Create a sample data file
    const dir = path.dirname(this.document.uri.fsPath);
    const basename = path.basename(this.document.uri.fsPath, path.extname(this.document.uri.fsPath));
    const dataFilePath = path.join(dir, `${basename}.data.json`);
    
    this.dataManager.saveDataFile(dataFilePath, sampleData).then(success => {
      if (success) {
        vscode.window.showInformationMessage(`Sample data saved to ${path.basename(dataFilePath)}`);
        this.loadDataFiles().then(() => this.update(this.document));
      }
    });
  }

  private generateVariableReport(
    variables: any[],
    missingVariables: string[],
    unusedDataProps: string[]
  ): string {
    if (variables.length === 0) {
      return '<div class="no-template-notice">No template variables detected</div>';
    }

    let html = '<div class="variable-report">';
    
    // All variables section
    html += '<div class="variable-section">';
    html += `<h4>📝 Template Variables (${variables.length})</h4>`;
    html += '<div class="variable-list">';
    
    for (const variable of variables) {
      const isMissing = missingVariables.includes(variable.name);
      html += `<div class="variable-item ${isMissing ? 'missing' : ''}">`;
      html += `<span class="variable-name">${variable.name}</span>`;
      if (isMissing) {
        html += '<span class="variable-status missing">Missing</span>';
      } else {
        html += '<span class="variable-status ok">✓</span>';
      }
      html += '</div>';
    }
    
    html += '</div></div>';
    
    // Unused data properties
    if (unusedDataProps.length > 0) {
      html += '<div class="variable-section">';
      html += `<h4>⚠️ Unused Data Properties (${unusedDataProps.length})</h4>`;
      html += '<div class="variable-list">';
      
      for (const prop of unusedDataProps) {
        html += '<div class="variable-item unused">';
        html += `<span class="variable-name">${prop}</span>`;
        html += '<span class="variable-status unused">Unused</span>';
        html += '</div>';
      }
      
      html += '</div></div>';
    }
    
    html += '</div>';
    return html;
  }
}
