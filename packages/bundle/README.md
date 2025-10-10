# @fractal-mcp/bundle

Bundling utilities for Fractal MCP applications. This package provides flexible tools to bundle React components, JS/TS entry points, and HTML files into various output formats using Vite.

This package is useful for building embedded applications whether you're building with fractal, MCP UI, or openai apps sdk.

## Features

- 📦 Bundle React components (.tsx/.jsx) with multiple output formats
- ⚡ Bundle JS/TS entry points (framework-agnostic)
- 🎯 Bundle HTML files into single self-contained files
- 🎨 Multiple output formats: full HTML, HTML snippets, or separate assets
- 🔍 Automatic framework detection (React, Vue, Svelte)
- ✅ Built-in testing utilities using Playwright
- 🚀 Powered by Vite for fast bundling
- 🎛️ Fine-grained control over asset inlining

## Installation

```bash
npm install @fractal-mcp/bundle
```

## Quick Start

### Bundle a React Component (default: single HTML file)

```typescript
import { bundleReactComponent } from '@fractal-mcp/bundle';

await bundleReactComponent({
  entrypoint: './src/MyComponent.tsx',
  out: './dist'
});
// Outputs: dist/index.html (single file with everything inlined)
```

### Bundle JS/TS Entry Point

```typescript
import { bundleJSEntrypoint } from '@fractal-mcp/bundle';

await bundleJSEntrypoint({
  entrypoint: './src/main.ts',
  out: './dist',
  rootElement: 'app' // ID of the root element your app mounts to
});
```

### Bundle HTML File

```typescript
import { bundleHTMLInput } from '@fractal-mcp/bundle';

await bundleHTMLInput({
  entrypoint: './src/index.html',
  out: './dist'
});
```

## Output Formats

### HTML Format (default)

Output a complete HTML document or just a snippet:

```typescript
// Full HTML document with inlined assets (default)
await bundleReactComponent({
  entrypoint: './src/MyComponent.tsx',
  out: './dist',
  output: {
    type: 'html',
    inline: { js: true, css: true },
    rootOnly: false
  }
});

// HTML snippet (just <div>, <style>, <script> tags)
await bundleReactComponent({
  entrypoint: './src/MyComponent.tsx',
  out: './dist',
  output: {
    type: 'html',
    rootOnly: true,
    inline: { js: true, css: true }
  }
});

// Full HTML with external asset files
await bundleReactComponent({
  entrypoint: './src/MyComponent.tsx',
  out: './dist',
  output: {
    type: 'html',
    inline: { js: false, css: false }
  }
});
// Outputs: dist/index.html, dist/main.js, dist/index.css
```

### Assets Format

Output only JavaScript and CSS files (no HTML):

```typescript
await bundleReactComponent({
  entrypoint: './src/MyComponent.tsx',
  out: './dist',
  output: {
    type: 'assets'
  }
});
// Outputs: dist/main.js and dist/index.css (NO HTML)
```

Perfect for embedding in existing applications!

## API Reference

### `bundleReactComponent(options)`

Bundles a React component with flexible output options.

**Options:**
- `entrypoint` (string): Path to `.tsx` or `.jsx` file
- `out` (string): Output directory path
- `output` (optional): Output configuration
  - `type`: `'html'` (default) or `'assets'`
  - `inline`: `{ js?: boolean, css?: boolean }` (default: both true)
  - `rootOnly`: boolean (default: false) - output snippet instead of full HTML

### `bundleJSEntrypoint(options)`

Bundles a JavaScript/TypeScript entry point (framework-agnostic).

**Options:**
- `entrypoint` (string): Path to `.ts`, `.tsx`, `.js`, or `.jsx` file
- `out` (string): Output directory path
- `rootElement` (optional): Root element ID (default: 'root')
- `output` (optional): Same as `bundleReactComponent`

### `bundleHTMLInput(options)`

Bundles an HTML file into a single self-contained file.

**Options:**
- `entrypoint` (string): Path to `.html` file
- `out` (string): Output directory path

**Note:** HTML input always produces a single inlined HTML file.

## License

MIT
