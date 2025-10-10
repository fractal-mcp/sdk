/**
 * @fractal-mcp/oai-server
 * 
 * OpenAI widget utilities for MCP server hosting.
 * 
 * Level 1: Core types and utilities (types.ts)
 * Level 2: Widget registration function (register.ts)
 * Level 3: HTTP transport helpers (http.ts)
 */

// Level 1: Types and utilities
export { type OpenAIWidget, type WidgetMeta, getWidgetMeta } from "./types.js";

// Level 2: Registration
export { registerOpenAIWidget, type WidgetToolHandler } from "./register.js";

// Level 3: HTTP helpers
export {
  createOpenAIWidgetHttpServer,
  startOpenAIWidgetHttpServer,
  type OpenAIWidgetHttpServerOptions,
  type SessionRecord
} from "./http.js";

// Re-export MCP SDK types for convenience
export { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

