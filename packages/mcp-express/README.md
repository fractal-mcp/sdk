# @fractal-mcp/mcp-express

Express utilities for running MCP (Model Context Protocol) servers over HTTP.

## Installation

```bash
npm install @fractal-mcp/mcp-express
```

## Usage

```typescript
import express from "express";
import { makeExpressRoutes, defaultCorsMiddleware } from "@fractal-mcp/mcp-express";
import { McpServer } from "@fractal-mcp/mcp";

const app = express();

// Add CORS support (or use your own middleware)
app.use(defaultCorsMiddleware);

// Parse JSON bodies
app.use(express.json());

// Create your MCP server
const mcpServer = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0"
});

// Add your tools, resources, prompts, etc.
mcpServer.addTool({ /* ... */ });

// Connect the MCP server to Express
makeExpressRoutes(app, mcpServer);

app.listen(3000, () => {
  console.log("MCP server running on http://localhost:3000");
});
```

## API

### `makeExpressRoutes(app, mcpServer)`

Adds MCP endpoints to your Express app.

- `app`: Express application instance
- `mcpServer`: MCP server implementing `IMcpConnectable`

### `defaultCorsMiddleware`

Pre-configured CORS middleware that allows all origins and exposes MCP headers.

