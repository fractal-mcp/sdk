import { URL } from "node:url";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function resolveBaseUrl(input: string | URL): URL {
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

export function getStringField(result: CallToolResult, key: string): string {
  const structured = getStructuredContent(result);
  const value = structured[key];
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Expected string field \"${key}\" in structured content`);
}

export function getBooleanField(result: CallToolResult, key: string): boolean {
  const structured = getStructuredContent(result);
  const value = structured[key];
  if (typeof value === "boolean") {
    return value;
  }
  throw new Error(`Expected boolean field \"${key}\" in structured content`);
}

export function getValueField(result: CallToolResult): unknown {
  const structured = getStructuredContent(result);
  return structured.value;
}
