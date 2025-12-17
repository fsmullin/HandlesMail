# HTML Email Preview Extension

A VS Code extension for previewing HTML emails with real-time updates, responsive design views, and email-specific styling support.

## Features

- **Live HTML Preview** - See your email changes instantly as you type
- **Responsive Views** - Toggle between desktop (600px) and mobile (375px) viewports
- **Side Panel** - Dedicated preview panel keeps your code and preview visible side-by-side
- **Auto-Update** - Configurable automatic preview updates
- **Easy Toggle** - Keyboard shortcut to show/hide the preview panel

## Installation

### From VS Code Marketplace

Search for "HTML Email Preview" in the VS Code Extensions marketplace and click Install.

### Manual Installation

1. Clone the repository
2. Run `npm install`
3. Run `npm run esbuild`
4. Press `F5` to open in debug mode, or package with `vsce package`

## Quick Start

1. Open an `.html` file in VS Code
2. Press `Ctrl+Shift+E` (Windows/Linux) or `Cmd+Shift+E` (Mac) to toggle the preview
3. Or use the Command Palette (`Ctrl+Shift+P`) and select "Preview Email"

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

## Usage Tips

### Email Best Practices

- Use inline styles for email compatibility across clients
- Test with responsive views to ensure mobile rendering
- Avoid JavaScript (not supported in most email clients)
- Use web-safe fonts or include fallbacks

### Example Email Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center">
        <table width="600" style="background-color: #ffffff; margin: 20px 0;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <h1 style="color: #333; margin: 0 0 20px 0;">Welcome!</h1>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Thank you for signing up. We're excited to have you on board.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Known Limitations

- Preview strips `<script>` tags for security
- External resource loading may be restricted by VS Code's webview sandbox
- Some advanced CSS features may not render exactly as in all email clients

## Troubleshooting

### Preview panel won't open

- Ensure you have an `.html` file open
- Try using the Command Palette: `Ctrl+Shift+P` → "Preview Email"

### Changes not updating

- Check that "Auto Preview" is enabled in settings
- Save the file (`Ctrl+S`)
- Manual preview update will be added in future versions

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## License

MIT

---

**Happy emailing!** 📧
