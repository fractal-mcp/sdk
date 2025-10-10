/**
 * HTTP transport helpers for SSE
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export type SessionRecord = {
  server: McpServer;
  transport: SSEServerTransport;
};

export type OpenAIWidgetHttpServerOptions = {
  /** Port to listen on (default: 8000) */
  port?: number;
  /** Path for SSE endpoint (default: "/mcp") */
  ssePath?: string;
  /** Path for POST messages (default: "/mcp/messages") */
  postPath?: string;
  /** Enable CORS (default: true) */
  enableCors?: boolean;
  /** Factory function to create a new McpServer for each session */
  serverFactory: () => McpServer;
};

/**
 * Create an HTTP server with SSE transport for OpenAI widgets.
 * Similar to the mcp-express makeExpressRoutes but for SSE transport.
 */
export function createOpenAIWidgetHttpServer(
  options: OpenAIWidgetHttpServerOptions
): ReturnType<typeof createServer> {
  const {
    port = 8000,
    ssePath = "/mcp",
    postPath = "/mcp/messages",
    enableCors = true,
    serverFactory
  } = options;

  console.log(`[createOpenAIWidgetHttpServer] Creating server with options:`, {
    port,
    ssePath,
    postPath,
    enableCors
  });

  const sessions = new Map<string, SessionRecord>();

  async function handleSseRequest(res: ServerResponse) {
    console.log(`[handleSseRequest] New SSE connection request`);
    
    if (enableCors) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      console.log(`[handleSseRequest] CORS headers set`);
    }

    console.log(`[handleSseRequest] Creating server via factory`);
    const server = serverFactory();
    console.log(`[handleSseRequest] Server created, creating SSE transport`);
    
    const transport = new SSEServerTransport(postPath, res);
    const sessionId = transport.sessionId;
    console.log(`[handleSseRequest] SSE transport created with sessionId: ${sessionId}`);

    sessions.set(sessionId, { server, transport });
    console.log(`[handleSseRequest] Session stored. Total sessions: ${sessions.size}`);

    transport.onclose = async () => {
      console.log(`[handleSseRequest] Session ${sessionId} closed, cleaning up`);
      sessions.delete(sessionId);
      await server.close();
      console.log(`[handleSseRequest] Session ${sessionId} cleanup complete. Remaining sessions: ${sessions.size}`);
    };

    transport.onerror = (error) => {
      console.error(`[handleSseRequest] SSE transport error for session ${sessionId}:`, error);
    };

    try {
      console.log(`[handleSseRequest] Connecting server to transport for session ${sessionId}`);
      await server.connect(transport);
      console.log(`[handleSseRequest] Server successfully connected to transport for session ${sessionId}`);
    } catch (error) {
      sessions.delete(sessionId);
      console.error(`[handleSseRequest] Failed to start SSE session ${sessionId}:`, error);
      if (!res.headersSent) {
        res.writeHead(500).end("Failed to establish SSE connection");
      }
    }
  }

  async function handlePostMessage(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL
  ) {
    console.log(`[handlePostMessage] POST request received`);
    
    if (enableCors) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
    }

    const sessionId = url.searchParams.get("sessionId");
    console.log(`[handlePostMessage] Session ID from request: ${sessionId}`);

    if (!sessionId) {
      console.warn(`[handlePostMessage] Missing sessionId query parameter`);
      res.writeHead(400).end("Missing sessionId query parameter");
      return;
    }

    const session = sessions.get(sessionId);

    if (!session) {
      console.warn(`[handlePostMessage] Unknown session: ${sessionId}. Active sessions: ${Array.from(sessions.keys()).join(', ')}`);
      res.writeHead(404).end("Unknown session");
      return;
    }

    console.log(`[handlePostMessage] Processing message for session ${sessionId}`);
    try {
      await session.transport.handlePostMessage(req, res);
      console.log(`[handlePostMessage] Message processed successfully for session ${sessionId}`);
    } catch (error) {
      console.error(`[handlePostMessage] Failed to process message for session ${sessionId}:`, error);
      if (!res.headersSent) {
        res.writeHead(500).end("Failed to process message");
      }
    }
  }

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    console.log(`[httpServer] ${req.method} ${req.url}`);
    
    if (!req.url) {
      console.warn(`[httpServer] Request missing URL`);
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    // Handle CORS preflight
    if (enableCors && req.method === "OPTIONS" && (url.pathname === ssePath || url.pathname === postPath)) {
      console.log(`[httpServer] Handling CORS preflight for ${url.pathname}`);
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type"
      });
      res.end();
      return;
    }

    // Handle SSE endpoint
    if (req.method === "GET" && url.pathname === ssePath) {
      console.log(`[httpServer] Routing to SSE handler`);
      await handleSseRequest(res);
      return;
    }

    // Handle POST messages
    if (req.method === "POST" && url.pathname === postPath) {
      console.log(`[httpServer] Routing to POST message handler`);
      await handlePostMessage(req, res, url);
      return;
    }

    console.warn(`[httpServer] No handler for ${req.method} ${url.pathname}`);
    res.writeHead(404).end("Not Found");
  });

  httpServer.on("clientError", (err: Error, socket) => {
    console.error("[httpServer] HTTP client error:", err);
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  console.log(`[createOpenAIWidgetHttpServer] HTTP server created successfully`);
  return httpServer;
}

/**
 * Start an OpenAI widget HTTP server and listen on the specified port.
 * This is a convenience wrapper around createOpenAIWidgetHttpServer.
 */
export function startOpenAIWidgetHttpServer(
  options: OpenAIWidgetHttpServerOptions
): ReturnType<typeof createServer> {
  const { port = 8000, ssePath = "/mcp", postPath = "/mcp/messages" } = options;
  
  console.log(`[startOpenAIWidgetHttpServer] Starting server on port ${port}`);
  const httpServer = createOpenAIWidgetHttpServer(options);

  httpServer.listen(port, () => {
    console.log(`[startOpenAIWidgetHttpServer] ✅ OpenAI Widget MCP server listening on http://localhost:${port}`);
    console.log(`[startOpenAIWidgetHttpServer]   SSE stream: GET http://localhost:${port}${ssePath}`);
    console.log(`[startOpenAIWidgetHttpServer]   Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`);
  });

  httpServer.on("error", (err) => {
    console.error(`[startOpenAIWidgetHttpServer] Server error:`, err);
  });

  return httpServer;
}

