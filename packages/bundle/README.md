# @fractal-mcp/bundle

Bundling utilities for Fractal MCP applications. This package provides tools to bundle React components and HTML files into single, self-contained HTML files using Vite and the vite-plugin-singlefile.

## Features

- 📦 Bundle React components (.tsx) into single HTML files
- 🎯 Bundle HTML files with dependencies into single HTML files  
- 🔍 Automatic framework detection (React, Vue, Svelte)
- ✅ Built-in testing utilities using Playwright
- 🚀 Powered by Vite for fast bundling

## Installation

```bash
npm install @fractal-mcp/bundle
```

## Usage

### Bundling a React Component

```typescript
import { bundleReactComponent } from '@fractal-mcp/bundle';

await bundleReactComponent({
  entrypoint: './src/MyComponent.tsx',  // Must default export a React component
  out: './dist'                          // Output directory for index.html
});
```

### Bundling an HTML File

```typescript
import { bundle } from '@fractal-mcp/bundle';

await bundle({
  entrypoint: './index.html',  // HTML file with script/style references
  out: './dist'                 // Output directory for bundled index.html
});
```

## API

### `bundleReactComponent(options: BundleOptions)`

Bundles a React component (.tsx file) that default exports a component into a single HTML file.

**Options:**
- `entrypoint` (string): Path to the .tsx file (absolute or relative to cwd)
- `out` (string): Output directory path (absolute or relative to cwd)

**Throws:**
- Error if entrypoint is not a .tsx file
- Error if bundling fails

### `bundle(options: BundleOptions)`

Bundles an HTML file and its dependencies into a single HTML file.

**Options:**
- `entrypoint` (string): Path to the .html file (absolute or relative to cwd)
- `out` (string): Output directory path (absolute or relative to cwd)

**Throws:**
- Error if entrypoint is not a .html file
- Error if bundling fails

## Framework Detection

The bundle package automatically detects your framework by:

1. Walking up the directory tree from the entrypoint to find package.json
2. Checking dependencies for framework packages:
   - React: `react` or `react-dom`
   - Vue: `vue` or `@vue/runtime-core`
   - Svelte/SvelteKit: `svelte` or `@sveltejs/kit`

3. Falling back to file extension detection:
   - `.tsx`/`.jsx` → React
   - `.vue` → Vue
   - `.svelte` → Svelte

## How It Works

### For React Components

1. Creates a temporary directory next to your component
2. Generates a bootstrap `main.tsx` that renders your component
3. Generates an `index.html` that loads the bootstrap
4. Bundles everything using Vite + vite-plugin-singlefile
5. Cleans up temporary files

### For HTML Files

1. Uses Vite to bundle the HTML and all referenced assets
2. Applies vite-plugin-singlefile to inline all JavaScript and CSS
3. Outputs a single self-contained HTML file

## Testing

The package includes comprehensive tests using Jest and Playwright:

```bash
npm test
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Clean
npm run clean

# Lint
npm run lint
```

## License

MIT
