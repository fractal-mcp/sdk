# @fractal-mcp/test-utils-mcp

Utilities for exercising Model Context Protocol (MCP) transports and session lifecycles.
Use the exported helpers to validate that a server exposed on your own infrastructure
can accept connections, invoke tools, and preserve session state.

## Installation

```bash
npm install --save-dev @fractal-mcp/test-utils-mcp
```

## Connectivity checks

Use the connectivity test cases against any MCP endpoint you are serving. Each helper
returns a `Promise` that resolves when the server behaves as expected and throws when it
fails. They can be embedded in any test runner (Jest, Vitest, Mocha, etc.) or executed as
part of bespoke scripts.

```ts
import {
  testMcpServerCanHandleSSE,
  testMcpServerCanHandleStreamableHttp,
} from "@fractal-mcp/test-utils-mcp";

// Validate SSE transport
await testMcpServerCanHandleSSE("http://localhost:3000");

// Validate streamable HTTP transport
await testMcpServerCanHandleStreamableHttp("http://localhost:3000");
```

The utilities expect your server to expose the standard MCP endpoints relative to the
provided base URL:

- `GET /sse` and `POST /sse/messages` for Server-Sent Events
- `POST /stream`, plus optional `GET /stream` and `DELETE /stream`, for streamable HTTP

## Session checks

To confirm that your server can initialize and reuse sessions, run the session-oriented
examples. They confirm that a `sayHello` tool maintains conversational state over both
transport types.

```ts
import {
  testHelloMcpServerSessionOverSse,
  testHelloMcpServerSessionOverStreamableHttp,
} from "@fractal-mcp/test-utils-mcp";

await testHelloMcpServerSessionOverSse("http://localhost:3000");
await testHelloMcpServerSessionOverStreamableHttp("http://localhost:3000");
```

## Tool invocation checks

When you only need to validate that a server exposes the `sayHello` tool and can invoke
it successfully, use the basic operations helper. This exercises tool discovery and a
single JSON-RPC call without asserting any session behavior.

```ts
import { testHelloMcpServerBasicOperations } from "@fractal-mcp/test-utils-mcp";

await testHelloMcpServerBasicOperations(client);
```

## Local example servers

The package also exports MCP server factories so you can host known-good servers using
whichever serving stack you are validating (custom transports, proxies, deployment
pipelines, etc.).

- `createHelloMcpServer` – exercises minimal tool invocation over SSE and streamable HTTP.
- `createSessionMcpServer` – demonstrates session initialization and structured responses.

Wrap one of these factories with your own hosting code, then point the connectivity or
session tests at the resulting URL to verify the entire serving path end-to-end.

## Test harness helper

For ad-hoc validation without a custom host, use `runTestServer` to start a Node.js HTTP
server around any MCP factory:

```ts
import { createHelloMcpServer, runTestServer } from "@fractal-mcp/test-utils-mcp";

const { url, close } = await runTestServer(createHelloMcpServer);
try {
  await testMcpServerCanHandleSSE(url);
} finally {
  await close();
}
```

This spins up the server with both transports enabled, returning the base URL and a method
to dispose of the server when finished.
