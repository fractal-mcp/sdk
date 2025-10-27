import assert from "node:assert";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { STREAMABLE_PATH } from "../utils/runTestServer.js";
import { resolveBaseUrl } from "./helpers.js";

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
