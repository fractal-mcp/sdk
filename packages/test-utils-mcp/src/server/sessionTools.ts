import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type SessionState = {
  sessionTag?: string;
  kv?: Record<string, unknown>;
};

type ExtraWithMetadata = {
  sessionId?: unknown;
  requestInfo?: {
    headers?: Record<string, unknown>;
  };
};

function resolveSessionId(extra: unknown): string {
  const withMetadata = extra as ExtraWithMetadata;
  const direct = withMetadata.sessionId;
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  if (typeof direct === "number" && Number.isFinite(direct)) {
    return String(direct);
  }

  const headerValue = withMetadata.requestInfo?.headers?.["mcp-session-id"];
  if (typeof headerValue === "string" && headerValue.length > 0) {
    return headerValue;
  }
  if (Array.isArray(headerValue) && headerValue.length > 0) {
    const first = headerValue[0];
    if (typeof first === "string" && first.length > 0) {
      return first;
    }
  }

  throw new Error("Session ID is not available for this request");
}

export function registerSessionTools(server: McpServer): void {
  const sessions = new Map<string, SessionState>();

  const getSessionState = (extra: unknown): SessionState => {
    const sessionId = resolveSessionId(extra);
    let state = sessions.get(sessionId);
    if (!state) {
      state = {};
      sessions.set(sessionId, state);
    }
    return state;
  };

  server.registerTool(
    "session.getTag",
    {
      title: "session.getTag",
      description: "Returns a stable opaque tag bound to the current MCP session.",
      inputSchema: {},
      outputSchema: { tag: z.string() }
    },
    async (_args, extra) => {
      const state = getSessionState(extra);
      if (!state.sessionTag) {
        state.sessionTag = randomUUID();
      }
      const tag = state.sessionTag;
      return {
        content: [
          {
            type: "text",
            text: `Session tag: ${tag}`
          }
        ],
        structuredContent: { tag }
      };
    }
  );

  server.registerTool(
    "session.write",
    {
      title: "session.write",
      description: "Write a key/value into session-scoped storage.",
      inputSchema: {
        key: z.string(),
        value: z.any()
      },
      outputSchema: { ok: z.boolean() }
    },
    async (input, extra) => {
      const state = getSessionState(extra);
      state.kv = state.kv ?? {};
      state.kv[input.key] = input.value;
      return {
        content: [
          {
            type: "text",
            text: `Stored value for key: ${input.key}`
          }
        ],
        structuredContent: { ok: true }
      };
    }
  );

  server.registerTool(
    "session.read",
    {
      title: "session.read",
      description: "Read a key from session-scoped storage.",
      inputSchema: {
        key: z.string()
      },
      outputSchema: { value: z.any().optional() }
    },
    async (input, extra) => {
      const state = getSessionState(extra);
      const value = state.kv?.[input.key];
      return {
        content: [
          {
            type: "text",
            text: value === undefined ? `No value for key: ${input.key}` : `Read value for key: ${input.key}`
          }
        ],
        structuredContent: { value }
      };
    }
  );
}
