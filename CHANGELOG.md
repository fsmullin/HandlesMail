# Changelog

## [0.2.0] - 2025-12-18

### Added
- Compact toolbar interface with icon-based controls
- Collapsible panels for all inspector tools (variables, validation, resources, controls)
- Smart badges on toolbar icons showing:
  - Variable count with status indicators (green/red)
  - Validation issue count with severity indicators (green/orange/red)
  - Resource count with quality indicators (green/yellow/gray)
- Handlebars template support with variable inspection
- Data file auto-detection for template rendering (`.data.json` files)
- Sample data generation for template variables
- Multiple email client simulation modes (Gmail, Outlook, Apple Mail)
- Additional viewport options (1920px, 1024px, 768px, 375px)
- Resource inspector showing images, links, stylesheets, and scripts
- Validation report with client-specific compatibility warnings
- Dark mode toggle in controls panel

### Changed
- Removed top banner for cleaner interface
- Replaced expandable sections with toolbar-controlled collapsible panels
- Improved panel animations with smooth slide transitions
- Enhanced visual feedback with color-coded status badges

### Improved
- More intuitive UI with toolbar-based navigation
- Better use of screen space by hiding panels until needed
- Clearer status indicators for template health
- Professional icon-based interface using SVG icons

## [0.1.0] - 2024-12-16

### Added
- Initial MVP release
- Live HTML email preview in dedicated side panel
- Real-time updates as you edit HTML files
- Responsive design preview modes (desktop 600px / mobile 375px)
- Toggle preview panel with keyboard shortcut (Ctrl+Shift+E / Cmd+Shift+E)
- HTML security sanitization (strips scripts and dangerous attributes)
- Configurable auto-preview settings
- Professional preview UI with controls
- Example email templates

### Features
- Support for `.html` files
- Desktop and mobile viewport switching
- VS Code settings integration
- Syntax highlighting support
- Local resource handling

### Known Limitations
- Scripts are stripped for security
- External resource loading may be sandboxed
- Email client-specific rendering variations not yet simulated

