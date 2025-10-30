# Package Reference

Detailed documentation for all packages in the Fractal SDK.

## OpenAI Apps SDK Packages

### [@fractal-mcp/oai-hooks](../packages/oai-hooks)
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

[Full Documentation](../packages/oai-hooks/README.md)

---

### [@fractal-mcp/oai-server](../packages/oai-server)
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

[Full Documentation](../packages/oai-server/README.md)

---

### [@fractal-mcp/oai-preview](../packages/oai-preview)
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

[Full Documentation](../packages/oai-preview/README.md)

---

## MCP-UI / Cross-iframe Messaging Packages

### [@fractal-mcp/shared-ui](../packages/shared-ui)
Low-level RPC communication layer for iframe messaging.

```bash
npm install @fractal-mcp/shared-ui
```

**Key features:**
- RPC-style request/response messaging
- Event emission and listening
- Message correlation tracking
- Works with any iframe messaging protocol

[Full Documentation](../packages/shared-ui/README.md)

---

### [@fractal-mcp/mcp-ui-messenger](../packages/mcp-ui-messenger)
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

[Full Documentation](../packages/mcp-ui-messenger/README.md)

---

### [@fractal-mcp/mcp-ui-hooks](../packages/mcp-ui-hooks)
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

[Full Documentation](../packages/mcp-ui-hooks/README.md)

---

## Bundling & Deployment Packages

### [@fractal-mcp/bundle](../packages/bundle)
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

[Full Documentation](../packages/bundle/README.md)

---

### [@fractal-mcp/cli](../packages/cli)
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

[Full Documentation](../packages/cli/README.md)

---

## Server Utilities

### [@fractal-mcp/mcp-express](../packages/mcp-express)
Utilities for serving MCP servers with Express, including connection to Fractal's registry.

```bash
npm install @fractal-mcp/mcp-express
```

[Full Documentation](../packages/mcp-express/README.md)

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
