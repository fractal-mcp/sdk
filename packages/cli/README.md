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
```

## Commands

### `bundle`

Bundle a React component or HTML file into a self-contained HTML file.

#### Usage

**For a React component (.tsx/.jsx):**
```bash
npx @fractal-mcp/cli bundle --entrypoint=./src/MyComponent.tsx --out=./dist
```

**For an HTML application:**
```bash
npx @fractal-mcp/cli bundle --entrypoint=./index.html --out=./dist
```

#### Options

- `--entrypoint <path>` - Path to .tsx component or .html file (required)
- `--out <path>` - Output directory for bundled index.html (required)

#### Examples

```bash
# Bundle a React component
npx @fractal-mcp/cli bundle \
  --entrypoint=src/components/Hello.tsx \
  --out=bundled

# Bundle an HTML app with dependencies
npx @fractal-mcp/cli bundle \
  --entrypoint=public/index.html \
  --out=dist
```

#### Output

The command will create a single, self-contained HTML file at `<out>/index.html` that includes:
- All JavaScript bundled and inlined
- All CSS bundled and inlined
- All dependencies included
- No external files needed

## Features

- **Automatic Detection**: Detects framework (React, Vue, Svelte) automatically
- **Single File Output**: Everything bundled into one HTML file
- **Fast**: Powered by Vite
- **Zero Config**: Works out of the box

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
