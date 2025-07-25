# @fractal-mcp/bundle

A powerful bundling tool that uses Vite to create optimized single JavaScript and CSS files from your React/TypeScript/JavaScript entrypoints.

## Installation

```bash
npm install @fractal-mcp/bundle
```

## Quick Start

```typescript
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

## API Reference

### `bundle(options: BundleOptions)`

Bundles a React/TypeScript/JavaScript component into optimized single files using Vite.

**Parameters:**
- `options: BundleOptions` - Configuration object for bundling

**BundleOptions Interface:**
```typescript
interface BundleOptions {
  entrypoint: string;      // Path to the component file to bundle
  dst: string;             // Output directory for bundled files
  componentName?: string;  // Optional custom name for the component
}
```

**Returns:** `Promise<{ jsPath: string; cssPath?: string }>`
- `jsPath: string` - Absolute path to the generated JavaScript file
- `cssPath?: string` - Absolute path to the generated CSS file (if CSS exists)

**Features:**
- Supports `.tsx`, `.jsx`, `.js`, `.ts` files
- Automatically configures Tailwind CSS with PostCSS
- Externalizes React and React DOM dependencies
- Tree-shakes and minifies output
- Generates ES modules compatible with modern browsers

**Example:**
```typescript
const result = await bundle({
  entrypoint: './src/MyComponent.tsx',
  dst: './dist',
  componentName: 'MyAwesomeComponent'
});

console.log('JS file:', result.jsPath);   // './dist/Component.jsx'
console.log('CSS file:', result.cssPath); // './dist/index.css'
```

**Throws:**
- `Error` - If entrypoint file doesn't exist
- `Error` - If build process fails

---

### `generateHtml(options: GenerateHtmlOptions)`

Generates a complete HTML document that can render the bundled component in a browser.

**Parameters:**
- `options: GenerateHtmlOptions` - Configuration object for HTML generation

**GenerateHtmlOptions Interface:**
```typescript
interface GenerateHtmlOptions {
  jsPath: string;    // Path to the bundled JavaScript file
  cssPath?: string;  // Optional path to the bundled CSS file
  title?: string;    // Optional HTML document title
  data?: unknown;    // Optional data to inject as window.__FRACTAL_DATA__
}
```

**Returns:** `string` - Complete HTML document as a string

**Features:**
- Embeds JavaScript as base64 data URL for self-contained HTML
- Includes CSS styles inline
- Sets up React import maps for ESM compatibility
- Injects data as `window.__FRACTAL_DATA__` for component access
- Creates a root div and renders the component automatically

**Example:**
```typescript
const html = generateHtml({
  jsPath: './dist/Component.jsx',
  cssPath: './dist/index.css',
  title: 'My Component Preview',
  data: { 
    user: { name: 'John', age: 30 },
    theme: 'dark'
  }
});

// The generated HTML is self-contained and can be saved or served
fs.writeFileSync('preview.html', html);
```

**Data Access in Component:**
```typescript
// Your component can access the injected data
function MyComponent() {
  const data = (window as any).__FRACTAL_DATA__;
  return <div>Hello {data?.user?.name}!</div>;
}
```

---

### `getSourceHtml(html: string, css: string, title?: string)`

Creates a basic HTML document wrapper around HTML content and CSS.

**Parameters:**
- `html: string` - HTML content to wrap
- `css: string` - CSS styles to include
- `title?: string` - Optional document title (default: 'Component Preview')

**Returns:** `string` - Complete HTML document

**Example:**
```typescript
const html = getSourceHtml(
  '<div class="bg-blue-500 text-white p-4">Hello World</div>',
  '.bg-blue-500 { background-color: #3b82f6; }',
  'My Custom Preview'
);
```

**Use Case:**
This is a lower-level utility used internally by `generateHtml()`. You might use it directly when you have pre-rendered HTML content and CSS that you want to wrap in a complete document.

---

## Output Files

When you run `bundle()`, it creates:

- **`Component.jsx`** - The bundled JavaScript file containing your component
- **`index.css`** - The bundled CSS file (only if your component uses CSS/Tailwind)

## Build Configuration

The bundler automatically configures:

- **Vite** for fast building and tree-shaking
- **Tailwind CSS** with PostCSS processing
- **React plugin** for JSX transformation
- **External dependencies** (React/React DOM are not bundled)
- **ES2019 target** for broad browser compatibility

## Error Handling

All functions properly handle and throw errors for:
- Missing entrypoint files
- Build failures
- File system errors
- Invalid configurations

Always wrap calls in try-catch blocks for production use:

```typescript
try {
  const result = await bundle({ entrypoint: './Component.tsx', dst: './dist' });
  const html = generateHtml(result);
} catch (error) {
  console.error('Bundle failed:', error.message);
}
```