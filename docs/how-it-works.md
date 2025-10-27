# How It Works

## The Big Picture

The Fractal SDK provides libraries for **every component of the ecosystem** needed to embed interactive UIs in chat applications. Here's how it works:

**MCP servers expose tools that can return widgets.** These widgets are rendered inside iframes by a client application (like ChatGPT or another chatbot) and are hydrated with data from the server.

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │  calls  │ MCP Server  │ returns │   Widget    │
│ (ChatGPT)   │────────>│    Tool     │────────>│  (iframe)   │
└─────────────┘         └─────────────┘         └─────────────┘
                                                        ↑
                                                        │
                                                   hydrated
                                                   with data
```

## The Ecosystem Landscape

Currently, the widget ecosystem has **limited library support**:

- **OpenAI** has provided excellent code examples and documentation, but **has not published any libraries** for building widgets
- **MCP-UI** has server and client support via `@mcpui/server` and `@mcpui/client`, but the [messaging protocol](https://mcpui.dev/guide/embeddable-ui) running inside the iframe **does not have library support**

**This is where Fractal SDK comes in.** We provide production-ready libraries to fill the gaps across the entire stack.

## Understanding the Architecture

There are **2 main protocols** in the ecosystem:

1. **OpenAI Apps** - The ChatGPT widget protocol
2. **MCP-UI** - The cross-iframe embeddable UI protocol

For each protocol, there are **5 key components**:

### 1. Server
The MCP server that exposes tools capable of returning widget UIs.

**Example:** Your Node.js server that handles tool calls and returns widget HTML.

### 2. Client
The chatbot or agent using the MCP server.

**Example:** ChatGPT, Claude, or any MCP client application.

### 3. Messenger
Runs **inside the iframe** and implements the iframe side of the messaging protocol. This handles communication between the widget and the client application.

**Example:** Code that sends messages from your widget to the parent window.

### 4. Renderer / Preview / Display
Runs on the **client's web application** and handles rendering widgets in iframes. This is the parent-side of the messaging protocol.

**Example:** The code in ChatGPT that creates iframes and displays your widgets.

### 5. React Hooks
Wherever there is a messaging protocol running inside the iframe, it's useful to define React hooks that implement it. This makes building widget UIs much easier.

**Example:** `useWidgetProps()`, `useWidgetState()` - hooks that abstract away the messaging protocol.

## Our Package Naming Convention

Need library support for a specific component on a specific platform? 

```bash
npm i @fractal-mcp/<platform>-<component>
```

**Done!**

### Examples

| Platform | Component | Package |
|----------|-----------|---------|
| `oai` (OpenAI) | `hooks` (React hooks) | `@fractal-mcp/oai-hooks` |
| `oai` (OpenAI) | `server` (MCP server) | `@fractal-mcp/oai-server` |
| `oai` (OpenAI) | `preview` (Display/renderer) | `@fractal-mcp/oai-preview` |
| `mcp-ui` (MCP-UI) | `hooks` (React hooks) | `@fractal-mcp/mcp-ui-hooks` |
| `mcp-ui` (MCP-UI) | `messenger` (Iframe messenger) | `@fractal-mcp/mcp-ui-messenger` |

### Complete Package Matrix

Here's what's available for each protocol:

| Component | OpenAI Apps | MCP-UI |
|-----------|-------------|---------|
| **Server** | `@fractal-mcp/oai-server` | `@mcpui/server` |
| **Client** | **UNSUPPORTED** | `@mcpui/client` |
| **Messenger** | **UNSUPPORTED** (documented by OpenAI) | `@fractal-mcp/mcp-ui-messenger` |
| **Display/Renderer** | `@fractal-mcp/oai-preview`* | *(built into `@mcpui/client`)* |
| **React Hooks** | `@fractal-mcp/oai-hooks` | `@fractal-mcp/mcp-ui-hooks` |

_*`oai-preview` is a development/testing tool, not for production use_

**Legend:**
- **Package name** = Library available
- ***(description)*** = Not needed or built into another component
- **UNSUPPORTED** = No library support available

### Utility Packages

We also provide cross-platform utilities:

- **`@fractal-mcp/bundle`** - Bundle React components into standalone HTML
- **`@fractal-mcp/cli`** - Command-line tools for bundling widgets
- **`@fractal-mcp/shared-ui`** - Low-level RPC layer for any iframe messaging

## Next Steps

- Follow the [OpenAI Apps SDK quickstart](./quickstart.md) to build your first widget
- Explore [package documentation](../README.md#package-details) for detailed API references
- Check out [examples](../apps/examples) to see complete implementations

