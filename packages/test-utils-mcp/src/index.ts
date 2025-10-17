import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer as createHttpServer, type IncomingMessage, type Server } from "node:http";
import { URL } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { InitializeRequestSchema, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { registerSessionTools } from "./server/sessionTools.js";

const SSE_STREAM_PATH = "/sse";
const SSE_POST_PATH = "/sse/messages";
const STREAMABLE_PATH = "/stream";

export type McpServerFactory = () => McpServer;

export function createHelloMcpServer(): McpServer {
  const server = new McpServer({
    name: "HelloTestMcpServer",
    version: "0.1.0"
  });

  server.registerTool(
    "sayHello",
    {
      title: "sayHello",
      description: "Return a friendly greeting"
    },
    async () => ({
      content: [
        {
          type: "text",
          text: "Hello from the test MCP server!"
        }
      ]
    })
  );

  return server;
}

export function createSessionMcpServer(): McpServer {
  const server = new McpServer({
    name: "SessionTestMcpServer",
    version: "0.1.0"
  });

  registerSessionTools(server);
  return server;
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

function resolveBaseUrl(input: string | URL): URL {
  if (input instanceof URL) {
    return input;
  }
  return new URL(input);
}

function getStructuredContent(result: CallToolResult): Record<string, unknown> {
  const { structuredContent } = result;
  if (structuredContent && typeof structuredContent === "object" && !Array.isArray(structuredContent)) {
    return structuredContent as Record<string, unknown>;
  }
  throw new Error("Expected structured content in tool result");
}

function getStringField(result: CallToolResult, key: string): string {
  const structured = getStructuredContent(result);
  const value = structured[key];
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Expected string field \"${key}\" in structured content`);
}

function getBooleanField(result: CallToolResult, key: string): boolean {
  const structured = getStructuredContent(result);
  const value = structured[key];
  if (typeof value === "boolean") {
    return value;
  }
  throw new Error(`Expected boolean field \"${key}\" in structured content`);
}

function getValueField(result: CallToolResult): unknown {
  const structured = getStructuredContent(result);
  return structured.value;
}

export interface TestServerHandle {
  url: string;
  close(): Promise<void>;
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

export async function testMcpServerCanHandleSSE(serverUrl: string | URL): Promise<void> {
  const baseUrl = resolveBaseUrl(serverUrl);
  const client = new Client({
    name: "SseTestClient",
    version: "0.1.0"
  });
  const transport = new SSEClientTransport(new URL(SSE_STREAM_PATH, baseUrl));
  await client.connect(transport);
  try {
    const result = await client.callTool({
      name: "sayHello",
      arguments: {}
    });
    assert(
      Array.isArray(result.content) && result.content.length > 0,
      "Expected greeting content from sayHello tool"
    );
  } finally {
    await client.close();
  }
}

export async function testMcpServerCanHandleStreamableHttp(serverUrl: string | URL): Promise<void> {
  const baseUrl = resolveBaseUrl(serverUrl);
  const client = new Client({
    name: "StreamableHttpTestClient",
    version: "0.1.0"
  });
  const transport = new StreamableHTTPClientTransport(new URL(STREAMABLE_PATH, baseUrl));
  await client.connect(transport);
  try {
    const result = await client.callTool({
      name: "sayHello",
      arguments: {}
    });
    assert(
      Array.isArray(result.content) && result.content.length > 0,
      "Expected greeting content from sayHello tool"
    );
  } finally {
    await client.close();
  }
}

export async function tesHelloMcpServerSessionOverSse(serverUrl: string | URL): Promise<void> {
  const baseUrl = resolveBaseUrl(serverUrl);
  const client = new Client({
    name: "SseSessionTestClient",
    version: "0.1.0"
  });
  const transport = new SSEClientTransport(new URL(SSE_STREAM_PATH, baseUrl));
  await client.connect(transport);
  try {
    const firstTagResult = (await client.callTool({
      name: "session.getTag",
      arguments: {}
    })) as CallToolResult;
    const firstTag = getStringField(firstTagResult, "tag");

    const storedValue = `value-${randomUUID()}`;
    const writeResult = (await client.callTool({
      name: "session.write",
      arguments: {
        key: "greeting",
        value: storedValue
      }
    })) as CallToolResult;
    const ok = getBooleanField(writeResult, "ok");
    assert.strictEqual(ok, true, "Expected session.write to confirm storage");

    const readResult = (await client.callTool({
      name: "session.read",
      arguments: {
        key: "greeting"
      }
    })) as CallToolResult;
    const readValue = getValueField(readResult);
    assert.strictEqual(readValue, storedValue, "Expected session.read to return stored value");

    const secondTagResult = (await client.callTool({
      name: "session.getTag",
      arguments: {}
    })) as CallToolResult;
    const secondTag = getStringField(secondTagResult, "tag");
    assert.strictEqual(secondTag, firstTag, "Expected session tag to remain stable within SSE session");
  } finally {
    await client.close();
  }
}

export async function tesHelloMcpServerSessionOverStreamableHttp(serverUrl: string | URL): Promise<void> {
  const baseUrl = resolveBaseUrl(serverUrl);
  const client = new Client({
    name: "StreamableSessionTestClient",
    version: "0.1.0"
  });
  const transport = new StreamableHTTPClientTransport(new URL(STREAMABLE_PATH, baseUrl));
  await client.connect(transport);
  let initialTag: string | undefined;
  try {
    const firstTagResult = (await client.callTool({
      name: "session.getTag",
      arguments: {}
    })) as CallToolResult;
    initialTag = getStringField(firstTagResult, "tag");

    const storedValue = `number-${randomUUID()}`;
    const writeResult = (await client.callTool({
      name: "session.write",
      arguments: {
        key: "counter",
        value: storedValue
      }
    })) as CallToolResult;
    const ok = getBooleanField(writeResult, "ok");
    assert.strictEqual(ok, true, "Expected session.write to confirm storage");

    const readResult = (await client.callTool({
      name: "session.read",
      arguments: {
        key: "counter"
      }
    })) as CallToolResult;
    const readValue = getValueField(readResult);
    assert.strictEqual(readValue, storedValue, "Expected session.read to return stored value");

    const secondTagResult = (await client.callTool({
      name: "session.getTag",
      arguments: {}
    })) as CallToolResult;
    const secondTag = getStringField(secondTagResult, "tag");
    assert.strictEqual(secondTag, initialTag, "Expected session tag to remain stable within Streamable HTTP session");
  } finally {
    await client.close().catch(() => undefined);
  }

  if (!initialTag) {
    throw new Error("Streamable HTTP session did not return an initial tag");
  }

  const newClient = new Client({
    name: "StreamableSessionTestClient",
    version: "0.1.0"
  });
  const newTransport = new StreamableHTTPClientTransport(new URL(STREAMABLE_PATH, baseUrl));
  await newClient.connect(newTransport);
  try {
    const newTagResult = (await newClient.callTool({
      name: "session.getTag",
      arguments: {}
    })) as CallToolResult;
    const newTag = getStringField(newTagResult, "tag");
    assert.notStrictEqual(newTag, initialTag, "Expected a new session to produce a different tag");

    const newReadResult = (await newClient.callTool({
      name: "session.read",
      arguments: {
        key: "counter"
      }
    })) as CallToolResult;
    const newReadValue = getValueField(newReadResult);
    assert.strictEqual(newReadValue, undefined, "Expected new session to have isolated storage");
  } finally {
    await newClient.close().catch(() => undefined);
  }
}
