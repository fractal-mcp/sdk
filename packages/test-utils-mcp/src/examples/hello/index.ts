import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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
