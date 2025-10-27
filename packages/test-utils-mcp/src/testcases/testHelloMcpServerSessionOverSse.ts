import assert from "node:assert";
import { randomUUID } from "node:crypto";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { SSE_STREAM_PATH } from "../utils/runTestServer.js";
import { getBooleanField, getStringField, getValueField, resolveBaseUrl } from "./helpers.js";

export async function testHelloMcpServerSessionOverSse(serverUrl: string | URL): Promise<void> {
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
