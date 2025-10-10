# Bundler Architecture Plan

## Input Types & Output Formats

### Input Types
1. **HTML File** - Direct HTML with scripts (only supports `html` output)
2. **React Component** - Single `.tsx`/`.jsx` file (supports `html` and `assets` outputs)
3. **JS Entrypoint** - Framework-agnostic `.ts`/`.tsx`/`.js`/`.jsx` (supports `html` and `assets` outputs)

### Output Formats
1. **html** - HTML file (full document or snippet)
   - `inline.js` / `inline.css` - Whether to inline assets
   - `rootOnly` - If true, outputs snippet with just `<div>` + `<script>` + `<style>`
2. **assets** - Just `main.js` and `index.css` (NO HTML, no config)

## Type Signatures

```typescript
// Output configuration
type OutputConfig = 
  | { type: 'assets' }  // No other options
  | { 
      type: 'html';
      inline?: { js?: boolean; css?: boolean };
      rootOnly?: boolean;  // True = snippet, False = full document
    };

// HTML input - no output options, always single file
interface BundleHTMLOptions {
  entrypoint: string;  // Must be .html
  out: string;
}

// React component - doesn't need rootElement (creates its own)
interface BundleReactOptions {
  entrypoint: string;  // Must be .tsx or .jsx
  out: string;
  output?: OutputConfig;  // Default: { type: 'html', inline: { js: true, css: true }, rootOnly: false }
}

// JS entrypoint - needs rootElement for HTML generation
interface BundleJSOptions {
  entrypoint: string;  // .ts, .tsx, .js, or .jsx
  out: string;
  rootElement?: string;  // Default: 'root'
  output?: OutputConfig;  // Default: { type: 'html', inline: { js: true, css: true }, rootOnly: false }
}
```

## Core Functions

### Bundler Functions (Different signatures for each)

```typescript
// HTML: Only supports single file output
async function bundleHTMLInput(options: BundleHTMLOptions): Promise<void>

// React: Auto-creates root div, supports all formats
async function bundleReactComponent(options: BundleReactOptions): Promise<void>

// JS: Needs root element name, supports all formats  
async function bundleJSEntrypoint(options: BundleJSOptions): Promise<void>
```

### Core Build (Keep intact - "root" = filesystem root)

```typescript
// This is the current bundleWithRoot - DO NOT CHANGE
async function bundleWithRoot(args: BundleOptions & { root?: string }): Promise<void>
```

### Output Formatters

```typescript
// HTML output (full document or snippet)
async function formatAsHTML(
  buildDir: string, 
  outputPath: string,
  options: {
    inline?: { js?: boolean; css?: boolean };
    rootOnly?: boolean;
    rootElement?: string;  // Only used if rootOnly=true
  }
): Promise<void>

// ONLY main.js and index.css - NO HTML
async function formatAsAssets(buildDir: string, outputPath: string): Promise<void>
```

## Implementation Flow

### React Component → Assets
```
bundleReactComponent({ output: { type: 'assets' } })
  ↓
Create temp files: main.tsx (bootstrap) + index.html
  ↓
bundleWithRoot() → builds to temp dir
  ↓
formatAsAssets() → extracts main.js + index.css
  ↓
Done: Just JS and CSS files
```

### JS Entrypoint → Root Snippet
```
bundleJSEntrypoint({ 
  output: { type: 'html', rootOnly: true, inline: { js: true, css: true } },
  rootElement: 'app' 
})
  ↓
Create temp index.html with <div id="app">
  ↓
bundleWithRoot() → builds to temp dir
  ↓
formatAsHTML({ rootOnly: true, rootElement: 'app', inline: {...} })
  ↓
Done: HTML snippet with inlined assets
```

### HTML Input → Single File
```
bundleHTMLInput()
  ↓
bundleWithRoot() → builds with singlefile plugin
  ↓
Done: Single HTML file (no formatting needed)
```

## Key Differences

| Feature | HTML Input | React Component | JS Entrypoint |
|---------|-----------|-----------------|---------------|
| Output types | html only | html, assets | html, assets |
| Needs rootElement? | No | No | Yes (for rootOnly HTML) |
| Creates temp files? | No | Yes (main.tsx + html) | Yes (html only) |
| Framework-agnostic? | Yes | No (React only) | Yes |

## Defaults

- **html output**: `{ inline: { js: true, css: true }, rootOnly: false }`
- **assets output**: No configuration needed

