# OpenAI Apps SDK Example

This example demonstrates how to build an OpenAI Apps SDK compatible widget using:
- `@fractal-mcp/oai-server` for the MCP server with widget registration
- `@fractal-mcp/oai-hooks` for React hooks in the UI component

## Structure

```
oai-apps/
├── server/
│   └── index.ts       # MCP server with widget registration
├── ui/
│   └── Component.tsx  # React widget component using oai-hooks
├── package.json
└── README.md
```

## Server (`server/index.ts`)

The server uses `@fractal-mcp/oai-server` to:
- Create an MCP server instance
- Register a widget with `registerOpenAIWidget()`
- Start an HTTP server with SSE transport

Key imports:
```typescript
import { 
  McpServer, 
  registerOpenAIWidget, 
  startOpenAIWidgetHttpServer 
} from "@fractal-mcp/oai-server";
```

## UI Component (`ui/Component.tsx`)

The UI component uses hooks from `@fractal-mcp/oai-hooks`:
- `useWebplusGlobal()` - Access ChatGPT context (theme, etc.)
- `useWidgetProps()` - Get props from server's structuredContent
- `useWidgetState()` - Manage persistent widget state

Key imports:
```typescript
import { 
  useWidgetProps, 
  useWidgetState, 
  useWebplusGlobal 
} from "@fractal-mcp/oai-hooks";
```

## Running the Example

### Install dependencies
From the SDK root:
```bash
npm install
```

### Run the server
```bash
npm run dev:server
```

The server will start on http://localhost:8000

### Build
```bash
npm run build
```

This compiles the TypeScript files.

## How It Works

1. The server registers a widget with `registerOpenAIWidget()`, specifying:
   - Widget metadata (id, title, HTML)
   - Input schema (using Zod)
   - Handler function that returns `structuredContent`

2. When the tool is called, the handler returns:
   - `content` - Text/UI resources for the chat
   - `structuredContent` - Props passed to the widget UI

3. The widget UI component:
   - Receives props via `useWidgetProps()`
   - Manages state with `useWidgetState()`
   - Accesses ChatGPT context via `useWebplusGlobal()`

## Next Steps

- Bundle the UI component for production use in the widget HTML
- Add more complex widget interactions
- Implement additional tools and widgets
- Customize the widget styling and behavior

