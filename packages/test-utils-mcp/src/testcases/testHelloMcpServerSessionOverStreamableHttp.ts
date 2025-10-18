import assert from "node:assert";
import { randomUUID } from "node:crypto";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { STREAMABLE_PATH } from "../utils/runTestServer.js";
import { getBooleanField, getStringField, getValueField, resolveBaseUrl } from "./helpers.js";

export async function testHelloMcpServerSessionOverStreamableHttp(serverUrl: string | URL): Promise<void> {
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
