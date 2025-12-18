import * as Handlebars from 'handlebars';

export interface TemplateVariable {
  name: string;
  path: string;
  type: 'variable' | 'helper' | 'partial';
  line?: number;
}

export interface TemplateRenderResult {
  html: string;
  variables: TemplateVariable[];
  errors: string[];
  missingVariables: string[];
}

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerBuiltInHelpers();
  }

  /**
   * Check if content contains Handlebars syntax
   */
  isTemplate(content: string): boolean {
    return /\{\{[\s\S]*?\}\}/.test(content);
  }

  /**
   * Extract all variables used in the template
   */
  extractVariables(template: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    const seen = new Set<string>();

    // Match {{variable}}, {{#helper variable}}, {{helper variable}}, etc.
    const patterns = [
      /\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\}\}/g,           // {{variable}}
      /\{\{\s*#\w+\s+([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\}\}/g,   // {{#each items}}
      /\{\{\s*\w+\s+([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\}\}/g,    // {{helper variable}}
    ];

    for (const pattern of patterns) {
      const matches = template.matchAll(pattern);
      for (const match of matches) {
        const varName = match[1];
        
        // Skip Handlebars built-in keywords
        if (['this', 'true', 'false', 'null', 'undefined'].includes(varName)) {
          continue;
        }

        // Extract root variable (e.g., "user" from "user.name")
        const rootVar = varName.split('.')[0];
        
        if (!seen.has(rootVar)) {
          seen.add(rootVar);
          variables.push({
            name: rootVar,
            path: varName,
            type: 'variable',
          });
        }
      }
    }

    return variables;
  }

  /**
   * Render a Handlebars template with data
   */
  render(template: string, data: any = {}): TemplateRenderResult {
    const variables = this.extractVariables(template);
    const errors: string[] = [];
    const missingVariables: string[] = [];
    let html = '';

    try {
      const compiledTemplate = this.handlebars.compile(template, {
        strict: false,
        noEscape: false, // Keep HTML escaping enabled for security
        preventIndent: true, // Prevent indent-related issues
      });

      html = compiledTemplate(data);

      // Check for missing variables
      for (const variable of variables) {
        const rootVar = variable.name;
        if (!(rootVar in data)) {
          missingVariables.push(rootVar);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Template rendering error: ${errorMessage}`);
      
      // Return safe error message instead of original template
      html = `
        <div style="padding: 20px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 4px; margin: 20px;">
          <h3 style="color: #856404; margin-bottom: 10px;">⚠️ Template Rendering Error</h3>
          <p style="color: #856404; font-family: monospace; white-space: pre-wrap;">${this.escapeHtml(errorMessage)}</p>
        </div>
      `;
    }

    return {
      html,
      variables,
      errors,
      missingVariables,
    };
  }

  /**
   * Escape HTML to prevent XSS in error messages
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Register built-in Handlebars helpers
   */
  private registerBuiltInHelpers() {
    // Custom helper for conditional display
    this.handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    // Helper for uppercase transformation
    this.handlebars.registerHelper('uppercase', function(str: any) {
      return typeof str === 'string' ? str.toUpperCase() : str;
    });

    // Helper for lowercase transformation
    this.handlebars.registerHelper('lowercase', function(str: any) {
      return typeof str === 'string' ? str.toLowerCase() : str;
    });

    // Helper for formatting dates
    this.handlebars.registerHelper('formatDate', function(date: any) {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Helper for currency formatting
    this.handlebars.registerHelper('currency', function(amount: any) {
      if (typeof amount !== 'number') return amount;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    });
  }

  /**
   * Register a custom helper
   */
  registerHelper(name: string, fn: Handlebars.HelperDelegate) {
    this.handlebars.registerHelper(name, fn);
  }

  /**
   * Unregister a helper
   */
  unregisterHelper(name: string) {
    this.handlebars.unregisterHelper(name);
  }

  /**
   * Get all registered helpers
   */
  getHelpers(): string[] {
    return Object.keys(this.handlebars.helpers);
  }
}
