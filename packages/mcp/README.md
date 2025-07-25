# @fractal-mcp/mcp

Express server utilities and MCP server implementation for hosting Fractal MCP (Model Context Protocol) servers over HTTP with authentication, component tools, and session management.

## Installation

```bash
npm install @fractal-mcp/mcp
```

## Overview

The `@fractal-mcp/mcp` package provides a complete solution for hosting MCP servers with Fractal-specific enhancements. It includes:

- **FractalMCPServer** - Enhanced MCP server with component tool support
- **Express Integration** - HTTP transport with authentication and session management
- **Component Tools** - Tools that return React components alongside data
- **JWT Authentication** - Secure authentication using Fractal's auth service
- **Session Management** - Automatic session handling for MCP clients

## Quick Start

### Basic MCP Server

```typescript
import { FractalMCPServer, startExpressServer } from '@fractal-mcp/mcp';

// Create a Fractal MCP server
const server = new FractalMCPServer({
  name: 'my-fractal-server',
  version: '1.0.0'
});

// Add a simple tool
server.tool({
  name: 'greet',
  description: 'Greet a user',
        inputSchema: {
    name: { type: 'string' }
  },
  handler: async ({ name }) => {
    return `Hello, ${name}!`;
  }
});

// Start the server
startExpressServer(server, 3000);
console.log('Server running at http://localhost:3000/mcp');
```

### Component Tool Example

```typescript
import { FractalMCPServer, startExpressServer } from '@fractal-mcp/mcp';

const server = new FractalMCPServer({
  name: 'component-server',
  version: '1.0.0'
});

// Add a component tool
server.componentTool({
  name: 'weather-widget',
  description: 'Display weather information',
  inputSchema: {
    location: { type: 'string' },
    units: { type: 'string', enum: ['celsius', 'fahrenheit'] }
  },
  componentPath: './components/WeatherWidget.tsx',
  handler: async ({ location, units }) => {
    // Fetch weather data
    const weatherData = await fetchWeather(location, units);
    return weatherData;
  }
});

startExpressServer(server, 3000);
```

## API Reference

### `FractalMCPServer`

Enhanced MCP server with support for regular tools and component tools.

#### Constructor

```typescript
new FractalMCPServer(options: { name: string; version: string })
```

**Parameters:**
- `options.name: string` - Server name identifier
- `options.version: string` - Server version

**Example:**
```typescript
const server = new FractalMCPServer({
  name: 'my-server',
  version: '2.1.0'
});
```

#### `tool(toolDefinition)`

Register a standard MCP tool.

**Parameters:**
```typescript
interface FractalTool {
  name: string;                    // Tool identifier
  description: string | undefined; // Human-readable description
  inputSchema: z.ZodRawShape;     // Zod schema for input validation
  outputSchema?: z.ZodRawShape;   // Optional output schema
  handler: (args: any, extra: RequestHandlerExtra) => any; // Tool implementation
}
```

**Example:**
```typescript
server.tool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  inputSchema: {
    operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
    a: { type: 'number' },
    b: { type: 'number' }
  },
  outputSchema: {
    result: { type: 'number' },
    operation: { type: 'string' }
  },
  handler: async ({ operation, a, b }) => {
    let result: number;
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': result = a / b; break;
      default: throw new Error('Invalid operation');
    }
    return { result, operation };
  }
});
```

#### `componentTool(toolDefinition)`

Register a component tool that returns both data and a React component.

**Parameters:**
```typescript
type FractalComponentTool<TInput, TData> = 
  | FractalStaticComponentTool<TInput, TData>
  | FractalDynamicComponentTool<TInput, TData>;
```

**Static Component Tool:**
```typescript
interface FractalStaticComponentTool<TInput, TData> {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  outputSchema?: z.ZodRawShape;
  price?: number;                 // Optional pricing information
  
  // Component specification (choose one):
  componentPath: string;          // Path to unbundled React component
  componentBundlePath: string;    // Path to bundled component directory
  componentBundleHtmlPath: string; // Path to complete HTML file
  
  handler: (args: TInput, extra: RequestHandlerExtra) => Promise<TData>;
}
```

**Dynamic Component Tool:**
```typescript
interface FractalDynamicComponentTool<TInput, TData> {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  outputSchema?: z.ZodRawShape;
  price?: number;
  
  componentHandler: (args: TInput, extra: RequestHandlerExtra) => Promise<WithComponentBundle<TData>>;
}
```

**Static Component Tool Example:**
```typescript
server.componentTool({
  name: 'user-profile',
  description: 'Display user profile information',
  inputSchema: {
    userId: { type: 'string' }
  },
  componentPath: './components/UserProfile.tsx',
  price: 0.01, // Optional pricing
  handler: async ({ userId }) => {
    const user = await getUserById(userId);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar
    };
  }
});
```

**Dynamic Component Tool Example:**
```typescript
server.componentTool({
  name: 'dynamic-chart',
  description: 'Generate charts based on data type',
  inputSchema: {
    dataType: { type: 'string', enum: ['bar', 'line', 'pie'] },
    data: { type: 'array' }
  },
  componentHandler: async ({ dataType, data }) => {
    // Generate different components based on data type
    let componentPath: string;
    switch (dataType) {
      case 'bar': componentPath = './components/BarChart.tsx'; break;
      case 'line': componentPath = './components/LineChart.tsx'; break;
      case 'pie': componentPath = './components/PieChart.tsx'; break;
    }
    
    // Bundle the component dynamically
    const bundle = await getComponentBundle({ componentPath });
    
    return {
      data: { chartData: data, type: dataType },
      component: bundle
    };
  }
});
```

#### `connect(transport)`

Connect the server to a transport layer.

**Parameters:**
- `transport: Transport` - MCP transport instance

**Returns:** `Promise<void>`

#### `introspect()`

Get detailed information about all registered tools.

**Returns:** `Promise<IntrospectionResult>`

```typescript
interface IntrospectionResult {
  tools: Array<{
    name: string;
    description: string | undefined;
    inputSchema: any;
    outputSchema: any;
  }>;
  componentTools: Array<{
    name: string;
    description: string;
    inputSchema: any;
    outputSchema: any;
  }>;
}
```

**Example:**
```typescript
const info = await server.introspect();
console.log(`Server has ${info.tools.length} regular tools`);
console.log(`Server has ${info.componentTools.length} component tools`);
```

---

### Express Server Functions

#### `startExpressServer(mcpServer, port?)`

Start a complete Express server with authentication, CORS, and MCP handling.

**Parameters:**
- `mcpServer: IMcpConnectable` - MCP server instance
- `port?: number` - Port to listen on (default: 3000)

**Returns:** `void`

**Features:**
- JWT authentication via Authorization header
- CORS middleware for cross-origin requests
- Session management with `mcp-session-id` header
- Health check endpoint at `/health`
- Hello endpoint at `/hello` for testing authentication

**Example:**
```typescript
import { FractalMCPServer, startExpressServer } from '@fractal-mcp/mcp';

const server = new FractalMCPServer({ name: 'my-server', version: '1.0.0' });

// Add tools...

startExpressServer(server, 3000);
// Server available at:
// - http://localhost:3000/mcp (MCP endpoint)
// - http://localhost:3000/health (health check)
// - http://localhost:3000/hello (auth test)
```

#### `makeExpressApp(app, mcpServer)`

Create MCP routes on an existing Express app (for custom setups).

**Parameters:**
- `app: express.Express` - Existing Express application
- `mcpServer: IMcpConnectable` - MCP server instance

**Returns:** `express.Express` - The same app with MCP routes added

**Example:**
```typescript
import express from 'express';
import { makeExpressApp, FractalMCPServer } from '@fractal-mcp/mcp';

const app = express();
const server = new FractalMCPServer({ name: 'custom', version: '1.0.0' });

// Add custom middleware
app.use('/api', myApiRoutes);

// Add MCP functionality
makeExpressApp(app, server);

app.listen(3000);
```

#### `defaultCorsMiddleware`

Default CORS middleware for cross-origin requests.

**Type:** `(req: Request, res: Response, next: NextFunction) => void`

**Example:**
```typescript
import express from 'express';
import { defaultCorsMiddleware } from '@fractal-mcp/mcp';

const app = express();
app.use(defaultCorsMiddleware);
```

---

### Component Tool Utilities

#### `registerComponentTool(server, componentTool)`

Register a component tool with an MCP server (used internally by FractalMCPServer).

**Parameters:**
- `server: McpServer` - Standard MCP server instance
- `componentTool: FractalComponentTool<any, any>` - Component tool definition

**Example:**
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerComponentTool } from '@fractal-mcp/mcp';

const server = new McpServer({ name: 'test', version: '1.0.0' });

registerComponentTool(server, {
  name: 'my-component',
  description: 'Test component',
  inputSchema: { message: { type: 'string' } },
  componentPath: './TestComponent.tsx',
  handler: async ({ message }) => ({ message })
});
```

#### `getComponentBundle(componentTool)`

Extract component bundle information from a component tool.

**Parameters:**
- `componentTool: FractalComponentTool<any, any>` - Component tool definition

**Returns:** `Promise<FractalComponentToolBundle | undefined>`

```typescript
type FractalComponentToolBundle = 
  | { html: string }
  | { jsPath: string; cssPath?: string };
```

---

## Authentication

### JWT Authentication

The server automatically validates JWT tokens from the `Authorization` header:

```typescript
// Client request headers
{
  "Authorization": "Bearer <jwt-token>",
  "Content-Type": "application/json"
}
```

**Token Requirements:**
- Algorithm: RS256
- Issuer: "fractal-auth"
- Audience: "fractal"
- Valid signature from Fractal's JWKS endpoint

**Authentication Flow:**
1. Client sends request with JWT in Authorization header
2. Server fetches public key from `https://auth.fractalmcp.com/.well-known/jwks.json`
3. Server verifies token signature and claims
4. On success, request proceeds with `req.auth` containing decoded payload
5. On failure, returns 401 with error details

### Testing Authentication

```bash
# Test the hello endpoint
curl -H "Authorization: Bearer <your-jwt>" http://localhost:3000/hello

# Expected response:
{
  "message": "Hello, user!",
  "user": { /* decoded JWT payload */ }
}
```

---

## Session Management

### Session Headers

- `mcp-session-id` - Session identifier for maintaining client state
- Sessions are automatically created on first `initialize` request
- Subsequent requests with same session ID reuse the connection

### Session Flow

1. **Initialize:** Client sends initialize request without session ID
2. **Session Created:** Server creates new session and returns session ID
3. **Subsequent Requests:** Client includes session ID in all future requests
4. **Session Reuse:** Server routes requests to existing session transport

---

## Component Tool Development

### Component Structure

Components receive data through `window.__FRACTAL_DATA__`:

```tsx
// WeatherWidget.tsx
import React from 'react';

interface WeatherData {
  location: string;
  temperature: number;
  conditions: string;
}

export default function WeatherWidget() {
  const data = (window as any).__FRACTAL_DATA__ as WeatherData;
  
  return (
    <div className="weather-widget">
      <h2>Weather in {data.location}</h2>
      <p>{data.temperature}°F - {data.conditions}</p>
    </div>
  );
}
```

### Component Tool Types

**Static Components:**
- Component is known at registration time
- Data is generated by the handler
- Component path specified in tool definition

**Dynamic Components:**
- Component is determined at runtime
- Both data and component returned by handler
- More flexible but requires runtime bundling

### Bundling Options

**Development (componentPath):**
```typescript
{
  componentPath: './components/MyWidget.tsx'
  // Automatically bundles on each request
  // Good for development, not recommended for production
}
```

**Production (componentBundlePath):**
```typescript
{
  componentBundlePath: './dist/my-widget'
  // Expects pre-bundled Component.jsx and index.css
  // Recommended for production
}
```

**Custom HTML (componentBundleHtmlPath):**
```typescript
{
  componentBundleHtmlPath: './dist/widget.html'
  // Complete HTML file with embedded component
  // Maximum control over output
}
```

---

## Error Handling

### Tool Errors

```typescript
server.tool({
  name: 'risky-operation',
  description: 'An operation that might fail',
  inputSchema: { data: { type: 'string' } },
  handler: async ({ data }) => {
    try {
      return await performRiskyOperation(data);
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
});
```

### Component Tool Errors

```typescript
server.componentTool({
  name: 'error-prone-widget',
  description: 'Widget that handles errors gracefully',
  inputSchema: { userId: { type: 'string' } },
  componentPath: './components/UserWidget.tsx',
  handler: async ({ userId }) => {
    try {
      const user = await fetchUser(userId);
      return user;
    } catch (error) {
      // Component will receive error in data
      throw new Error(`Failed to load user: ${error.message}`);
    }
  }
});
```

### Authentication Errors

```json
// 401 Unauthorized responses
{
  "error": "missing_token"
}

{
  "error": "invalid_token",
  "details": "Token has expired"
}
```

---

## Production Deployment

### Environment Variables

```bash
# Optional: Override JWKS URL for custom auth
JWKS_URL=https://your-auth-service.com/.well-known/jwks.json

# Optional: Custom port
PORT=3000
```

### Pre-bundling Components

```bash
# Bundle components before deployment
npx @fractal-mcp/cli bundle -e ./components/Widget.tsx -d ./dist/widget

# Use bundled components in production
server.componentTool({
  name: 'my-widget',
  componentBundlePath: './dist/widget',
  // ... rest of configuration
});
```

### Health Monitoring

```bash
# Health check endpoint
curl http://localhost:3000/health
# Response: {"status": "ok"}

# Use for load balancer health checks
```

### Scaling Considerations

- Each session maintains its own transport
- Memory usage scales with concurrent sessions
- Consider session cleanup for long-running servers
- Use process managers (PM2, Docker) for production

---

## Integration Examples

### With Fractal Client

```typescript
// Server setup
import { FractalMCPServer, startExpressServer } from '@fractal-mcp/mcp';

const server = new FractalMCPServer({ name: 'api-server', version: '1.0.0' });

server.componentTool({
  name: 'data-table',
  description: 'Display data in a table',
  inputSchema: { query: { type: 'string' } },
  componentPath: './components/DataTable.tsx',
  handler: async ({ query }) => {
    const results = await database.query(query);
    return { results, query };
  }
});

startExpressServer(server, 3001);

// Client usage
import { FractalSDK } from '@fractal-mcp/client';

const client = new FractalSDK({ apiKey: 'your-key' });
await client.connect();

const result = await client.executeTool('data-table', {
  query: 'SELECT * FROM users LIMIT 10'
});

// result contains both data and rendered component
```

### Custom Express Setup

```typescript
import express from 'express';
import { makeExpressApp, FractalMCPServer, defaultCorsMiddleware } from '@fractal-mcp/mcp';

const app = express();
const server = new FractalMCPServer({ name: 'custom', version: '1.0.0' });

// Custom middleware
app.use(express.json({ limit: '10mb' }));
app.use(defaultCorsMiddleware);

// Custom routes
app.get('/status', (req, res) => {
  res.json({ status: 'running', timestamp: Date.now() });
});

// Add MCP functionality
makeExpressApp(app, server);

// Custom error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000);
```

## Dependencies

- `@fractal-mcp/bundle` - Component bundling utilities
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `express` - HTTP server framework
- `jsonwebtoken` - JWT token verification
- `jwk-to-pem` - JWK to PEM conversion for RSA keys

## Requirements

- Node.js 18+
- Valid Fractal JWT tokens for authentication
- React components for component tools