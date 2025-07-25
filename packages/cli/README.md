# @fractal-mcp/cli

A powerful command-line toolkit for developing, bundling, and previewing Fractal components. The CLI provides essential commands for the complete Fractal development workflow.

## Installation

### Global Installation (Recommended)
```bash
npm install -g @fractal-mcp/cli
```

### Local Installation
```bash
npm install @fractal-mcp/cli
```

## Usage

After installation, use the `fractal-mcp` command:

```bash
fractal-mcp --help
```

## Commands

### `bundle`

Bundle a React/TypeScript component into optimized JavaScript and CSS files.

```bash
fractal-mcp bundle [options]
```

**Required Options:**
- `-e, --entrypoint <path>` - Path to the component entrypoint file (`.tsx`, `.jsx`, `.js`)
- `-d, --dst <path>` - Output directory path

**Optional Options:**
- `-n, --name <name>` - Custom component name (defaults to filename)

**Examples:**
```bash
# Basic bundling
fractal-mcp bundle -e ./src/MyComponent.tsx -d ./dist

# With custom name
fractal-mcp bundle -e ./components/Button.tsx -d ./output -n CustomButton

# Bundle JavaScript file
fractal-mcp bundle -e ./src/Widget.js -d ./build
```

**Output:**
- `Component.jsx` - Bundled JavaScript file
- `index.css` - Bundled CSS file (if styles exist)

**Features:**
- Automatic Tailwind CSS processing
- Tree-shaking and minification
- ES module output
- React/React DOM externalization

---

### `generate`

Generate TypeScript types from MCP server tool schemas for type-safe development.

```bash
fractal-mcp generate [options]
```

**Required Options:**
- `-s, --server-url <url>` - URL of the MCP server to introspect

**Optional Options:**
- `-o, --output-dir <dir>` - Output directory (default: `./fractal-generated`)
- `-y, --yes` - Skip confirmation prompts

**Examples:**
```bash
# Generate types from local server
fractal-mcp generate -s http://localhost:3001

# Generate to custom directory
fractal-mcp generate -s https://api.example.com -o ./types

# Skip confirmation prompts
fractal-mcp generate -s http://localhost:3001 -y
```

**Output:**
- `./fractal-generated/fractal-generated/index.ts` - Generated TypeScript types

**Process:**
1. Introspects the MCP server to discover available tools
2. Generates TypeScript interfaces for each tool's input/output schemas
3. Creates type-safe wrappers for tool execution
4. Outputs comprehensive type definitions

**Example Generated Types:**
```typescript
// Generated in fractal-generated/index.ts
export interface WeatherToolInput {
  location: string;
  days?: number;
}

export interface WeatherToolOutput {
  temperature: number;
  conditions: string;
  forecast: Array<{
    date: string;
    high: number;
    low: number;
  }>;
}

export const weatherTool = {
  name: 'weather',
  inputSchema: { /* ... */ },
  execute: (input: WeatherToolInput): Promise<WeatherToolOutput> => { /* ... */ }
};
```

---

### `preview`

Start the Fractal preview development server for interactive component development.

```bash
fractal-mcp preview [options]
```

**Optional Options:**
- `-p, --port <port>` - Port to run the server on (default: `3000`)
- `--no-open` - Don't automatically open browser

**Examples:**
```bash
# Start preview server on default port
fractal-mcp preview

# Start on custom port
fractal-mcp preview -p 8080

# Start without opening browser
fractal-mcp preview --no-open

# Custom port without browser
fractal-mcp preview -p 4000 --no-open
```

**Features:**
- Hot module replacement for instant updates
- Interactive component playground
- Real-time preview of changes
- Automatic browser opening
- Network access for testing on devices

**Server Information:**
```
✅ Fractal preview server started successfully!
🚀 Server running at:
   Local:   http://localhost:3000/
   Network: http://192.168.1.100:3000/

Press Ctrl+C to stop the server
```

**Graceful Shutdown:**
- Press `Ctrl+C` to stop the server
- Automatic cleanup of resources
- Safe termination of all processes

---

### `deploy`

Deploy components to production environments.

```bash
fractal-mcp deploy
```

**Status:** Coming soon!

This command will provide deployment capabilities for Fractal components to various hosting platforms.

---

## Global Options

All commands support these global options:

- `--help` - Show help information
- `--version` - Show CLI version

```bash
# Show general help
fractal-mcp --help

# Show command-specific help
fractal-mcp bundle --help
fractal-mcp generate --help
fractal-mcp preview --help

# Show version
fractal-mcp --version
```

## Common Workflows

### Complete Development Workflow

```bash
# 1. Start preview server for development
fractal-mcp preview

# 2. Generate types from your MCP server (in another terminal)
fractal-mcp generate -s http://localhost:3001

# 3. Bundle your component when ready
fractal-mcp bundle -e ./src/MyComponent.tsx -d ./dist

# 4. Deploy (coming soon)
fractal-mcp deploy
```

### Component Development

```bash
# Start development server
fractal-mcp preview -p 3000

# In another terminal, watch for changes and bundle
# (You can set up a file watcher to auto-bundle on changes)
fractal-mcp bundle -e ./src/Component.tsx -d ./dist
```

### Type Generation for Multiple Servers

```bash
# Generate types from different environments
fractal-mcp generate -s http://localhost:3001 -o ./types/local
fractal-mcp generate -s https://staging-api.com -o ./types/staging
fractal-mcp generate -s https://prod-api.com -o ./types/production
```

## Error Handling

The CLI provides clear error messages and proper exit codes:

```bash
# Example error outputs
❌ Bundle failed
Error: Entrypoint file not found: ./src/NonExistent.tsx

❌ Failed to start preview server  
Error: Port 3000 is already in use

❌ Type generation failed
Error: Could not connect to MCP server at http://localhost:3001
```

**Exit Codes:**
- `0` - Success
- `1` - Error occurred

## Integration with Package Scripts

Add CLI commands to your `package.json`:

```json
{
  "scripts": {
    "fractal:bundle": "fractal-mcp bundle -e ./src/index.tsx -d ./dist",
    "fractal:preview": "fractal-mcp preview",
    "fractal:generate": "fractal-mcp generate -s http://localhost:3001",
    "fractal:dev": "concurrently \"npm run fractal:preview\" \"npm run fractal:generate\""
  }
}
```

## Dependencies

The CLI integrates with these Fractal packages:
- `@fractal-mcp/bundle` - Component bundling functionality
- `@fractal-mcp/render` - Component rendering utilities
- `@fractal-mcp/generate` - Type generation from MCP schemas
- `@fractal-mcp/preview` - Development server functionality

## Requirements

- Node.js 18+ 
- npm or yarn
- Modern browser for preview functionality

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Try a different port
fractal-mcp preview -p 3001
```

**Bundle fails:**
```bash
# Check that entrypoint file exists
ls -la ./src/Component.tsx

# Verify output directory permissions
mkdir -p ./dist
```

**Type generation fails:**
```bash
# Verify MCP server is running
curl http://localhost:3001/health

# Check server URL format
fractal-mcp generate -s http://localhost:3001
```

### Debug Mode

For verbose output, set the `DEBUG` environment variable:

```bash
DEBUG=fractal:* fractal-mcp bundle -e ./src/Component.tsx -d ./dist
```
