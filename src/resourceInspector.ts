import * as vscode from 'vscode';

export interface Resource {
  type: 'image' | 'link' | 'stylesheet' | 'script';
  src: string;
  isExternal: boolean;
  hasAlt?: boolean;
  altText?: string;
  width?: string;
  height?: string;
  line?: number;
}

export class ResourceInspector {
  inspect(htmlContent: string): Resource[] {
    const resources: Resource[] = [];

    // Find all images
    const imgPattern = /<img[^>]*>/gi;
    const imgMatches = htmlContent.matchAll(imgPattern);
    
    for (const match of imgMatches) {
      const tag = match[0];
      const srcMatch = tag.match(/src=["']([^"']+)["']/i);
      const altMatch = tag.match(/alt=["']([^"']*)["']/i);
      const widthMatch = tag.match(/width=["']?([^"'\s>]+)["']?/i);
      const heightMatch = tag.match(/height=["']?([^"'\s>]+)["']?/i);
      
      if (srcMatch) {
        resources.push({
          type: 'image',
          src: srcMatch[1],
          isExternal: this.isExternal(srcMatch[1]),
          hasAlt: !!altMatch,
          altText: altMatch ? altMatch[1] : undefined,
          width: widthMatch ? widthMatch[1] : undefined,
          height: heightMatch ? heightMatch[1] : undefined,
        });
      }
    }

    // Find all links
    const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    const linkMatches = htmlContent.matchAll(linkPattern);
    
    for (const match of linkMatches) {
      resources.push({
        type: 'link',
        src: match[1],
        isExternal: this.isExternal(match[1]),
      });
    }

    // Find all stylesheets
    const stylePattern = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;
    const styleMatches = htmlContent.matchAll(stylePattern);
    
    for (const match of styleMatches) {
      const hrefMatch = match[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) {
        resources.push({
          type: 'stylesheet',
          src: hrefMatch[1],
          isExternal: this.isExternal(hrefMatch[1]),
        });
      }
    }

    // Find all scripts
    const scriptPattern = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
    const scriptMatches = htmlContent.matchAll(scriptPattern);
    
    for (const match of scriptMatches) {
      resources.push({
        type: 'script',
        src: match[1],
        isExternal: this.isExternal(match[1]),
      });
    }

    return resources;
  }

  private isExternal(url: string): boolean {
    return /^(https?:)?\/\//i.test(url);
  }

  generateResourceReport(resources: Resource[]): string {
    if (resources.length === 0) {
      return '<div class="resource-empty">No external resources found</div>';
    }

    const images = resources.filter((r) => r.type === 'image');
    const links = resources.filter((r) => r.type === 'link');
    const stylesheets = resources.filter((r) => r.type === 'stylesheet');
    const scripts = resources.filter((r) => r.type === 'script');

    let html = '<div class="resource-report">';

    // Images section
    if (images.length > 0) {
      html += '<div class="resource-section">';
      html += `<h4>📷 Images (${images.length})</h4>`;
      html += '<div class="resource-list">';
      
      for (const img of images) {
        html += '<div class="resource-item">';
        html += `<div class="resource-preview">`;
        if (!img.isExternal) {
          html += `<div class="resource-icon">🖼️</div>`;
        } else {
          html += `<img src="${img.src}" alt="${img.altText || 'Preview'}" style="max-width: 60px; max-height: 60px; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><div class="resource-icon" style="display:none;">🖼️</div>`;
        }
        html += `</div>`;
        html += '<div class="resource-details">';
        html += `<div class="resource-src" title="${img.src}">${this.truncate(img.src, 50)}</div>`;
        
        const badges = [];
        if (img.isExternal) badges.push('<span class="badge badge-external">External</span>');
        if (!img.hasAlt) badges.push('<span class="badge badge-warning">No alt</span>');
        if (!img.width || !img.height) badges.push('<span class="badge badge-info">No dimensions</span>');
        
        if (badges.length > 0) {
          html += `<div class="resource-badges">${badges.join(' ')}</div>`;
        }
        
        if (img.altText) {
          html += `<div class="resource-meta">Alt: "${img.altText}"</div>`;
        }
        if (img.width && img.height) {
          html += `<div class="resource-meta">Size: ${img.width} × ${img.height}</div>`;
        }
        html += '</div>';
        html += '</div>';
      }
      
      html += '</div></div>';
    }

    // Links section
    if (links.length > 0) {
      const externalLinks = links.filter((l) => l.isExternal);
      html += '<div class="resource-section">';
      html += `<h4>🔗 Links (${links.length})</h4>`;
      html += `<div class="resource-summary">`;
      html += `<span>${externalLinks.length} external</span>`;
      html += `<span>${links.length - externalLinks.length} internal</span>`;
      html += `</div>`;
      html += '<div class="resource-list-compact">';
      
      for (const link of links.slice(0, 10)) {
        html += `<div class="resource-item-compact">`;
        html += `<span class="resource-type-icon">${link.isExternal ? '🌐' : '📄'}</span>`;
        html += `<span class="resource-src-compact" title="${link.src}">${this.truncate(link.src, 60)}</span>`;
        html += `</div>`;
      }
      
      if (links.length > 10) {
        html += `<div class="resource-more">... and ${links.length - 10} more</div>`;
      }
      
      html += '</div></div>';
    }

    // Stylesheets section
    if (stylesheets.length > 0) {
      html += '<div class="resource-section">';
      html += `<h4>🎨 Stylesheets (${stylesheets.length})</h4>`;
      html += '<div class="resource-list-compact">';
      
      for (const style of stylesheets) {
        html += `<div class="resource-item-compact">`;
        html += `<span class="resource-type-icon">${style.isExternal ? '🌐' : '📄'}</span>`;
        html += `<span class="resource-src-compact" title="${style.src}">${this.truncate(style.src, 60)}</span>`;
        if (style.isExternal) {
          html += `<span class="badge badge-warning">External CSS may not work in emails</span>`;
        }
        html += `</div>`;
      }
      
      html += '</div></div>';
    }

    // Scripts section
    if (scripts.length > 0) {
      html += '<div class="resource-section">';
      html += `<h4>⚙️ Scripts (${scripts.length})</h4>`;
      html += `<div class="resource-warning">⚠️ Scripts are not supported in email clients</div>`;
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}
