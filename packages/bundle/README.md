# @fractal-mcp/bundle

Bundles React/TypeScript/JavaScript components into optimized single files using Vite.

## Installation

```bash
npm install @fractal-mcp/bundle
```

## Usage

### Programmatic API

```javascript
import { bundle, generateHtml } from '@fractal-mcp/bundle';

// Bundle your component
const { jsPath, cssPath } = await bundle({
  entrypoint: "/path/to/your/Component.tsx",
  dst: "./output-directory"
});

// Generate HTML with your bundled component
const html = generateHtml({ 
  jsPath, 
  cssPath, 
  title: "My Component",
  data: { message: 'hello' } 
});
```

Output files:
- `Component.jsx` - Bundled JavaScript
- `index.css` - Bundled CSS (if CSS is present)

### Command Line Interface

Use the separate CLI package:

```bash
npm install -g @fractal-mcp/cli

# Bundle a component
fractal bundle --entrypoint ./src/App.tsx --dst ./dist
```

#### CLI Options

| Option | Description | Required |
|--------|-------------|----------|
| `-e, --entrypoint <path>` | Component file path | ✅ |
| `-d, --dst <path>` | Output directory | ✅ |
| `-n, --name <name>` | Custom component name | ❌ |

## Features

- **Input**: `.tsx`, `.jsx`, `.js` files
- **Output**: ES modules, tree-shaken and minified
- **CSS**: Extracts and bundles all styles into `index.css`
- **Tailwind**: Automatically configured with PostCSS
- **Dependencies**: React and React DOM are externalized

## API Reference

### `bundle(options)`

**Options:**
- `entrypoint: string` - Path to component file
- `dst: string` - Output directory
- `componentName?: string` - Custom component name

**Returns:** `Promise<{ jsPath: string; cssPath?: string }>`

### `generateHtml(options)`

**Options:**
- `jsPath: string` - Path to bundled JS file
- `cssPath?: string` - Path to bundled CSS file  
- `title?: string` - HTML document title
- `data?: unknown` - Data to inject as `window.__FRACTAL_DATA__`

**Returns:** `string` - Complete HTML document
