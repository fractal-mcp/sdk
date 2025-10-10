# Fractal OpenAI Apps SDK

A comprehensive toolkit for building [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/) compatible applications. This monorepo provides everything you need to create rich, interactive widget applications for ChatGPT using the Model Context Protocol (MCP).

## What is this?

OpenAI's Apps SDK allows developers to build interactive widgets that run inside ChatGPT. This SDK makes it easier to:

- **Build MCP servers** with custom widget UIs
- **Create widget UI components** using React hooks
- **Bundle and deploy** your widgets for production

While OpenAI's official SDK is still in development, this toolkit provides production-ready packages to start building today.

## Packages

This monorepo contains the following packages:

### 🎨 UI Development

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

[📖 Full Documentation](./packages/oai-hooks/README.md)

---

### 🔧 Server Development

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

[📖 Full Documentation](./packages/oai-server/README.md)

---

### 📦 Bundling & Deployment

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

[📖 Full Documentation](./packages/bundle/README.md)

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

[📖 Full Documentation](./packages/cli/README.md)

---

### 🌐 Server Utilities

#### [@fractal-mcp/mcp-express](./packages/mcp-express)
Utilities for serving MCP servers with Express, including connection to Fractal's registry.

```bash
npm install @fractal-mcp/mcp-express
```

[📖 Full Documentation](./packages/mcp-express/README.md)

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

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│              ChatGPT                        │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Widget UI (React + oai-hooks)      │   │
│  │  - useWidgetProps()                 │   │
│  │  - useWidgetState()                 │   │
│  │  - useDisplayMode()                 │   │
│  └─────────────────────────────────────┘   │
│                  ↑                          │
│                  │ structuredContent        │
└──────────────────┼──────────────────────────┘
                   │
                   │ MCP Protocol (SSE)
                   ↓
┌─────────────────────────────────────────────┐
│  MCP Server (oai-server)                    │
│  - registerOpenAIWidget()                   │
│  - Tool handlers                            │
│  - Resource serving                         │
└─────────────────────────────────────────────┘
```

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
│   ├── oai-hooks/      # UI hooks
│   ├── oai-server/     # Server toolkit
│   ├── bundle/         # Bundling library
│   ├── cli/            # CLI tools
│   └── mcp-express/    # Express utilities
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

MIT

## Resources

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [OpenAI Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples)

## Credits

This SDK is built on the foundation of OpenAI's Apps SDK examples and makes them easily accessible as reusable npm packages. Special thanks to the OpenAI team for pioneering this approach to building interactive AI applications.

