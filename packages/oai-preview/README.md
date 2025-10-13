# @fractal-mcp/oai-preview

> ⚠️ **Development/Testing Tool Only** - Use this in your mcp preview applications, but NOT in your chats.

React component for previewing and testing OpenAI Apps SDK widgets during development.

## Installation

```bash
npm install --save-dev @fractal-mcp/oai-preview
```

## Usage

```tsx
import { WidgetDisplayComponent } from "@fractal-mcp/oai-preview";

function WidgetPreview() {
  const htmlSnippet = `
    <div id="root"></div>
    <script>
      const root = document.getElementById("root");
      root.innerHTML = '<h1>Hello Widget</h1>';
    </script>
  `;

  return (
    <WidgetDisplayComponent
      htmlSnippet={htmlSnippet}
      toolInput={{ name: "World" }}
      toolOutput={{ greeting: "Hello, World!" }}
      onToolCall={async (toolName, params) => {
        console.log("Tool called:", toolName, params);
        return { success: true };
      }}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `htmlSnippet` | `string` | Yes | The HTML snippet to render in an iframe |
| `toolInput` | `Record<string, any>` | No | Input args, available as `window.openai.toolInput` |
| `toolOutput` | `any` | No | Output data, available as `window.openai.toolOutput` |
| `toolId` | `string` | No | Unique ID for state persistence |
| `onToolCall` | `(name, params) => Promise<any>` | No | Called when widget calls `window.openai.callTool()` |
| `onSendFollowup` | `(message) => void` | No | Called when widget calls `window.openai.sendFollowupTurn()` |
| `onSetWidgetState` | `(state) => void` | No | Called when widget calls `window.openai.setWidgetState()` |
| `className` | `string` | No | CSS class for container |

## What It Does

The component:
- Renders your widget HTML in a sandboxed iframe
- Injects `window.openai` and `window.webplus` APIs
- Handles postMessage communication between iframe and parent
- Simulates the ChatGPT widget runtime

## Testing

```bash
npm test
```

Tests use Playwright to verify rendering, messaging, and data access.

## Credits

This package was built by studying and learning from:

- **[MCPJam Inspector](https://github.com/MCPJam/inspector)** - An excellent open-source MCP testing platform. We drew heavy inspiration from these specific implementations:
  - [`server/routes/mcp/resources.ts`](https://github.com/MCPJam/inspector/blob/main/server/routes/mcp/resources.ts) - Resource handling patterns
  - [`client/src/components/chat/openai-component-renderer.tsx`](https://github.com/MCPJam/inspector/blob/main/client/src/components/chat/openai-component-renderer.tsx) - Widget rendering and iframe communication

- **ChatGPT Widget Source Code** - OpenAI's widget runtime implementation provided invaluable insights into the `window.openai` API design

Special thanks to the MCPJam team for making their code open source and advancing the MCP ecosystem!

## License

MIT
