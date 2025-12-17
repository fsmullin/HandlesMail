# Security Policy

## Security Measures

HandlesMail implements multiple layers of security to protect users from malicious email templates and data files.

### 1. Content Security Policy (CSP)

The primary security control is a strict Content Security Policy applied to the webview:

- **default-src 'none'**: Blocks all resource loading by default
- **img-src**: Only allows images from webview resources, HTTPS, and data: URIs (common in email)
- **style-src 'unsafe-inline'**: Allows inline styles (necessary for email preview and styling)
- **script-src 'unsafe-inline'**: Required for VS Code webview API communication (acquireVsCodeApi). The webview only executes trusted code from the extension, and user HTML content is sanitized before rendering.
- **connect-src 'none'**: Blocks all network connections from webview
- **font-src**: Only allows fonts from webview and HTTPS

**Note on 'unsafe-inline'**: While script-src 'unsafe-inline' is generally discouraged, it is required for VS Code webview communication. The extension compensates for this by:
1. Sanitizing all user HTML content before rendering
2. Only executing trusted extension code in the webview
3. Blocking external script sources
4. Validating all inputs from the webview

This CSP prevents:
- Execution of malicious scripts from user HTML templates (sanitized before rendering)
- Loading of unauthorized external resources
- Data exfiltration attempts
- Cross-site scripting (XSS) attacks from external sources

### 2. HTML Sanitization (Defense-in-Depth)

While CSP is the primary control, we also implement HTML sanitization as a defense-in-depth measure:

- Removes `<script>` tags and content
- Removes inline event handlers (onclick, onerror, onload, etc.)
- Blocks dangerous protocols (javascript:, vbscript:, data: in unsafe contexts)
- Removes potentially dangerous tags (iframe, object, embed, frame, applet, meta, base)
- Removes form elements (forms don't work in email clients anyway)
- Uses iterative sanitization to prevent nested attack vectors

**Note**: The sanitization is not perfect and should not be relied upon as the sole security mechanism. CSP provides the real protection.

### 3. Path Traversal Protection

File system access is protected against directory traversal attacks:

- All file paths are normalized and validated
- Directory traversal sequences (..) are blocked
- Only JSON files are allowed to be loaded as data files
- File access is restricted to workspace directories
- Symlinks are not followed

### 4. File Size Limits

To prevent denial-of-service attacks:

- JSON data files are limited to 10MB maximum
- File size is checked before parsing
- Large files are rejected with appropriate error messages

### 5. Input Validation

All inputs from the webview are validated:

- Viewport selections are validated against allowed values
- Email client selections are validated against allowed values
- File paths are validated before loading
- Message types are checked before processing
- Boolean and string type checking on all inputs

### 6. Template Rendering Security

Handlebars template rendering is configured securely:

- HTML escaping is enabled (noEscape: false)
- Error messages are HTML-escaped to prevent XSS
- Template compilation errors are handled safely
- No unsafe helpers are registered

### 7. Resource Loading Restrictions

Webview resource loading is restricted:

- `localResourceRoots` limits file access to:
  - The directory containing the current document
  - The extension's own directory
- External resources are only loaded if CSP allows them
- Resource URIs are properly validated

## Known Limitations

1. **Regex-based sanitization**: While we use iterative regex-based HTML sanitization as defense-in-depth, regex cannot catch all possible XSS vectors. We rely on CSP as the primary defense.

2. **Email preview accuracy**: The preview is an approximation of how emails will render. Always test in actual email clients before sending.

3. **External resources**: Some external resources (images, fonts) are allowed to support common email template patterns. Users should only open trusted templates.

4. **Data: URLs for images**: We allow data: URLs in image src attributes because they're commonly used in email templates. CSP restricts their use in other contexts.

## Reporting Security Issues

If you discover a security vulnerability in HandlesMail, please report it by:

1. **Do NOT** open a public issue
2. Email the security concern to the repository owner through GitHub
3. Include detailed steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

We take security seriously and will respond promptly to legitimate security concerns.

## Security Best Practices for Users

When using HandlesMail:

1. **Only open trusted HTML templates** - Don't preview templates from untrusted sources
2. **Review data files** - Check JSON data files before loading them
3. **Keep extension updated** - Install updates promptly to get security fixes
4. **Use in trusted workspaces** - Only use the extension in workspaces you trust
5. **Report suspicious behavior** - If you notice unusual behavior, report it

## Security Audit History

- **2025-12**: Initial security audit performed
  - Implemented Content Security Policy
  - Enhanced HTML sanitization
  - Added path traversal protection
  - Implemented file size limits
  - Added input validation
  - Secured template rendering

## Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities and help improve the security of HandlesMail.
