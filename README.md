# Fractal SDK

A comprehensive toolkit for embedding interactive UIs in chat applications. This monorepo provides everything you need to create rich, interactive widget applications using the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) and cross-iframe messaging.

## Getting Started
Head to our [OpenAI Apps SDK quickstart](./docs/quickstart.md) if you would like to skip straight to building!

Want to understand how everything works first? Check out [How It Works](./docs/how-it-works.md).

## What is this?

This SDK provides tools for embedding UIs in chat applications including:

- **[OpenAI Apps SDK](https://developers.openai.com/apps-sdk/)** - Build interactive widgets for ChatGPT
- **[MCP-UI Protocol](https://mcpui.dev/guide/embeddable-ui)** - Build embeddable UIs with cross-iframe messaging
- **Custom embedding solutions** - Use our messaging layer for any iframe-based UI embedding

The SDK makes it easier to:

- **Build MCP servers** with custom widget UIs
- **Create widget UI components** using React hooks
- **Embed UIs** using cross-iframe messaging protocols
- **Bundle and deploy** your widgets for production
- **Preview widgets** before deployment

This toolkit provides production-ready packages to start building today.

## Packages Overview

### OpenAI Apps SDK Packages
- **[@fractal-mcp/oai-hooks](./packages/oai-hooks)** - React hooks for building widget UIs (OpenAI Apps SDK)
- **[@fractal-mcp/oai-server](./packages/oai-server)** - Server toolkit for building MCP servers with widgets
- **[@fractal-mcp/oai-preview](./packages/oai-preview)** - Development tool for previewing widgets

### MCP-UI / Cross-iframe Messaging Packages
- **[@fractal-mcp/shared-ui](./packages/shared-ui)** - RPC layer for iframe communication
- **[@fractal-mcp/mcp-ui-messenger](./packages/mcp-ui-messenger)** - MCP-UI compatible iframe messenger
- **[@fractal-mcp/mcp-ui-hooks](./packages/mcp-ui-hooks)** - React hooks for MCP-UI messaging

### Bundling & Deployment
- **[@fractal-mcp/bundle](./packages/bundle)** - Bundling library for React components, JS/TS, and HTML files
- **[@fractal-mcp/cli](./packages/cli)** - Command-line tools for bundling widgets

### Server Utilities
- **[@fractal-mcp/mcp-express](./packages/mcp-express)** - Express utilities for serving MCP servers


## Package Details

### OpenAI Apps SDK

#### [@fractal-mcp/oai-hooks](./packages/oai-hooks)
React hooks for building widget UIs that communicate with ChatGPT.

```bash
npm install @fractal-mcp/oai-hooks
```

**Key features:**
- Access widget props from server
- Manage persistent widget state
- Respond to layout changes (display mode, max height)
- Access ChatGPT's global context (theme, safe area)

**Example:**
```tsx
import { useWidgetProps, useWidgetState } from "@fractal-mcp/oai-hooks";

function WeatherWidget() {
  const props = useWidgetProps<{ location: string; temp: number }>();
  const [state, setState] = useWidgetState({ unit: "fahrenheit" });
  
  return (
    <div>
      <h2>Weather in {props.location}</h2>
      <p>{props.temp}°{state.unit === "celsius" ? "C" : "F"}</p>
    </div>
  );
}
```

[Full Documentation](./packages/oai-hooks/README.md)

---

#### [@fractal-mcp/oai-server](./packages/oai-server)
Server-side toolkit for building MCP servers with custom widget UIs.

```bash
npm install @fractal-mcp/oai-server
```

**Key features:**
- Register tools with custom UI widgets
- Serve widget HTML and assets via MCP resources
- Handle SSE transport for real-time communication
- Type-safe input validation with Zod

**Example:**
```typescript
import { McpServer, registerOpenAIWidget, startOpenAIWidgetHttpServer } from "@fractal-mcp/oai-server";

const server = new McpServer({ name: "my-app", version: "1.0.0" });

registerOpenAIWidget(
  server,
  {
    id: "weather",
    title: "Get Weather",
    templateUri: "ui://widget/weather.html",
    html: `<div id="root"></div>`,
    // ... more config
  },
  async (args) => ({
    content: [{ type: "text", text: "Weather data" }],
    structuredContent: { temp: 72, location: args.location }
  })
);

startOpenAIWidgetHttpServer({ port: 8000, serverFactory: () => server });
```

[Full Documentation](./packages/oai-server/README.md)

---

#### [@fractal-mcp/oai-preview](./packages/oai-preview)
**Development/Testing Tool** - React component for previewing and testing widgets.

```bash
npm install --save-dev @fractal-mcp/oai-preview
```

**Example:**
```tsx
import { WidgetDisplayComponent } from "@fractal-mcp/oai-preview";

<WidgetDisplayComponent
  htmlSnippet={widgetHtml}
  toolInput={{ location: "San Francisco" }}
  toolOutput={{ temp: 72, condition: "Sunny" }}
  onToolCall={async (name, params) => {/* handle tool calls */}}
/>
```

**Credits:** Built by studying [MCPJam Inspector](https://github.com/MCPJam/inspector) and ChatGPT's widget source code.

[Full Documentation](./packages/oai-preview/README.md)

---

### MCP-UI / Cross-iframe Messaging

#### [@fractal-mcp/shared-ui](./packages/shared-ui)
Low-level RPC communication layer for iframe messaging.

```bash
npm install @fractal-mcp/shared-ui
```

**Key features:**
- RPC-style request/response messaging
- Event emission and listening
- Message correlation tracking
- Works with any iframe messaging protocol

[Full Documentation](./packages/shared-ui/README.md)

---

#### [@fractal-mcp/mcp-ui-messenger](./packages/mcp-ui-messenger)
MCP-UI compatible cross-iframe messenger for embeddable UIs.

```bash
npm install @fractal-mcp/mcp-ui-messenger
```

**Key features:**
- Implements [MCP-UI Embeddable UI Protocol](https://mcpui.dev/guide/embeddable-ui)
- Automatic iframe lifecycle management
- Render data handling
- Intent, notification, prompt, and tool messaging
- Auto-resize observer

**Example:**
```typescript
import { initUIMessenger } from '@fractal-mcp/mcp-ui-messenger';

const messenger = await initUIMessenger({ rootElId: 'root' });
const renderData = messenger.getRenderData();

messenger.emitIntent({ 
  intent: 'button-clicked',
  params: { timestamp: Date.now() }
});
```

[Full Documentation](./packages/mcp-ui-messenger/README.md)

---

#### [@fractal-mcp/mcp-ui-hooks](./packages/mcp-ui-hooks)
React hooks for MCP-UI cross-iframe messaging.

```bash
npm install @fractal-mcp/mcp-ui-hooks
```

**Key features:**
- Dead simple React integration
- Automatic initialization and cleanup
- All MCP-UI message types supported
- TypeScript support

**Example:**
```tsx
import { useUIMessenger } from '@fractal-mcp/mcp-ui-hooks';

function App() {
  const { ready, renderData, emitIntent } = useUIMessenger();
  
  if (!ready) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Theme: {renderData?.theme}</h1>
      <button onClick={() => emitIntent({ intent: 'action' })}>
        Click Me
      </button>
    </div>
  );
}
```

> **Note:** For OpenAI Apps SDK, use `@fractal-mcp/oai-hooks` instead.

[Full Documentation](./packages/mcp-ui-hooks/README.md)

---

### Bundling & Deployment

#### [@fractal-mcp/bundle](./packages/bundle)
Bundling utilities for React components, JS/TS entry points, and HTML files.

```bash
npm install @fractal-mcp/bundle
```

**Key features:**
- Bundle React components into standalone HTML files
- Multiple output formats (full HTML, snippets, separate assets)
- Framework-agnostic (React, Vue, Svelte)
- Powered by Vite for fast builds
- Built-in testing utilities with Playwright

**Example:**
```typescript
import { bundleReactComponent } from '@fractal-mcp/bundle';

await bundleReactComponent({
  entrypoint: './src/MyWidget.tsx',
  out: './dist'
});
// Outputs: dist/index.html (single file with everything inlined)
```

[Full Documentation](./packages/bundle/README.md)

---

#### [@fractal-mcp/cli](./packages/cli)
Command-line tools for bundling widgets.

```bash
npm install -g @fractal-mcp/cli
# or use with npx
```

**Usage:**
```bash
# Bundle a React component
npx @fractal-mcp/cli bundle --entrypoint=./src/Widget.tsx --out=./dist

# Bundle an HTML application
npx @fractal-mcp/cli bundle --entrypoint=./index.html --out=./dist
```

[Full Documentation](./packages/cli/README.md)

---

### Server Utilities

#### [@fractal-mcp/mcp-express](./packages/mcp-express)
Utilities for serving MCP servers with Express, including connection to Fractal's registry.

```bash
npm install @fractal-mcp/mcp-express
```

[Full Documentation](./packages/mcp-express/README.md)

---

## Quick Start

### 1. Create a Widget UI Component

```tsx
// ui/WeatherWidget.tsx
import { useWidgetProps } from "@fractal-mcp/oai-hooks";

export default function WeatherWidget() {
  const props = useWidgetProps<{ location: string; temp: number }>();
  
  return (
    <div>
      <h2>{props.location}</h2>
      <p>{props.temp}°F</p>
    </div>
  );
}
```

### 2. Bundle the Widget

```bash
npx @fractal-mcp/cli bundle --entrypoint=./ui/WeatherWidget.tsx --out=./dist
```

This creates `dist/index.html` with your widget bundled as a single HTML file.

### 3. Create an MCP Server

```typescript
// server/index.ts
import { McpServer, registerOpenAIWidget, startOpenAIWidgetHttpServer } from "@fractal-mcp/oai-server";
import { z } from "zod";
import fs from "fs";

function createServer() {
  const server = new McpServer({ name: "weather-server", version: "1.0.0" });
  
  // Read bundled widget HTML
  const widgetHtml = fs.readFileSync("./dist/index.html", "utf-8");
  
  registerOpenAIWidget(
    server,
    {
      id: "get-weather",
      title: "Get Weather",
      description: "Show weather for a location",
      templateUri: "ui://widget/weather.html",
      invoking: "Fetching weather...",
      invoked: "Weather loaded!",
      html: widgetHtml,
      responseText: "Here's the weather",
      inputSchema: z.object({
        location: z.string().describe("City name")
      })
    },
    async (args) => ({
      content: [{ type: "text", text: `Weather in ${args.location}` }],
      structuredContent: { 
        location: args.location, 
        temp: 72 
      }
    })
  );
  
  return server;
}

startOpenAIWidgetHttpServer({
  port: 8000,
  serverFactory: createServer
});
```

### 4. Run Your Server

```bash
npm run build
node dist/server/index.js
```

Your MCP server is now running at `http://localhost:8000` and ready to be connected to ChatGPT!

## Examples

Check out the [examples directory](./apps/examples) for complete working examples:

- **[oai-apps](./apps/examples/oai-apps)** - Full example showing server and UI integration

### Data Flow

1. **User invokes tool** in ChatGPT
2. **Server handler** processes request and returns:
   - `content`: Text/resources for the chat
   - `structuredContent`: Props for the widget
3. **ChatGPT renders widget** using the bundled HTML
4. **Widget UI** receives props via `useWidgetProps()` and renders
5. **User interacts** with widget, state persists via `useWidgetState()`

### Package Relationships

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

## Development

### Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

### Package Structure

```
sdk/
├── packages/
│   ├── OpenAI Apps SDK:
│   │   ├── oai-hooks/      # UI hooks for ChatGPT widgets
│   │   ├── oai-server/     # Server toolkit for MCP with widgets
│   │   └── oai-preview/    # 🧪 Dev/testing tool
│   ├── MCP-UI:
│   │   ├── shared-ui/      # RPC layer for iframe communication
│   │   ├── mcp-ui-messenger/ # MCP-UI compatible messenger
│   │   └── mcp-ui-hooks/   # React hooks for MCP-UI
│   ├── Bundling:
│   │   ├── bundle/         # Bundling library
│   │   └── cli/            # CLI tools
│   └── Server Utilities:
│       └── mcp-express/    # Express utilities
└── apps/
    └── examples/       # Example applications
```

### Publishing

Each package can be published independently to npm:

```bash
cd packages/[package-name]
npm publish
```

## Requirements

- Node.js 18+
- React 18+ (for widget UIs)
- TypeScript 5+ (recommended)

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

Apache License, Version 2.0

## Resources

### OpenAI Apps SDK
- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk/)
- [OpenAI Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)

### MCP & MCP-UI
- [MCP-UI Embeddable UI Protocol](https://mcpui.dev/guide/embeddable-ui)

### Other resources
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Fractal MCP](https://fractalmcp.com/)

## Credits

This SDK provides tools for embedding UIs in chat applications, supporting multiple protocols and frameworks. Special thanks to:

- **OpenAI** for pioneering the Apps SDK and widget approach to building interactive AI applications
- **[MCP-UI](https://mcpui.dev/)** for creating the embeddable UI protocol specification
- **[MCPJam Inspector](https://github.com/MCPJam/inspector)** for their excellent open-source MCP testing platform, which helped inform our development tooling
- The **MCP community** for building an ecosystem of tools and servers

