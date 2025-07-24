# @fractal-mcp/mcp

Express server utilities for hosting MCP (Model Context Protocol) servers over HTTP.

## Installation

```bash
npm install @fractal-mcp/mcp
```

## Usage

### Basic Usage

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startExpressServer } from "@fractal-mcp/mcp";

// Create your MCP server
const mcpServer = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0"
});

// Add your tools and resources here
mcpServer.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "example-tool",
        description: "An example tool",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      }
    ]
  };
});

// Start the Express server
startExpressServer(mcpServer, 3000);
```

### Alternative Import Styles

```typescript
// Named import (recommended)
import { startExpressServer } from "@fractal-mcp/mcp";

// Default import 
import startExpressServer from "@fractal-mcp/mcp";

// Both are available for maximum compatibility
```

### Usage in Provider Apps

Perfect for provider apps that need to host MCP servers:

```typescript
// In your provider app (e.g., apps/provider-weather)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startExpressServer } from "@fractal-mcp/mcp";

const weatherServer = new McpServer({
  name: "weather-provider",
  version: "1.0.0"
});

// Add weather-specific tools
weatherServer.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "get-weather") {
    // Your weather logic here
    return { result: "Sunny, 75°F" };
  }
});

// Start serving on port 3001
startExpressServer(weatherServer, 3001);
console.log("Weather MCP server running on http://localhost:3001/mcp");
```

## Features

- **Session Management**: Automatic session handling for MCP clients
- **HTTP Transport**: Uses StreamableHTTPServerTransport for reliable communication
- **Error Handling**: Built-in error responses for invalid requests
- **TypeScript Support**: Full TypeScript types included

## API

### startExpressServer(mcpServer, port?)

Starts an Express server to host the provided MCP server.

- `mcpServer`: A McpServer instance from @modelcontextprotocol/sdk
- `port` (optional): Port number to listen on (defaults to 3000)

The server will be available at `http://localhost:{port}/mcp` 