import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { URL } from "url";

class MCPIntrospectionClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport | null = null;

  constructor(serverName: string = "introspection-client") {
    this.client = new Client({ 
      name: `mcp-${serverName}`, 
      version: "1.0.0" 
    });
  }

  async connectToServer(serverUrl: string) {
    const url = new URL(serverUrl);
    
    try {
      this.transport = new StreamableHTTPClientTransport(url);
      await this.client.connect(this.transport);
      return true;
    } catch (e) {
      console.log("Failed to connect to MCP server:", e);
      throw e;
    }
  }

  async listTools() {
    try {
      const toolsResult = await this.client.listTools();
      return toolsResult.tools;
    } catch (error) {
      console.log(`Tools not supported by the server (${error})`);
      return [];
    }
  }

  async cleanup() {
    await this.client.close();
  }
}

/**
 * Returns a json schema for the tools on an MCP server using proper MCP client
 * @param serverUrl 
 * @returns 
 */
export async function introspectServerUrl(serverUrl: string) {
    const client = new MCPIntrospectionClient("introspection");
    
    try {
        await client.connectToServer(serverUrl);
        const tools = await client.listTools();
        await client.cleanup();
        return tools;
    } catch (error) {
        await client.cleanup();
        throw error;
    }
}