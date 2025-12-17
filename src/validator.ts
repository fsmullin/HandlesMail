import * as vscode from 'vscode';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  property?: string;
  docs?: string;
}

export class EmailValidator {
  private unsupportedCssProperties = new Map<string, string[]>([
    ['gmail', [
      'position',
      'float',
      'z-index',
      'clear',
      'background-attachment',
      'background-position',
      'direction',
      'list-style-type',
      'list-style-position',
    ]],
    ['outlook', [
      'background-size',
      'box-shadow',
      'border-radius',
      'opacity',
      'rgba',
      'transform',
      'animation',
      'transition',
    ]],
    ['apple', [
      'word-break',
    ]],
  ]);

  private commonIssues = [
    {
      pattern: /<style[^>]*>[\s\S]*?<\/style>/gi,
      check: (content: string) => {
        const hasMedia = /@media/i.test(content);
        if (hasMedia) {
          return {
            type: 'warning' as const,
            message: 'Media queries may not work in all email clients (Gmail, Outlook)',
            docs: 'https://www.caniemail.com/features/css-at-media/',
          };
        }
        return null;
      },
    },
    {
      pattern: /<img[^>]*>/gi,
      check: (content: string) => {
        if (!content.includes('alt=')) {
          return {
            type: 'warning' as const,
            message: 'Image missing alt attribute (accessibility issue)',
            docs: 'https://www.w3.org/WAI/tutorials/images/',
          };
        }
        if (!content.includes('width=') || !content.includes('height=')) {
          return {
            type: 'info' as const,
            message: 'Image missing width/height attributes (may cause layout shifts)',
          };
        }
        return null;
      },
    },
    {
      pattern: /background-image\s*:\s*url\([^)]+\)/gi,
      check: () => ({
        type: 'warning' as const,
        message: 'Background images not supported in Outlook',
        docs: 'https://www.caniemail.com/features/css-background-image/',
      }),
    },
    {
      pattern: /<form[^>]*>/gi,
      check: () => ({
        type: 'error' as const,
        message: 'Forms are not supported in most email clients',
        docs: 'https://www.caniemail.com/features/html-form/',
      }),
    },
    {
      pattern: /<(video|audio|canvas|svg)[^>]*>/gi,
      check: (content: string, match: RegExpMatchArray) => ({
        type: 'warning' as const,
        message: `<${match[1]}> element has limited support in email clients`,
        docs: 'https://www.caniemail.com/',
      }),
    },
    {
      pattern: /<!DOCTYPE[^>]*>/gi,
      check: (content: string) => {
        if (!content.match(/<!DOCTYPE html>/i)) {
          return {
            type: 'info' as const,
            message: 'Consider using <!DOCTYPE html> for email templates',
          };
        }
        return null;
      },
    },
  ];

  validate(htmlContent: string, emailClient: string = 'standard'): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check common issues
    for (const rule of this.commonIssues) {
      const matches = htmlContent.matchAll(rule.pattern);
      for (const match of matches) {
        const issue = rule.check(match[0], match);
        if (issue) {
          issues.push(issue);
        }
      }
    }

    // Check client-specific CSS issues
    if (emailClient !== 'standard') {
      const unsupportedProps = this.unsupportedCssProperties.get(emailClient) || [];
      for (const prop of unsupportedProps) {
        const pattern = new RegExp(`${prop}\\s*:`, 'gi');
        if (pattern.test(htmlContent)) {
          issues.push({
            type: 'warning',
            message: `CSS property '${prop}' is not supported in ${this.getClientName(emailClient)}`,
            property: prop,
            docs: `https://www.caniemail.com/features/css-${prop}/`,
          });
        }
      }
    }

    // Check for external resources
    const externalResourcePattern = /(href|src)=["'](https?:\/\/[^"']+)["']/gi;
    const externalMatches = htmlContent.matchAll(externalResourcePattern);
    for (const match of externalMatches) {
      issues.push({
        type: 'info',
        message: `External resource detected: ${match[2]}`,
      });
    }

    // Check for inline styles (best practice)
    const hasStyleTag = /<style/i.test(htmlContent);
    const hasInlineStyles = /style\s*=/i.test(htmlContent);
    
    if (hasStyleTag && !hasInlineStyles) {
      issues.push({
        type: 'info',
        message: 'Consider using inline styles for better email client compatibility',
        docs: 'https://www.caniemail.com/features/html-style/',
      });
    }

    return issues;
  }

  private getClientName(client: string): string {
    const names: { [key: string]: string } = {
      gmail: 'Gmail',
      outlook: 'Outlook',
      apple: 'Apple Mail',
    };
    return names[client] || client;
  }

  generateValidationReport(issues: ValidationIssue[]): string {
    if (issues.length === 0) {
      return '<div class="validation-success">✓ No issues found</div>';
    }

    const errors = issues.filter((i) => i.type === 'error');
    const warnings = issues.filter((i) => i.type === 'warning');
    const infos = issues.filter((i) => i.type === 'info');

    let html = '<div class="validation-report">';
    html += `<div class="validation-summary">`;
    html += `<span class="issue-count errors">${errors.length} errors</span>`;
    html += `<span class="issue-count warnings">${warnings.length} warnings</span>`;
    html += `<span class="issue-count infos">${infos.length} suggestions</span>`;
    html += `</div>`;

    const renderIssues = (items: ValidationIssue[], type: string) => {
      if (items.length === 0) return '';
      
      let result = `<div class="issue-group ${type}">`;
      result += `<h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>`;
      result += '<ul>';
      
      for (const issue of items) {
        result += '<li>';
        result += `<span class="issue-message">${issue.message}</span>`;
        if (issue.docs) {
          result += ` <a href="${issue.docs}" target="_blank" class="issue-docs">Learn more</a>`;
        }
        result += '</li>';
      }
      
      result += '</ul></div>';
      return result;
    };

    html += renderIssues(errors, 'errors');
    html += renderIssues(warnings, 'warnings');
    html += renderIssues(infos, 'info');
    html += '</div>';

    return html;
  }
}
