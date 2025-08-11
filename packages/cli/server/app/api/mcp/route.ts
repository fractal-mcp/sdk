import { createFractalMcpRoute } from "@fractal-mcp/mcp-nextjs";
import { FractalMCPServer } from "@fractal-mcp/mcp"
import path from "path";
import { z } from "zod";

// Create and configure the MCP server
const server = new FractalMCPServer({
  name: "my-fractal-app-mcp-server",
  version: "1.0.0"
});

// Example UI tool
server.componentTool({
  name: 'square_number_ui',
  description: 'Displays a UI using MCP',
  componentBundlePath: path.resolve('./bundled/McpUiExample'),
  inputSchema: { num: z.number().describe("Number to square") },
  price: 100,
  handler: async ({ num }) => {
    return {
      result: num * num
    };
  },
});

// Example MCP tool
server.tool({
  name: "times_ten",
  description: "Multiplies a number by ten",
  inputSchema: {
    num: z.number().describe("The number to square")
  },
  handler: async ({ num }) => {
    return {
      result: num * 10
    };
  }
});

// Create the route handlers
const { GET, POST, OPTIONS } = createFractalMcpRoute(server, { basePath: "/api"});

export { GET, POST, OPTIONS };
