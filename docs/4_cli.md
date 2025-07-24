# Fractal CLI Reference

The Fractal CLI (`fractal-mcp`) is a toolkit for developing, bundling, and previewing React components in the Fractal ecosystem.

## Installation

```bash
npm install -g @fractal-mcp/cli
```

Or use directly with npx:
```bash
npx fractal-mcp <command>
```

## Commands

### `fractal-mcp bundle`

Bundles a React component into optimized JavaScript and CSS files that can be served by Fractal providers.

**Purpose:** Pre-bundle your React UI components so they can be efficiently served by Fractal MCP servers. This is essential for providers who want to return rich UI components instead of plain text.

```bash
npx fractal-mcp bundle -e ./src/WeatherCard.tsx -d ./dist
```

**Options:**
- `-e, --entrypoint <path>` (required) - Path to the component entrypoint file (.tsx, .jsx, .js)
- `-d, --dst <path>` (required) - Output directory path

**Example:**
```bash
npx fractal-mcp bundle -e ./components/WeatherCard.tsx -d ./public/components
```

### `fractal-mcp generate`

Introspects your MCP server and generates TypeScript types so you don't have to any-type your code.

**Purpose:** Automatically generate TypeScript type definitions from your MCP server's tool schemas. This provides type safety and better developer experience when building Fractal components.

```bash
npx fractal-mcp generate -s http://localhost:3000
```

**Options:**
- `-s, --server-url <url>` (required) - URL of the MCP server to introspect
- `-o, --output-dir <dir>` (optional) - Output directory (defaults to ./fractal-generated)
- `-y, --yes` (optional) - Skip confirmation prompts

**Example:**
```bash
npx fractal-mcp generate -s http://localhost:3000 -o ./types
```

### `fractal-mcp preview`

Starts a development server for previewing your Fractal components in real-time.

**Purpose:** Provides a local development environment where you can see how your components will look and behave when rendered by Fractal consumers.

```bash
npx fractal-mcp preview
```

**Options:**
- `-p, --port <port>` (optional) - Port to run the server on (default: 3000)
- `--no-open` (optional) - Don't automatically open browser

**Example:**
```bash
npx fractal-mcp preview -p 8080 --no-open
```


## Workflow

A typical development workflow with the Fractal CLI:

1. **Develop** your React component locally
2. **Preview** it using `fractal-mcp preview` to see how it renders
3. **Bundle** it using `fractal-mcp bundle` to prepare for production. Make sure to reference the bundle path from your componentTool!
4. **Generate** types using `fractal-mcp generate` for type safety
5. **Deploy** to registry (coming soon)

## Examples

**Bundle a weather component:**
```bash
npx fractal-mcp bundle -e ./src/WeatherCard.tsx -d ./dist/weather
```

**Generate types from local server:**
```bash
npx fractal-mcp generate -s http://localhost:3000 -o ./src/types
```

**Start preview server:**
```bash
npx fractal-mcp preview -p 3001
```