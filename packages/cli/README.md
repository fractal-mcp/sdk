# @fractal-mcp/cli

CLI tools for Fractal MCP development.

## Installation

### Global Installation

```bash
npm install -g @fractal-mcp/cli
```

### Use with npx (No Installation)

```bash
# For a bootstrapped application with index.html
npx @fractal-mcp/cli bundle --entrypoint=path/to/index.html --out=path/to/outdir

# For a standalone react component
npx @fractal-mcp/cli bundle --entrypoint=path/to/Component.tsx --out=path/to/outdir

# For a JS/TS entrypoint
npx @fractal-mcp/cli bundle --entrypoint=path/to/main.ts --out=path/to/outdir
```

## Commands

### `bundle`

Bundle a React component, JS/TS entrypoint, or HTML file into a self-contained output.

#### Usage

**For a React component (.tsx/.jsx):**
```bash
npx @fractal-mcp/cli bundle --entrypoint=./src/MyComponent.tsx --out=./dist
```

**For a JS/TS entrypoint (.ts/.js):**
```bash
npx @fractal-mcp/cli bundle --entrypoint=./src/main.ts --out=./dist
```

**For an HTML application:**
```bash
npx @fractal-mcp/cli bundle --entrypoint=./index.html --out=./dist
```

#### Options

**Required:**
- `--entrypoint <path>` - Path to entrypoint file (.html, .tsx, .jsx, .ts, .js)
- `--out <path>` - Output directory

**Output Configuration:**
- `--output-type <type>` - Output type: `html` or `assets` (default: `html`)
  - `html` - Single HTML file with inlined/linked assets
  - `assets` - Separate `main.js` and `index.css` files

**HTML Output Options** (only applicable when `--output-type=html`):
- `--inline-js` / `--no-inline-js` - Inline JavaScript in HTML (default: true)
- `--inline-css` / `--no-inline-css` - Inline CSS in HTML (default: true)
- `--root-only` - Generate root element snippet instead of full HTML document (default: false)

**JS/TS Entrypoint Options:**
- `--root-element <id>` - Root element ID for JS/TS entrypoints (default: `root`)

#### Examples

**Basic usage:**
```bash
# Bundle a React component into a single HTML file
npx @fractal-mcp/cli bundle \
  --entrypoint=src/components/Hello.tsx \
  --out=bundled

# Bundle an HTML app with dependencies
npx @fractal-mcp/cli bundle \
  --entrypoint=public/index.html \
  --out=dist
```

**Output types:**
```bash
# Create a single HTML file with everything inlined (default)
npx @fractal-mcp/cli bundle \
  --entrypoint=src/App.tsx \
  --out=dist \
  --output-type=html

# Create separate main.js and index.css files
npx @fractal-mcp/cli bundle \
  --entrypoint=src/App.tsx \
  --out=dist \
  --output-type=assets
```

**Inline control:**
```bash
# Link to external JS/CSS files instead of inlining
npx @fractal-mcp/cli bundle \
  --entrypoint=src/App.tsx \
  --out=dist \
  --no-inline-js \
  --no-inline-css

# Inline JS but link CSS
npx @fractal-mcp/cli bundle \
  --entrypoint=src/App.tsx \
  --out=dist \
  --inline-js \
  --no-inline-css
```

**Root element snippet:**
```bash
# Generate just the root element content (no <html>, <head>, etc.)
npx @fractal-mcp/cli bundle \
  --entrypoint=src/App.tsx \
  --out=dist \
  --root-only
```

**JS/TS entrypoint with custom root:**
```bash
# Bundle a JS/TS file with a custom root element ID
npx @fractal-mcp/cli bundle \
  --entrypoint=src/main.ts \
  --out=dist \
  --root-element=app-root
```

#### Output

**HTML Output (default):**
The command will create a self-contained HTML file at `<out>/index.html`:
- All JavaScript bundled (inlined by default, or as `<script src="main.js">`)
- All CSS bundled (inlined by default, or as `<link href="index.css">`)
- All dependencies included
- Full HTML document or root element snippet (with `--root-only`)

**Assets Output:**
The command will create separate files:
- `<out>/main.js` - Bundled JavaScript
- `<out>/index.css` - Bundled CSS

**HTML Input:**
HTML inputs always produce a single self-contained HTML file with everything inlined, regardless of output options.

## Features

- **Multiple Input Types**: Supports HTML, React components (.tsx/.jsx), and JS/TS entrypoints (.ts/.js)
- **Flexible Output**: Choose between single HTML file or separate assets (main.js, index.css)
- **Inline Control**: Decide whether to inline or link JavaScript and CSS
- **Root Element Snippets**: Generate just the root element content for embedding
- **Custom Root Elements**: Specify custom root element IDs for JS/TS entrypoints
- **Automatic Detection**: Detects framework (React, Vue, Svelte) automatically
- **Fast**: Powered by Vite
- **Zero Config**: Works out of the box with sensible defaults

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Clean
npm run clean
```

## Publishing

```bash
npm publish
```

## License

MIT
