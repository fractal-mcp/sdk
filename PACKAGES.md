# Package Documentation

This document provides detailed documentation for all packages in the Fractal SDK.

## Table of Contents

- [OpenAI Apps SDK](#openai-apps-sdk)
  - [@fractal-mcp/oai-hooks](#fractal-mcpoai-hooks)
  - [@fractal-mcp/oai-server](#fractal-mcpoai-server)
  - [@fractal-mcp/oai-preview](#fractal-mcpoai-preview)
- [MCP-UI / Cross-iframe Messaging](#mcp-ui--cross-iframe-messaging)
  - [@fractal-mcp/shared-ui](#fractal-mcpshared-ui)
  - [@fractal-mcp/mcp-ui-messenger](#fractal-mcpmcp-ui-messenger)
  - [@fractal-mcp/mcp-ui-hooks](#fractal-mcpmcp-ui-hooks)
- [Bundling & Deployment](#bundling--deployment)
  - [@fractal-mcp/bundle](#fractal-mcpbundle)
  - [@fractal-mcp/cli](#fractal-mcpcli)
- [Server Utilities](#server-utilities)
  - [@fractal-mcp/mcp-express](#fractal-mcpmcp-express)

---

## OpenAI Apps SDK

### @fractal-mcp/oai-hooks

React hooks for building widget UIs that communicate with ChatGPT.

#### Installation

```bash
npm install @fractal-mcp/oai-hooks
```

#### Key Features

- Access widget props from server
- Manage persistent widget state
- Respond to layout changes (display mode, max height)
- Access ChatGPT's global context (theme, safe area)

#### Example

```tsx
import { useWidgetProps, useWidgetState } from "@fractal-mcp/oai-hooks";

function WeatherWidget() {
  const props = useWidgetProps<{ location: string; temp: number }>();
  const [state, setState] = useWidgetState({ unit: "fahrenheit" });

  return (
    <div>
      <h2>Weather in {props.location}</h2>
      <p>{props.temp}°{state.unit === "celsius" ? "C" : "F"}</p>
      <button onClick={() => setState({ unit: state.unit === "celsius" ? "fahrenheit" : "celsius" })}>
        Toggle Unit
      </button>
    </div>
  );
}
```

#### Available Hooks

- **`useWidgetProps<T>()`** - Access props passed from the server handler
- **`useWidgetState<T>(initialState)`** - Persistent state management across widget instances
- **`useWidgetLayout()`** - Access layout information (display mode, max height)
- **`useGlobalContext()`** - Access ChatGPT context (theme, safe area)

[Full Documentation](./packages/oai-hooks/README.md)

---

### @fractal-mcp/oai-server

Server-side toolkit for building MCP servers with custom widget UIs.

#### Installation

```bash
npm install @fractal-mcp/oai-server
```

#### Key Features

- Register tools with custom UI widgets
- Serve widget HTML and assets via MCP resources
- Handle SSE transport for real-time communication
- Type-safe input validation with Zod

#### Example

```typescript
import { McpServer, registerOpenAIWidget, startOpenAIWidgetHttpServer } from "@fractal-mcp/oai-server";
import { z } from "zod";

const server = new McpServer({ name: "my-app", version: "1.0.0" });

registerOpenAIWidget(
  server,
  {
    id: "weather",
    title: "Get Weather",
    description: "Display weather information for a location",
    templateUri: "ui://widget/weather.html",
    invoking: "Fetching weather data...",
    invoked: "Weather data loaded!",
    html: `<div id="root"></div>`, // Your bundled widget HTML
    responseText: "Here's the current weather",
    inputSchema: z.object({
      location: z.string().describe("City name or location")
    })
  },
  async (args) => ({
    content: [{ type: "text", text: `Weather in ${args.location}` }],
    structuredContent: { temp: 72, location: args.location, condition: "Sunny" }
  })
);

startOpenAIWidgetHttpServer({ port: 8000, serverFactory: () => server });
```

#### Core APIs

- **`registerOpenAIWidget()`** - Register a tool with a widget UI
- **`startOpenAIWidgetHttpServer()`** - Start an HTTP server for your MCP server
- **`McpServer`** - Base MCP server class

[Full Documentation](./packages/oai-server/README.md)

---

### @fractal-mcp/oai-preview

Development/testing tool - React component for previewing and testing widgets locally.

#### Installation

```bash
npm install --save-dev @fractal-mcp/oai-preview
```

#### Key Features

- Preview widgets without running ChatGPT
- Test widget rendering with custom props
- Simulate tool calls and responses
- Development-only package (not needed in production)

#### Example

```tsx
import { WidgetDisplayComponent } from "@fractal-mcp/oai-preview";

function DevPreview() {
  return (
    <WidgetDisplayComponent
      htmlSnippet={widgetHtml}
      toolInput={{ location: "San Francisco" }}
      toolOutput={{ temp: 72, condition: "Sunny" }}
      onToolCall={async (name, params) => {
        console.log("Tool called:", name, params);
        return { result: "success" };
      }}
    />
  );
}
```

**Credits:** Built by studying [MCPJam Inspector](https://github.com/MCPJam/inspector) and ChatGPT's widget source code.

[Full Documentation](./packages/oai-preview/README.md)

---

## MCP-UI / Cross-iframe Messaging

### @fractal-mcp/shared-ui

Low-level RPC communication layer for iframe messaging.

#### Installation

```bash
npm install @fractal-mcp/shared-ui
```

#### Key Features

- RPC-style request/response messaging
- Event emission and listening
- Message correlation tracking
- Works with any iframe messaging protocol

#### Example

```typescript
import { Messenger } from '@fractal-mcp/shared-ui';

const messenger = new Messenger({
  send: (message) => window.parent.postMessage(message, '*'),
  listen: (handler) => {
    window.addEventListener('message', (event) => handler(event.data));
  }
});

// Send a request and wait for response
const response = await messenger.request('getData', { userId: 123 });

// Emit an event
messenger.emit('userAction', { action: 'click', target: 'button' });

// Listen for events
messenger.on('themeChanged', (data) => {
  console.log('New theme:', data.theme);
});
```

[Full Documentation](./packages/shared-ui/README.md)

---

### @fractal-mcp/mcp-ui-messenger

MCP-UI compatible cross-iframe messenger for embeddable UIs.

#### Installation

```bash
npm install @fractal-mcp/mcp-ui-messenger
```

#### Key Features

- Implements [MCP-UI Embeddable UI Protocol](https://mcpui.dev/guide/embeddable-ui)
- Automatic iframe lifecycle management
- Render data handling
- Intent, notification, prompt, and tool messaging
- Auto-resize observer

#### Example

```typescript
import { initUIMessenger } from '@fractal-mcp/mcp-ui-messenger';

// Initialize messenger
const messenger = await initUIMessenger({ rootElId: 'root' });

// Get render data from host
const renderData = messenger.getRenderData();
console.log('Theme:', renderData.theme);

// Emit an intent to the host
messenger.emitIntent({
  intent: 'button-clicked',
  params: { timestamp: Date.now() }
});

// Send a notification
messenger.sendNotification({
  level: 'info',
  message: 'Action completed successfully'
});

// Request a prompt from the host
const userInput = await messenger.requestPrompt({
  title: 'Enter your name',
  description: 'Please provide your full name',
  placeholder: 'John Doe'
});

// Call a tool
const result = await messenger.callTool({
  name: 'fetchData',
  arguments: { id: 123 }
});
```

[Full Documentation](./packages/mcp-ui-messenger/README.md)

---

### @fractal-mcp/mcp-ui-hooks

React hooks for MCP-UI cross-iframe messaging.

#### Installation

```bash
npm install @fractal-mcp/mcp-ui-hooks
```

#### Key Features

- Dead simple React integration
- Automatic initialization and cleanup
- All MCP-UI message types supported
- TypeScript support

#### Example

```tsx
import { useUIMessenger } from '@fractal-mcp/mcp-ui-hooks';

function App() {
  const { ready, renderData, emitIntent, sendNotification, callTool } = useUIMessenger();

  if (!ready) return <div>Loading...</div>;

  const handleClick = async () => {
    emitIntent({ intent: 'button-clicked' });

    sendNotification({
      level: 'success',
      message: 'Button was clicked!'
    });

    const result = await callTool({
      name: 'getData',
      arguments: { id: 123 }
    });

    console.log('Tool result:', result);
  };

  return (
    <div style={{ background: renderData?.theme === 'dark' ? '#000' : '#fff' }}>
      <h1>MCP-UI Widget</h1>
      <button onClick={handleClick}>Click Me</button>
    </div>
  );
}
```

> **Note:** For OpenAI Apps SDK, use `@fractal-mcp/oai-hooks` instead.

[Full Documentation](./packages/mcp-ui-hooks/README.md)

---

## Bundling & Deployment

### @fractal-mcp/bundle

Bundling utilities for React components, JS/TS entry points, and HTML files.

#### Installation

```bash
npm install @fractal-mcp/bundle
```

#### Key Features

- Bundle React components into standalone HTML files
- Multiple output formats (full HTML, snippets, separate assets)
- Framework-agnostic (React, Vue, Svelte)
- Powered by Vite for fast builds
- Built-in testing utilities with Playwright

#### Example

```typescript
import { bundleReactComponent } from '@fractal-mcp/bundle';

// Bundle a React component into a single HTML file
await bundleReactComponent({
  entrypoint: './src/MyWidget.tsx',
  out: './dist'
});
// Outputs: dist/index.html (single file with everything inlined)

// Bundle with separate assets
await bundleReactComponent({
  entrypoint: './src/MyWidget.tsx',
  out: './dist',
  format: 'split' // Outputs: dist/index.html, dist/assets/...
});

// Bundle just the HTML snippet (without <!DOCTYPE> and <html> wrapper)
await bundleReactComponent({
  entrypoint: './src/MyWidget.tsx',
  out: './dist',
  format: 'snippet'
});
```

#### Testing Your Bundle

```typescript
import { testBundledWidget } from '@fractal-mcp/bundle/test';

await testBundledWidget({
  htmlPath: './dist/index.html',
  test: async (page) => {
    // Use Playwright page API
    await page.waitForSelector('h1');
    const title = await page.textContent('h1');
    expect(title).toBe('My Widget');
  }
});
```

[Full Documentation](./packages/bundle/README.md)

---

### @fractal-mcp/cli

Command-line tools for bundling widgets.

#### Installation

```bash
npm install -g @fractal-mcp/cli
# or use with npx
```

#### Usage

```bash
# Bundle a React component
npx @fractal-mcp/cli bundle --entrypoint=./src/Widget.tsx --out=./dist

# Bundle an HTML application
npx @fractal-mcp/cli bundle --entrypoint=./index.html --out=./dist

# Bundle with specific format
npx @fractal-mcp/cli bundle --entrypoint=./src/Widget.tsx --out=./dist --format=split

# Watch mode for development
npx @fractal-mcp/cli bundle --entrypoint=./src/Widget.tsx --out=./dist --watch
```

#### Options

- `--entrypoint` - Entry file to bundle (React component, JS/TS file, or HTML file)
- `--out` - Output directory
- `--format` - Output format: `full` (default), `snippet`, or `split`
- `--watch` - Watch for changes and rebuild

[Full Documentation](./packages/cli/README.md)

---

## Server Utilities

### @fractal-mcp/mcp-express

Utilities for serving MCP servers with Express, including connection to Fractal's registry.

#### Installation

```bash
npm install @fractal-mcp/mcp-express
```

#### Key Features

- Express middleware for MCP servers
- SSE transport handling
- Fractal registry integration
- CORS and security headers

#### Example

```typescript
import express from 'express';
import { setupMcpServer } from '@fractal-mcp/mcp-express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const app = express();
const mcpServer = new McpServer({ name: 'my-server', version: '1.0.0' });

// Setup MCP server routes
setupMcpServer(app, mcpServer, {
  path: '/mcp',
  registry: {
    apiKey: process.env.FRACTAL_API_KEY,
    serverUrl: process.env.PUBLIC_URL
  }
});

app.listen(3000, () => {
  console.log('MCP server running on http://localhost:3000');
});
```

[Full Documentation](./packages/mcp-express/README.md)

---

## Package Relationships

```
┌──────────────────┐
│   oai-hooks      │  React hooks for widget UI
└────────┬─────────┘
         │ used by
         ↓
┌──────────────────┐
│   Your Widget    │  Your React components
└────────┬─────────┘
         │ bundled by
         ↓
┌──────────────────┐
│   bundle/cli     │  Bundling tools
└────────┬─────────┘
         │ produces HTML for
         ↓
┌──────────────────┐
│   oai-server     │  MCP server with widgets
└──────────────────┘
```

For MCP-UI widgets, replace `oai-hooks` with `mcp-ui-hooks` and use `mcp-ui-messenger` for messaging.

## Development Workflow

1. **Create widget UI** using `@fractal-mcp/oai-hooks` or `@fractal-mcp/mcp-ui-hooks`
2. **Preview locally** using `@fractal-mcp/oai-preview` (OpenAI Apps SDK only)
3. **Bundle for production** using `@fractal-mcp/cli` or `@fractal-mcp/bundle`
4. **Create MCP server** using `@fractal-mcp/oai-server`
5. **Deploy** using `@fractal-mcp/mcp-express` or your preferred hosting solution

## Publishing Packages

Each package can be published independently to npm:

```bash
cd packages/[package-name]
npm publish
```

All packages follow semantic versioning and are published under the `@fractal-mcp` namespace.
