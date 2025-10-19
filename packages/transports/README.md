# @fractal-mcp/transports

Custom transport implementations for running Model Context Protocol (MCP) servers in
browser-friendly environments.

## MessagePort JSON-RPC transport

`MessagePortRpcTransport` adapts the MCP JSON-RPC transport contract so that messages
flow over a [`MessagePort`](https://developer.mozilla.org/docs/Web/API/MessagePort).
This makes it possible to host MCP servers in SharedWorkers, WebWorkers, or iframes and
communicate with them from browser-based clients without a network hop.

### When to use it

Use this transport whenever the client and server can exchange messages over a
`MessageChannel`/`MessagePort` pair, for example when wiring [`mcp-anywhere`](https://github.com/modelcontextprotocol/mcp-anywhere)
into a browser shell or moving server logic into a worker thread.
It keeps the JSON-RPC surface identical to the official MCP transports while avoiding
node-specific primitives like sockets or stdio.

### Basic usage

```ts
import { MessageChannel } from "node:worker_threads";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { MessagePortRpcTransport } from "@fractal-mcp/transports";
import { createHelloMcpServer } from "@fractal-mcp/test-utils-mcp";

const channel = new MessageChannel();
const server = createHelloMcpServer();
const serverTransport = new MessagePortRpcTransport({ port: channel.port1 });
await server.connect(serverTransport);

const client = new Client({ name: "browser-client", version: "0.1.0" });
const clientTransport = new MessagePortRpcTransport({ port: channel.port2 });
await client.connect(clientTransport);

const tools = await client.listTools();
```

### Design notes

- The transport does not require `@modelcontextprotocol/sdk` at runtime. Only TypeScript
  type information is imported, so the compiled JavaScript stays dependency-free.
- `start()` automatically attaches message listeners and, by default, invokes
  `port.start()` so that both WebWorker and MessageChannel ports behave consistently.
- `send()` and `close()` guard against use-after-close scenarios and propagate errors
  through the standard MCP transport callbacks.
