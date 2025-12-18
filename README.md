# HandlesMail

A VS Code extension for previewing and testing dynamic transactional email templates with Handlebars syntax. Perfect for developers working with SendGrid dynamic templates, Mailchimp, or any Handlebars-based email system.

## Features

### 🎨 Template Engine Support
- **Handlebars Syntax** - Full support for `{{variables}}`, `{{#if}}`, `{{#each}}`, and custom helpers
- **Dynamic Data Files** - Test templates with JSON data files
- **Multiple Data Sets** - Switch between different data scenarios (e.g., premium vs. basic users)
- **Variable Inspector** - See all variables used in your template and their current values
- **Sample Data Generation** - Auto-generate sample data for any template

### 📱 Device & Client Simulation
- **Multiple Viewports** - Preview in Desktop (1920px, 1024px), Tablet (768px), or Mobile (375px)
- **Email Client Modes** - Simulate Gmail, Outlook, and Apple Mail rendering
- **Dark Mode Support** - Toggle dark mode to test email appearance
- **Live Updates** - See changes instantly as you type

### 🔍 Validation & Inspection
- **Email Validation** - Check for unsupported CSS, inline style usage, and accessibility issues
- **Resource Inspector** - Scan images, links, and stylesheets for broken references
- **Client-Specific Warnings** - Get notified about CSS that may not work in specific email clients

## Installation

### From VS Code Marketplace

Search for "HandlesMail" in the VS Code Extensions marketplace and click Install.

### Manual Installation

1. Clone the repository
2. Run `npm install`
3. Run `npm run esbuild`
4. Press `F5` to open in debug mode, or package with `vsce package`

## Quick Start

1. Open a `.html` file containing Handlebars template syntax
2. Press `Cmd+Shift+E` (Mac) or `Ctrl+Shift+E` (Windows/Linux) to open the preview
3. Create a companion data file (see Data Files section below)
4. Use the controls to switch viewports, email clients, and data files

## Data Files for Testing

HandlesMail Preview uses JSON files to provide test data for your Handlebars templates. This allows you to preview how your email will look with different user data.

### Naming Convention

Place data files in the same directory as your template with one of these naming patterns:

```
template-name.html          ← Your template
template-name.data.json     ← Exact match (auto-loaded)
template-name-premium.data.json   ← Variant (selectable)
template-name-basic.data.json     ← Variant (selectable)
data.json                   ← Generic fallback
```

**Example:**
```
welcome-email.html
welcome-email.data.json          ← Auto-loaded by default
welcome-email-premium.data.json  ← Premium user scenario
welcome-email-trial.data.json    ← Trial user scenario
```

### Data File Structure

Create a JSON file with key-value pairs matching your template variables:

**Template (welcome-email.html):**
```handlebars
<h1>Welcome to {{companyName}}, {{userName}}!</h1>
<p>Your email: {{userEmail}}</p>

{{#if isPremium}}
<div class="premium-badge">Premium Member</div>
{{/if}}

<ul>
{{#each features}}
  <li>{{this}}</li>
{{/each}}
</ul>
```

**Data File (welcome-email.data.json):**
```json
{
  "companyName": "Acme Corp",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "isPremium": true,
  "features": [
    "Access to dashboard",
    "24/7 customer support",
    "Premium analytics",
    "API access"
  ]
}
```

### Supported Data Types

- **Strings**: `"userName": "John Doe"`
- **Numbers**: `"age": 30`, `"price": 99.99`
- **Booleans**: `"isPremium": true`
- **Arrays**: `"items": ["item1", "item2"]`
- **Objects**: `"user": { "name": "John", "email": "john@example.com" }`
- **Nested Data**: Any combination of the above

### Auto-Generated Sample Data

Don't have a data file? Click the **Generate Sample Data** button in the preview to automatically create a `.data.json` file with sample values for all variables in your template.

## Preview Window Features

### Top Control Bar

**Viewport Selector**
- Desktop 1920px - Full desktop resolution
- Desktop 1024px - Standard laptop/desktop
- Tablet 768px - iPad and tablet devices
- Mobile 375px - iPhone and mobile devices

**Email Client Selector**
- Gmail - Simulates Gmail rendering with client-specific CSS
- Outlook - Simulates Outlook rendering quirks
- Apple Mail - Simulates Apple Mail rendering

**Dark Mode Toggle**
- Test how your email appears in dark mode email clients

**Data File Dropdown**
- Switch between different JSON data files
- Auto-detects files matching your template name
- Shows all available data scenarios

**Generate Sample Data Button**
- Creates a `.data.json` file with placeholder values
- Analyzes your template to find all variables
- Saves the file alongside your template

### Information Panels (Click to Expand)

**Template Variables Panel**
- Lists all Handlebars variables found in your template
- Shows current value from the selected data file
- Indicates if a variable is missing data (undefined)
- Displays variable type (string, array, object, etc.)

**Validation Report Panel**
- **Email Compatibility**: Warns about CSS properties not supported in email clients
- **Inline Styles**: Checks if styles are properly inlined
- **Accessibility**: Validates image alt text, proper heading structure
- **Client-Specific**: Highlights issues for Gmail, Outlook, or Apple Mail
- Shows count of issues by severity (error, warning, info)

**Resource Inspector Panel**
- **Images**: Lists all images with src, alt text, and loading status
- **Links**: Shows all `<a>` tags and their destinations
- **Broken References**: Identifies missing or invalid resources
- **Accessibility Issues**: Flags images without alt text

### Live Preview Area

The main preview renders your email with:
- Selected viewport width
- Applied email client CSS rules
- Current data file values injected
- Real-time updates as you edit

### Keyboard Shortcuts

- `Cmd+Shift+E` (Mac) / `Ctrl+Shift+E` (Win/Linux) - Toggle preview panel

## Handlebars Helpers

HandlesMail Preview includes built-in Handlebars helpers for common email template needs:

### Conditional Helpers

```handlebars
{{#if isPremium}}Premium Content{{/if}}

{{#ifEquals plan "premium"}}Premium Features{{/ifEquals}}
```

### Text Formatting

```handlebars
{{uppercase userName}}      → JOHN DOE
{{lowercase userEmail}}     → john@example.com
```

### Date & Currency

```handlebars
{{formatDate signupDate}}   → December 16, 2025
{{currency price}}          → $99.99
```

### Loops

```handlebars
{{#each items}}
  <li>{{this}}</li>
{{/each}}
```

## Configuration

Configure the extension in your VS Code settings:

```json
{
  "htmlEmailPreview.autoPreview": true,
  "htmlEmailPreview.defaultViewMode": "desktop"
}
```

### Settings

- `htmlEmailPreview.autoPreview` (boolean) - Automatically update preview as you edit (default: `true`)
- `htmlEmailPreview.defaultViewMode` (string) - Default viewport mode: `desktop` or `mobile` (default: `desktop`)

## SendGrid Integration

This extension is perfect for developing SendGrid dynamic templates locally:

1. **Create your template** with Handlebars syntax
2. **Test with data files** representing different user scenarios
3. **Validate** email client compatibility
4. **Copy/paste** the final HTML into SendGrid's template editor

SendGrid dynamic template variables like `{{subject}}`, `{{name}}`, and custom fields all work seamlessly.

## Best Practices

### Email Development
- **Use inline styles** - Most email clients strip `<style>` tags
- **Test multiple viewports** - Preview on mobile, tablet, and desktop sizes
- **Check client compatibility** - Switch between Gmail, Outlook, and Apple Mail modes
- **Validate resources** - Use the Resource Inspector to catch broken images/links
- **Web-safe fonts** - Use Arial, Helvetica, Georgia, Times New Roman, or include fallbacks

### Template Organization
- **One data file per scenario** - Create separate files for different user types
- **Descriptive names** - Use `template-premium.data.json`, `template-trial.data.json`
- **Complete data** - Include all variables to avoid "undefined" in preview
- **Version control** - Commit both templates and data files together

### Testing Workflow
1. Create template with Handlebars variables
2. Generate sample data or create data files manually
3. Preview with different viewports and email clients
4. Check validation report for compatibility issues
5. Test with multiple data scenarios (premium, basic, trial, etc.)
6. Export final template to your email service

## Example Project Structure

```
project/
├── templates/
│   ├── welcome-email.html
│   ├── welcome-email.data.json
│   ├── welcome-email-premium.data.json
│   ├── welcome-email-trial.data.json
│   ├── password-reset.html
│   ├── password-reset.data.json
│   ├── order-confirmation.html
│   └── order-confirmation.data.json
```

## Troubleshooting

### Preview panel won't open
- Ensure you have an `.html` file open
- Try using Command Palette: `Cmd+Shift+P` → "Preview Email"
- Check that the file contains HTML content

### Data file not showing in dropdown
- Ensure the data file is in the same directory as your template
- Check file naming: `template-name.data.json` or `template-name-variant.data.json`
- Verify the file contains valid JSON (no syntax errors)

### Variables showing as "undefined"
- Check that variable names in your data file match exactly (case-sensitive)
- Use the Template Variables panel to see which variables need data
- Click "Generate Sample Data" to create a starter data file

### Email looks different than expected
- Switch email client modes (Gmail/Outlook/Apple Mail) to see differences
- Check the Validation Report for unsupported CSS
- Some CSS properties work differently in email clients vs. browsers
- Use the Resource Inspector to verify all images and links load correctly

## Known Limitations

- JavaScript is stripped from templates for security
- External resource loading may be restricted by VS Code's webview sandbox
- Preview is an approximation - always test in actual email clients before sending
- Some email client quirks cannot be fully simulated

## Security

HandlesMail implements multiple security measures to protect users:

- **Content Security Policy (CSP)**: Strict CSP prevents execution of malicious scripts
- **HTML Sanitization**: Multiple passes remove dangerous tags and attributes
- **Path Validation**: Protection against directory traversal attacks
- **File Size Limits**: 10MB maximum for data files to prevent DoS
- **Input Validation**: All webview inputs are validated before processing

For more details, see [SECURITY.md](SECURITY.md).

**⚠️ Security Notice**: Only open HTML templates and data files from trusted sources.

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

For security vulnerabilities, please follow the responsible disclosure process described in [SECURITY.md](SECURITY.md).

## License

MIT

## Changelog

### 0.1.0 (Initial Release)
- Handlebars template engine support
- Multiple device viewport modes (1920px, 1024px, 768px, 375px)
- Email client simulation (Gmail, Outlook, Apple Mail)
- Dynamic data file loading and switching
- Template variable inspector
- Email validation and compatibility checking
- Resource inspector for images and links
- Dark mode support
- Auto-generate sample data
- Live preview with real-time updates

---

**Built for email developers** 📧 | **Test locally, deploy confidently** ✨
