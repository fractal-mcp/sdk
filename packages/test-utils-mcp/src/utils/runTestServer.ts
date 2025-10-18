import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer as createHttpServer, type IncomingMessage, type Server } from "node:http";
import { URL } from "node:url";

import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createHelloMcpServer } from "../examples/hello/index.js";

export const SSE_STREAM_PATH = "/sse";
export const SSE_POST_PATH = "/sse/messages";
export const STREAMABLE_PATH = "/stream";

export type McpServerFactory = () => McpServer;

export interface TestServerHandle {
  url: string;
  close(): Promise<void>;
}

function isInitializeRequest(payload: unknown): boolean {
  const check = (value: unknown) => InitializeRequestSchema.safeParse(value).success;
  if (Array.isArray(payload)) {
    return payload.some(check);
  }
  return check(payload);
}

async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) {
    return undefined;
  }
  return JSON.parse(text);
}

async function listen(server: Server): Promise<number> {
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object" && "port" in address, "Server did not provide a port");
  return (address as { port: number }).port;
}

export async function runTestServer(factory: McpServerFactory = createHelloMcpServer): Promise<TestServerHandle> {
  const server = factory();
  const sseTransports = new Map<string, SSEServerTransport>();
  const streamTransports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createHttpServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === SSE_STREAM_PATH) {
      const transport = new SSEServerTransport(SSE_POST_PATH, res);
      const sessionId = transport.sessionId;
      sseTransports.set(sessionId, transport);

      transport.onclose = async () => {
        sseTransports.delete(sessionId);
      };
      transport.onerror = (error) => {
        console.error("[SSE transport]", error);
      };

      await server.connect(transport);
      return;
    }

    if (req.method === "POST" && url.pathname === SSE_POST_PATH) {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        res.writeHead(400).end("Missing sessionId");
        return;
      }
      const transport = sseTransports.get(sessionId);
      if (!transport) {
        res.writeHead(404).end("Session not found");
        return;
      }
      const body = await parseJsonBody(req);
      await transport.handlePostMessage(req, res, body);
      return;
    }

    if (url.pathname === STREAMABLE_PATH) {
      if (req.method === "POST") {
        const body = await parseJsonBody(req);
        const sessionIdHeader = req.headers["mcp-session-id"];
        const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;

        if (sessionId && streamTransports.has(sessionId)) {
          const transport = streamTransports.get(sessionId)!;
          await transport.handleRequest(req, res, body);
          return;
        }

        if (!sessionId && isInitializeRequest(body)) {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: async (session) => {
              streamTransports.set(session, transport);
            },
            onsessionclosed: async (session) => {
              streamTransports.delete(session);
            }
          });

          transport.onclose = async () => {
            if (transport.sessionId) {
              streamTransports.delete(transport.sessionId);
            }
          };
          transport.onerror = (error) => {
            console.error("[Streamable HTTP transport]", error);
          };

          await server.connect(transport);
          await transport.handleRequest(req, res, body);
          if (transport.sessionId) {
            streamTransports.set(transport.sessionId, transport);
          }
          return;
        }

        res.writeHead(400).end("Bad Request");
        return;
      }

      if (req.method === "GET" || req.method === "DELETE") {
        const sessionIdHeader = req.headers["mcp-session-id"];
        const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
        if (!sessionId) {
          res.writeHead(400).end("Missing mcp-session-id header");
          return;
        }
        const transport = streamTransports.get(sessionId);
        if (!transport) {
          res.writeHead(404).end("Session not found");
          return;
        }
        await transport.handleRequest(req, res);
        return;
      }
    }

    res.writeHead(404).end("Not Found");
  });

  httpServer.on("clientError", (err, socket) => {
    console.error("[Test HTTP server] client error", err);
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  httpServer.listen(0);
  const port = await listen(httpServer);
  const baseUrl = new URL(`http://127.0.0.1:${port}/`);

  return {
    url: baseUrl.toString(),
    async close() {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await server.close().catch(() => undefined);
    }
  };
}
