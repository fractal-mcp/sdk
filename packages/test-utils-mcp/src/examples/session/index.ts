import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerSessionTools } from "../../server/sessionTools.js";

export function createSessionMcpServer(): McpServer {
  const server = new McpServer({
    name: "SessionTestMcpServer",
    version: "0.1.0"
  });

  registerSessionTools(server);
  return server;
}
