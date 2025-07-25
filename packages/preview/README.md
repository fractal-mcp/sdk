# @fractal-mcp/preview

A React development server for testing and previewing Fractal MCP tools with a beautiful web interface. Built on Vite with hot module replacement and real-time tool testing capabilities.

## Installation

```bash
npm install @fractal-mcp/preview
```

## Overview

The `@fractal-mcp/preview` package provides a complete development environment for testing MCP tools with visual components. It includes:

- **Vite Development Server** - Fast development server with HMR
- **React Testing Interface** - Beautiful UI for testing MCP tools
- **Real-time Tool Execution** - Test tools with live results
- **Component Rendering** - Preview Fractal components in frames
- **Tool Introspection** - Automatic discovery of available tools
- **Session Management** - Persistent testing sessions with URL state

## Quick Start

### Programmatic Usage

```typescript
import { startServer } from '@fractal-mcp/preview';

// Start the preview server
const server = await startServer(3000);
console.log('Preview server running at http://localhost:3000');

// Server includes graceful shutdown handling
process.on('SIGINT', () => {
  server.close().then(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
```

### CLI Usage

```bash
# Start preview server directly
node node_modules/@fractal-mcp/preview/lib/server.js

# Or use the Fractal CLI
npx @fractal-mcp/cli preview
```

## API Reference

### `startServer(port?)`

Start the Vite development server programmatically for MCP tool testing.

**Parameters:**
- `port?: number` - Port to run the server on (default: 3000)

**Returns:** `Promise<ViteDevServer>` - Vite development server instance

**Features:**
- Automatic port detection if specified port is in use
- Hot module replacement for instant updates
- Network access for testing on multiple devices
- Automatic URL printing for easy access
- Built-in error handling and recovery

**Example:**
```typescript
import { startServer } from '@fractal-mcp/preview';

async function startPreview() {
  try {
    const server = await startServer(4000);
    
    console.log('✅ Preview server started successfully!');
    console.log(`🌐 Local: http://localhost:${server.config.server.port}`);
    
    // Handle shutdown
    const shutdown = async () => {
      console.log('Shutting down preview server...');
      await server.close();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error('Failed to start preview server:', error);
    process.exit(1);
  }
}

startPreview();
```

**Server Configuration:**
The server uses an existing `vite.config.ts` file and includes:
- React plugin for JSX support
- Hot module replacement
- Network host access (`host: true`)
- Automatic port assignment

---

### Default Export

The package also provides a default export for backward compatibility:

```typescript
import previewServer from '@fractal-mcp/preview';

const server = await previewServer.startServer(3000);
```

---

## Web Interface Features

### Tool Testing Interface

The preview server provides a comprehensive web interface for testing MCP tools:

**Main Features:**
- **Server URL Input** - Connect to any MCP server
- **Tool Discovery** - Automatic tool introspection and selection
- **Arguments Editor** - JSON editor for tool parameters
- **Real-time Execution** - Execute tools and see results instantly
- **Component Rendering** - Preview Fractal components with data
- **Error Handling** - Clear error messages and debugging info

### Frame Modes

**Replace Mode:**
- Shows single tool result
- Replaces previous results
- Good for testing individual tools

**Append Mode:**
- Accumulates multiple results
- Useful for testing tool sequences
- Automatic scrolling to latest result

### URL State Management

The interface automatically saves and restores state via URL parameters:

```
http://localhost:3000?serverUrl=<base64>&tool=<base64>&args=<base64>
```

This enables:
- Shareable test configurations
- Browser back/forward navigation
- Session persistence across reloads

---

## Usage Examples

### Basic Tool Testing

```typescript
// Start the server
import { startServer } from '@fractal-mcp/preview';

const server = await startServer(3000);

// Navigate to http://localhost:3000
// 1. Enter your MCP server URL: http://localhost:3001/mcp
// 2. Select a tool from the dropdown
// 3. Enter JSON arguments: {"location": "San Francisco"}
// 4. Click "Save & Call" to test
```

### Testing Component Tools

```typescript
// Your MCP server with component tools
import { FractalMCPServer, startExpressServer } from '@fractal-mcp/mcp';

const mcpServer = new FractalMCPServer({ name: 'test-server', version: '1.0.0' });

mcpServer.componentTool({
  name: 'weather-widget',
  description: 'Display weather information',
  inputSchema: {
    location: { type: 'string' }
  },
  componentPath: './components/WeatherWidget.tsx',
  handler: async ({ location }) => {
    return { location, temperature: 72, conditions: 'Sunny' };
  }
});

startExpressServer(mcpServer, 3001);

// Start preview server
const previewServer = await startServer(3000);

// Test the component tool:
// 1. Server URL: http://localhost:3001/mcp
// 2. Tool: weather-widget
// 3. Args: {"location": "New York"}
// 4. See the rendered component with weather data
```

### Integration with Development Workflow

```typescript
// development-server.ts
import { startServer as startPreview } from '@fractal-mcp/preview';
import { FractalMCPServer, startExpressServer } from '@fractal-mcp/mcp';
import chokidar from 'chokidar';

async function startDevelopment() {
  // Start MCP server
  const mcpServer = new FractalMCPServer({ name: 'dev-server', version: '1.0.0' });
  
  // Add your tools...
  mcpServer.componentTool({
    name: 'dev-component',
    description: 'Development component',
    inputSchema: { message: { type: 'string' } },
    componentPath: './src/components/DevComponent.tsx',
    handler: async ({ message }) => ({ message })
  });
  
  startExpressServer(mcpServer, 3001);
  
  // Start preview server
  const previewServer = await startPreview(3000);
  
  // Watch for component changes
  chokidar.watch('./src/components/**/*.tsx').on('change', () => {
    console.log('🔄 Component changed - refresh preview to see updates');
  });
  
  console.log('🚀 Development environment ready!');
  console.log('📱 Preview: http://localhost:3000');
  console.log('🔧 MCP Server: http://localhost:3001/mcp');
}

startDevelopment();
```

---

## API Endpoints

The preview server includes several API endpoints for tool interaction:

### `/api/proxy`

Proxy endpoint for calling MCP tools without CORS issues.

**Method:** `POST`

**Request Body:**
```typescript
{
  serverUrl: string;    // MCP server URL
  toolName: string;     // Tool to execute
  arguments: object;    // Tool arguments
}
```

**Response:**
```typescript
{
  result: {
    content: any[];           // MCP response content
    component?: {             // Component data (if applicable)
      html: string;
    };
    data?: any;              // Tool-specific data
  };
  error?: string;            // Error message if failed
}
```

### `/api/list-tools`

Endpoint for discovering available tools on an MCP server.

**Method:** `POST`

**Request Body:**
```typescript
{
  serverUrl: string;    // MCP server URL to introspect
}
```

**Response:**
```typescript
{
  tools: Array<{
    name: string;
    description?: string;
    inputSchema: object;
  }>;
}
```

---

## Development Features

### Hot Module Replacement

The preview server supports HMR for rapid development:

```typescript
// Changes to React components update instantly
// No need to restart the server
// State is preserved where possible
```

### Network Access

The server is configured with `host: true` for network access:

```bash
# Access from other devices on your network
http://192.168.1.100:3000

# Useful for testing on mobile devices
# Or sharing with team members
```

### Error Handling

Comprehensive error handling for common issues:

```typescript
// Connection errors to MCP servers
// Invalid JSON in arguments
// Tool execution failures
// Component rendering errors
// Network timeouts
```

---

## Configuration

### Vite Configuration

The server uses a `vite.config.ts` file in the package root:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
  },
  // Additional Vite configuration...
});
```

### Environment Variables

```bash
# Override default port
PORT=4000

# Custom configuration
NODE_ENV=development
```

---

## Integration Examples

### With Fractal CLI

```bash
# Start preview server via CLI
npx @fractal-mcp/cli preview --port 3000

# Start without opening browser
npx @fractal-mcp/cli preview --no-open
```

### With Express Server

```typescript
import express from 'express';
import { startServer } from '@fractal-mcp/preview';

const app = express();

// Add custom routes
app.get('/api/status', (req, res) => {
  res.json({ status: 'running' });
});

// Start preview server on different port
const previewServer = await startServer(3001);

// Your custom server
app.listen(3000, () => {
  console.log('Custom server: http://localhost:3000');
  console.log('Preview server: http://localhost:3001');
});
```

### With Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "lib/server.js"]
```

```bash
# Build and run
docker build -t fractal-preview .
docker run -p 3000:3000 fractal-preview
```

---

## Troubleshooting

### Common Issues

**Port Already in Use:**
```typescript
// The server will automatically try the next available port
// Check the console output for the actual port being used
```

**MCP Server Connection Failed:**
```typescript
// Ensure your MCP server is running
// Check the server URL format: http://localhost:3001/mcp
// Verify CORS settings on your MCP server
```

**Component Rendering Issues:**
```typescript
// Ensure components export a default React component
// Check that component paths are correct
// Verify component dependencies are installed
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=fractal:* npm start

# Or with environment variable
NODE_ENV=development npm start
```

### Network Issues

```bash
# Test MCP server connectivity
curl http://localhost:3001/health

# Test preview server
curl http://localhost:3000/api/list-tools \
  -H "Content-Type: application/json" \
  -d '{"serverUrl": "http://localhost:3001/mcp"}'
```

---

## Performance

### Optimization Features

- **Vite's Fast Refresh** - Sub-second updates
- **ES Module Loading** - Efficient module resolution
- **Code Splitting** - Optimized bundle sizes
- **Memory Management** - Automatic cleanup of resources

### Resource Usage

```typescript
// Typical resource usage:
// - Memory: 50-100MB
// - CPU: Low (idle), Medium (during builds)
// - Network: Minimal (proxy requests only)
```

---

## Dependencies

- `@fractal-mcp/render` - Component rendering utilities
- `@modelcontextprotocol/sdk` - MCP protocol support
- `express` - HTTP server framework
- `react` & `react-dom` - React framework
- `vite` - Build tool and development server

## Requirements

- Node.js 18+
- Modern browser with ES2020 support
- Network access to MCP servers being tested

## Best Practices

1. **Use with CLI** for the best development experience
2. **Test components locally** before deploying
3. **Use network access** for team collaboration
4. **Save configurations** using URL parameters
5. **Monitor console** for debugging information
6. **Use replace mode** for single tool testing
7. **Use append mode** for workflow testing
