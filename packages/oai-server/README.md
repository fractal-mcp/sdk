# @fractal-mcp/oai-server

A server-side toolkit for building [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/) compatible MCP servers with custom widget UIs.

## What is this?

OpenAI's [Apps SDK](https://developers.openai.com/apps-sdk/) allows developers to build rich, interactive applications for ChatGPT using the Model Context Protocol (MCP). While we're all waiting for OpenAI to release their official SDK, this package provides the tools you need to start building MCP servers that work seamlessly with ChatGPT's widget system.

This is a **server-side library** that helps you:
- Register tools with custom UI widgets
- Serve widget HTML and assets via MCP resources
- Handle SSE (Server-Sent Events) transport for real-time communication with ChatGPT

## Installation

```bash
npm install @fractal-mcp/oai-server
```

## Quick Start

Here's the simplest possible server with one tool:

```typescript
import { z } from "zod";
import {
  McpServer,
  registerOpenAIWidget,
  startOpenAIWidgetHttpServer
} from "@fractal-mcp/oai-server";

// Define your tool's input schema
const weatherSchema = z.object({
  location: z.string().describe("City name to get weather for")
});

function createServer() {
  const server = new McpServer({ 
    name: "weather-server", 
    version: "1.0.0" 
  });

  // Register a widget tool
  registerOpenAIWidget(
    server,
    {
      id: "get-weather",
      title: "Get Weather",
      description: "Show current weather for a location",
      templateUri: "ui://widget/weather.html",
      invoking: "Checking the weather...",
      invoked: "Weather loaded!",
      html: `
        <div id="weather-root"></div>
        <script type="module" src="https://your-cdn.com/weather-widget.js"></script>
      `,
      responseText: "Here's the current weather",
      inputSchema: weatherSchema
    },
    async (args) => ({
      content: [
        { type: "text", text: `Weather in ${args.location}: Sunny, 72°F` }
      ],
      structuredContent: { 
        location: args.location,
        temp: 72,
        condition: "sunny"
      }
    })
  );

  return server;
}

// Start HTTP server with SSE transport
startOpenAIWidgetHttpServer({
  port: 8000,
  serverFactory: createServer
});

console.log("Server running at http://localhost:8000");
```

### Building Widget UI Files

The `html` field references static files (like `weather-widget.js`). You can create these bundled widget files using [@fractal-mcp/bundle](https://github.com/fractal-mcp/sdk/tree/main/packages/bundle), which bundles your React/Vue components into standalone widget files ready to be served from a CDN or your own hosting.

## API Reference

### `registerOpenAIWidget(mcpServer, widget, handler)`

Register a widget tool with an MCP server. This registers:
- A **tool** that can be invoked by ChatGPT
- A **resource** containing the widget's HTML
- A **resource template** for dynamic widget rendering

**Parameters:**
- `mcpServer` (`McpServer`) - MCP server instance to register with
- `widget` (`OpenAIWidget`) - Widget configuration object
- `handler` (`WidgetToolHandler`) - Async function that handles tool invocation

**Widget Configuration:**
```typescript
{
  id: string;                    // Unique tool identifier
  title: string;                 // Human-readable title
  description?: string;          // Tool description for ChatGPT
  templateUri: string;           // Widget resource URI (e.g., "ui://widget/my-widget.html")
  invoking: string;              // Text shown while tool is running
  invoked: string;               // Text shown when tool completes
  html: string;                  // Widget HTML content (can include <script> and <link> tags)
  responseText: string;          // Response text for the assistant
  inputSchema?: z.ZodObject;     // Zod schema for input validation
}
```

**Handler Function:**
```typescript
async (args: T) => {
  content: Array<{ type: "text", text: string }>;  // Required: content to show
  structuredContent?: Record<string, any>;          // Optional: data for the widget
}
```

The handler receives validated arguments (validated against `inputSchema` if provided) and must return:
- `content`: Array of content items (text, images, etc.) - this is what the assistant will see
- `structuredContent`: Optional data object that gets passed to your widget UI

The SDK automatically injects OpenAI metadata (`_meta`) into the response.

**Example:**
```typescript
registerOpenAIWidget(
  server,
  {
    id: "greet",
    title: "Greet User",
    templateUri: "ui://widget/greeting.html",
    invoking: "Preparing greeting...",
    invoked: "Greeting ready!",
    html: `<div id="greeting"></div>`,
    responseText: "Greeted the user",
    inputSchema: z.object({ name: z.string() })
  },
  async (args) => ({
    content: [{ type: "text", text: `Hello, ${args.name}!` }],
    structuredContent: { name: args.name, timestamp: Date.now() }
  })
);
```

---

### `startOpenAIWidgetHttpServer(options)`

Create and start an HTTP server with SSE transport for MCP communication.

This might help you out if you're extremely lazy and don't want to configure anything :)
Otherwise you can connect your server as normal

**Parameters:**
```typescript
{
  port?: number;                           // Port to listen on (default: 8000)
  ssePath?: string;                        // SSE endpoint path (default: "/mcp")
  postPath?: string;                       // POST message path (default: "/mcp/messages")
  enableCors?: boolean;                    // Enable CORS (default: true)
  serverFactory: () => McpServer;          // Factory function to create server instances
}
```

**Returns:** Node.js HTTP server instance

**Example:**
```typescript
const httpServer = startOpenAIWidgetHttpServer({
  port: 3000,
  serverFactory: () => {
    const server = new McpServer({ name: "my-app", version: "1.0.0" });
    // Register your widgets here
    registerOpenAIWidget(server, myWidget, myHandler);
    return server;
  }
});

// Server exposes:
// - GET  http://localhost:3000/mcp (SSE connection)
// - POST http://localhost:3000/mcp/messages?sessionId=... (send messages)
```

---

### `createOpenAIWidgetHttpServer(options)`

Create an HTTP server without starting it (for more control over when to listen).

**Parameters:** Same as `startOpenAIWidgetHttpServer`

**Returns:** Node.js HTTP server instance (not yet listening)

**Example:**
```typescript
const httpServer = createOpenAIWidgetHttpServer({
  port: 8000,
  serverFactory: createMyServer
});

// Start manually when ready
httpServer.listen(8000, () => {
  console.log("Server started!");
});
```

---

### `getWidgetMeta(widget)`

Extract OpenAI-specific metadata from a widget configuration.

**Parameters:**
- `widget` (`OpenAIWidget`) - Widget configuration

**Returns:** `WidgetMeta` object
```typescript
{
  "openai/outputTemplate": string;           // Widget template URI
  "openai/toolInvocation/invoking": string;  // Invoking message
  "openai/toolInvocation/invoked": string;   // Invoked message
  "openai/widgetAccessible": true;           // Widget is accessible
  "openai/resultCanProduceWidget": true;     // Result can render widget
}
```

**Example:**
```typescript
import { getWidgetMeta } from "@fractal-mcp/oai-server";

const meta = getWidgetMeta(myWidget);
// Use meta object for custom registrations
```

---

### Types

#### `OpenAIWidget<TInputSchema>`
Widget configuration type (generic over input schema).

#### `WidgetToolHandler<T>`
Tool handler function type.

#### `WidgetMeta`
OpenAI metadata object type.

#### `OpenAIWidgetHttpServerOptions`
HTTP server configuration options.

## How It Works

### Schema Processing
When you provide `inputSchema` as a Zod object (e.g., `z.object({ ... })`), the SDK:
1. Extracts the `.shape` property (individual field schemas)
2. Passes the shape to `McpServer.registerTool()` for JSON Schema generation
3. Uses the full Zod object for runtime validation of incoming arguments

### SSE Transport
The HTTP server uses Server-Sent Events (SSE) for real-time bidirectional communication:
- ChatGPT opens a GET request to `/mcp` (SSE stream)
- ChatGPT sends messages via POST to `/mcp/messages?sessionId=...`
- Each session gets isolated server state via the `serverFactory`

## Examples

See [`src/example.ts`](./src/example.ts) for a complete working example with multiple pizza-themed widgets.

## License

MIT
