# @fractal-mcp/express

Express server utilities for MCP (Model Context Protocol) server hosting.

## Overview

This package provides Express.js middleware and utilities specifically designed for hosting MCP servers over HTTP. It includes authentication, CORS handling, and session management for MCP connections.

## Installation

```bash
npm install @fractal-mcp/express
```

## Quick Start

```typescript
import { FractalMCPServer } from '@fractal-mcp/mcp';
import { startExpressServer } from '@fractal-mcp/express';

const mcpServer = new FractalMCPServer();
// Add your tools/resources to mcpServer...

startExpressServer(mcpServer, 3000);
```

## API Reference

### `startExpressServer(mcpServer, port?)`

Starts an Express server with MCP support, including default CORS and auth middleware.

**Parameters:**
- `mcpServer`: An instance implementing `IMcpConnectable`
- `port`: Optional port number (defaults to 3000)

### `makeExpressApp(app, mcpServer)`

Adds MCP endpoints to an existing Express app for more control over middleware and routing.

**Parameters:**
- `app`: Express application instance
- `mcpServer`: An instance implementing `IMcpConnectable`

### `defaultCorsMiddleware`

CORS middleware that allows all origins and standard HTTP methods.

### `defaultAuthMiddleware`

JWT authentication middleware that validates tokens from the Fractal auth service. Automatically allows localhost requests without authentication.

## Examples

### Custom Express Setup

```typescript
import express from 'express';
import { makeExpressApp, defaultCorsMiddleware } from '@fractal-mcp/express';
import { FractalMCPServer } from '@fractal-mcp/mcp';

const app = express();
app.use(express.json());
app.use(defaultCorsMiddleware);

const mcpServer = new FractalMCPServer();
makeExpressApp(app, mcpServer);

app.listen(3000);
```

### Custom Middleware

```typescript
import express from 'express';
import { makeExpressApp, defaultAuthMiddleware } from '@fractal-mcp/express';
import { FractalMCPServer } from '@fractal-mcp/mcp';

const app = express();
app.use(express.json());

// Custom CORS setup
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://yourdomain.com");
  next();
});

app.use(defaultAuthMiddleware);

const mcpServer = new FractalMCPServer();
makeExpressApp(app, mcpServer);

app.listen(3000);
```

## Dependencies

This package depends on:
- `@fractal-mcp/mcp` for the `IMcpConnectable` interface
- `@modelcontextprotocol/sdk` for MCP protocol support
- `express` for HTTP server functionality
- `jsonwebtoken` and `jwk-to-pem` for JWT authentication 