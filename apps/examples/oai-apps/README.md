# OpenAI Apps SDK Example

This example demonstrates how to build a widget for OpenAI's ChatGPT using the Fractal MCP SDK.

## What This Example Does

This example shows a complete workflow for creating an interactive widget:

1. A React component (`ui/Component.tsx`) that uses Fractal hooks to receive props and manage state
2. A bundling step that creates a self-contained HTML file with the React component
3. An MCP server (`server/index.ts`) that registers the widget and serves it to ChatGPT

## Packages Used

This example uses three Fractal MCP packages:

- **@fractal-mcp/oai-server** - Creates the MCP server, registers widgets, and starts the HTTP server
- **@fractal-mcp/oai-hooks** - Provides React hooks (`useWidgetProps`, `useWidgetState`, `useWebplusGlobal`) for building widget UIs
- **@fractal-mcp/cli** - Bundles the React component into a self-contained HTML file

## Project Structure

```
oai-apps/
├── server/
│   └── index.ts          # MCP server with widget registration
├── ui/
│   ├── Component.tsx     # React widget component
│   ├── main.tsx          # React entrypoint
│   ├── styles.css        # Widget styles
│   └── bundle/           # Output directory for bundled widget (generated)
├── package.json
└── README.md
```

## How to Run

### 1. Install dependencies

From the SDK root:
```bash
npm install
```

### 2. Bundle the widget UI

Bundle the React component into a self-contained HTML file that can be embedded in the widget:

```bash
npx @fractal-mcp/cli bundle \
  --entrypoint=ui/main.tsx \
  --out=ui/bundle \
  --root-only \
  --inline-js \
  --inline-css
```

This creates `ui/bundle/index.html` with all JavaScript and CSS inlined. The `--root-only` flag generates just the root element content (no `<html>`, `<head>`, etc.) which is suitable for embedding in widgets.

### 3. Run the server

```bash
npm run dev:server
```

The server starts on `http://localhost:8001` and is ready to accept connections from ChatGPT.

## How It Works

### Widget UI (`ui/Component.tsx`)

The UI component uses hooks from `@fractal-mcp/oai-hooks`:

- **`useWidgetProps<T>(defaults)`** - Receives props from the server's `structuredContent` response
- **`useWidgetState<T>(initialState)`** - Manages persistent state that survives across widget updates
- **`useWebplusGlobal("theme")`** - Accesses ChatGPT context like the current theme

```typescript
const props = useWidgetProps<HelloProps>({ name: "World" });
const [state, setState] = useWidgetState<HelloState>({ clickCount: 0 });
const theme = useWebplusGlobal("theme");
```

### Server (`server/index.ts`)

The server uses `@fractal-mcp/oai-server` to:

1. Create an MCP server instance with `new McpServer()`
2. Register a widget with `registerOpenAIWidget()`:
   - Define widget metadata (id, title, HTML)
   - Define input schema using Zod
   - Provide a handler function that returns content and props
3. Start an HTTP server with `startOpenAIWidgetHttpServer()`

When the widget tool is invoked, the handler returns:
- **`content`** - Text and UI resources displayed in the chat
- **`structuredContent`** - Props passed to the widget UI via `useWidgetProps()`

## Development Workflow

1. Make changes to `ui/Component.tsx`
2. Re-run the bundle command to update `ui/bundle/index.html`
3. The dev server (with `tsx watch`) will automatically reload

## Building for Production

```bash
npm run build
```

This compiles the TypeScript server code. You'll still need to bundle the UI separately using the CLI command above.

## Next Steps

- Add more widgets to demonstrate different UI patterns
- Implement additional MCP tools alongside widgets
- Customize the widget styling and interactions
- Explore state persistence across multiple widget invocations
