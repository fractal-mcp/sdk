import assert from "node:assert";

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type HelloTestClient = Pick<Client, "listTools" | "callTool">;

type ToolListResult = Awaited<ReturnType<HelloTestClient["listTools"]>>;

function assertHasSayHelloTool(result: ToolListResult): void {
  const { tools } = result as { tools?: Array<Record<string, unknown>> };
  assert(Array.isArray(tools), "Expected tool list to be an array");
  const toolNames = tools.map((tool) => tool?.name).filter((name): name is string => typeof name === "string");
  assert(
    toolNames.includes("sayHello"),
    `Expected sayHello tool to be present, got: ${toolNames.join(", ")}`
  );
}

function assertHelloResponse(result: CallToolResult): void {
  const { content } = result;
  assert(Array.isArray(content), "Expected tool result content to be an array");
  assert(content.length > 0, "Expected tool result content to include a text item");
  const first = content[0];
  assert(first && typeof first === "object" && !Array.isArray(first), "Expected tool result content to be an object");
  const { type, text } = first as { type?: unknown; text?: unknown };
  assert.strictEqual(type, "text", "Expected tool result content type to be text");
  assert.strictEqual(text, "Hello from the test MCP server!", "Unexpected tool response text");
}

export async function testHelloMcpServerBasicOperations(client: HelloTestClient): Promise<void> {
  const toolList = await client.listTools();
  assertHasSayHelloTool(toolList);
  const sayHelloResult = (await client.callTool({
    name: "sayHello",
    arguments: {}
  })) as CallToolResult;
  assertHelloResponse(sayHelloResult);
}
