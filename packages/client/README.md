# @fractal-mcp/client

The main client SDK for connecting to Fractal's MCP (Model Context Protocol) proxy and accessing the tool registry. This package provides authentication, tool discovery, and execution capabilities for building Fractal-powered applications.

## Installation

```bash
npm install @fractal-mcp/client
```

## Quick Start

```typescript
import { FractalSDK } from '@fractal-mcp/client';

// Initialize the SDK
const client = new FractalSDK({
  apiKey: 'your-consumer-api-key'
});

// Connect to Fractal
await client.connect();

// List available tools
const tools = await client.listTools();

// Execute a tool
const result = await client.executeTool('weather-tool', {
  location: 'San Francisco'
});
```

## API Reference

### `FractalSDK`

The main client class for interacting with Fractal's MCP proxy.

#### Constructor

```typescript
new FractalSDK(options: FractalSDKInitOptions)
```

**FractalSDKInitOptions:**
```typescript
interface FractalSDKInitOptions {
  apiKey: string;      // JWT from Fractal registry
  baseUrl?: string;    // Optional: Fractal registry URL (default: https://mcp.fractalmcp.com)
  authUrl?: string;    // Optional: Auth service URL (default: https://auth.fractalmcp.com)
}
```

**Example:**
```typescript
const client = new FractalSDK({
  apiKey: 'your-api-key-from-registry.fractalmcp.com',
  baseUrl: 'https://mcp.fractalmcp.com',  // Optional
  authUrl: 'https://auth.fractalmcp.com'  // Optional
});
```

---

### Connection Methods

#### `connect(options?: ConnectOptions)`

Establishes connection to the Fractal MCP proxy with authentication.

**Parameters:**
- `options?: ConnectOptions` - Optional connection configuration

**ConnectOptions:**
```typescript
interface ConnectOptions {
  branches?: string[];                // Optional: Registry branches to access
  sessionId?: string;                 // Optional: Resume existing session
  capabilities?: ClientCapabilities;  // Optional: Advertise extra MCP capabilities
}
```

**Returns:** `Promise<void>`

**Example:**
```typescript
// Basic connection
await client.connect();

// Connection with options
await client.connect({
  branches: ['main', 'development'],
  sessionId: 'existing-session-id'
});
```

#### `sessionId`

**Type:** `string | undefined`

**Description:** Read-only property that returns the session ID assigned by the server after connection.

**Example:**
```typescript
await client.connect();
console.log('Session ID:', client.sessionId);
```

---

### Authentication Methods

#### `requestToken()`

Requests a new access token from the Fractal API using the provided API key.

**Returns:** `Promise<string>` - The access token

**Example:**
```typescript
const accessToken = await client.requestToken();
```

**Throws:**
- `Error` - If API key is not set or token request fails

#### `refresh()`

Refreshes the access token using the stored refresh token.

**Returns:** `Promise<string>` - The new access token

**Example:**
```typescript
const newToken = await client.refresh();
```

#### `getFractalAccessToken()`

Gets a valid access token, automatically refreshing or requesting a new one if needed.

**Returns:** `Promise<string>` - A valid access token

**Example:**
```typescript
const token = await client.getFractalAccessToken();
```

---

### Tool Management Methods

#### `listTools(params?, options?)`

Lists all available tools from the Fractal registry, including the built-in `renderLayout` tool.

**Parameters:**
- `params?: ListToolsRequest['params']` - Optional MCP list tools parameters
- `options?: RequestOptions` - Optional request options

**Returns:** `Promise<ListToolsResult>` - List of available tools

**Example:**
```typescript
const result = await client.listTools();
console.log('Available tools:', result.tools);

// Each tool has: name, description, inputSchema
result.tools.forEach(tool => {
  console.log(`${tool.name}: ${tool.description}`);
});
```

#### `callTool(params, resultSchema?, options?)`

Calls a tool with the specified parameters. Handles special cases like `renderLayout` and `fractal_tool_execute`.

**Parameters:**
- `params: CallToolRequest['params']` - Tool call parameters
- `resultSchema?: any` - Optional result validation schema
- `options?: RequestOptions` - Optional request options

**Returns:** `Promise<any>` - Tool execution result

**Example:**
```typescript
const result = await client.callTool({
  name: 'weather-tool',
  arguments: { location: 'New York' }
});
```

---

### High-Level Tool Methods

#### `search(term: string)`

Searches for tools in the Fractal registry.

**Parameters:**
- `term: string` - Search term

**Returns:** `Promise<any>` - Search results

**Example:**
```typescript
const results = await client.search('weather');
```

#### `executeTool(toolName: string, args?)`

Executes a Fractal tool with the given name and arguments.

**Parameters:**
- `toolName: string` - Name of the tool to execute
- `args?: Record<string, any>` - Optional tool arguments

**Returns:** `Promise<any>` - Tool execution result

**Example:**
```typescript
const result = await client.executeTool('weather-forecast', {
  location: 'San Francisco',
  days: 5
});
```

#### `navigate(toolName: string, args?)`

Executes a tool and returns a structured render output for UI components.

**Parameters:**
- `toolName: string` - Name of the tool to execute
- `args?: Record<string, any>` - Optional tool arguments

**Returns:** `Promise<RenderOutput>` - Structured render data

**RenderOutput:**
```typescript
interface RenderOutput {
  layout: string;                                    // JSX layout string
  includedIds: string[];                            // Component IDs included
  componentToolOutputs: {[id: string]: ComponentToolResponse}; // Component data
}
```

**Example:**
```typescript
const renderData = await client.navigate('dashboard-widget', {
  userId: '123'
});

console.log('Layout:', renderData.layout);
console.log('Component data:', renderData.componentToolOutputs);
```

---

## Type Definitions

### `ComponentToolResponse`

```typescript
interface ComponentToolResponse {
  component?: { html: string };     // HTML component content
  data?: Record<string, any>;       // Component data
  error?: string;                   // Error message if any
}
```

### `ComponentToolOutput`

```typescript
interface ComponentToolOutput extends ComponentToolResponse {
  toolName?: string;                // Name of the tool that generated this
}
```

### `MCPToolOutput`

```typescript
interface MCPToolOutput {
  content?: Array<{                 // MCP standard content format
    type: 'text';
    text: string;
  }>;
  data?: any;                       // Additional data
}
```

---

## Built-in Tools

### `renderLayout`

A special built-in tool for rendering UI layouts with Fractal components.

**Parameters:**
```typescript
{
  layout: string;        // JSX layout string
  includedIds: string[]; // Array of component IDs to include
}
```

**Example:**
```typescript
const result = await client.callTool({
  name: 'renderLayout',
  arguments: {
    layout: '<div><Frac id="comp1" /><Frac id="comp2" /></div>',
    includedIds: ['comp1', 'comp2']
  }
});
```

---

## Error Handling

All methods properly handle and throw errors. Always wrap calls in try-catch blocks:

```typescript
try {
  await client.connect();
  const tools = await client.listTools();
  const result = await client.executeTool('my-tool', { param: 'value' });
} catch (error) {
  console.error('Fractal SDK error:', error.message);
}
```

## Common Patterns

### Basic Tool Execution
```typescript
const client = new FractalSDK({ apiKey: 'your-key' });
await client.connect();

const result = await client.executeTool('weather', {
  location: 'San Francisco'
});
```

### Component Rendering
```typescript
// Execute a tool that returns a component
const renderData = await client.navigate('chart-widget', {
  data: [1, 2, 3, 4, 5]
});

// Use the render data in your UI framework
// renderData.layout contains JSX
// renderData.componentToolOutputs contains component data
```

### Tool Discovery
```typescript
// List all available tools
const { tools } = await client.listTools();

// Search for specific tools
const weatherTools = await client.search('weather');
```

## Environment Configuration

For local development, you can override the default URLs:

```typescript
const client = new FractalSDK({
  apiKey: 'your-key',
  baseUrl: 'http://localhost:5055',      // Local registry
  authUrl: 'http://localhost:8080/registry-auth'  // Local auth
});
```

## Session Management

The SDK automatically handles session management, token refresh, and connection persistence:

```typescript
const client = new FractalSDK({ apiKey: 'your-key' });
await client.connect();

// Session ID is automatically assigned
console.log('Session:', client.sessionId);

// Tokens are automatically refreshed as needed
// No manual token management required
```