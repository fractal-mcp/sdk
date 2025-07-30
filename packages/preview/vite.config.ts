// Import MCP SDK dynamically (server-side)
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3100";

// @ts-ignore
const mcpProxyPlugin = () => {
  return {
    name: 'mcp-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const { serverUrl, toolName, arguments: toolArgs } = JSON.parse(body);
            const baseUrl = serverUrl || MCP_SERVER_URL;
            console.log(`[Vite Proxy] Calling MCP tool: ${toolName} on ${baseUrl}`);
            console.log(`[Vite Proxy] Tool arguments:`, JSON.stringify(toolArgs, null, 2));

            const client = new Client({ name: 'fractal-mcp-client', version: '1.0.0' });
            const transport = new StreamableHTTPClientTransport(new URL(baseUrl.replace(/\/?$/, '/mcp')));
            await client.connect(transport);

            const toolCallRequest = {
              name: toolName,
              arguments: toolArgs || {},
            };
            const result = await client.callTool(toolCallRequest);

            let parsedResult: unknown;
            try {
              parsedResult = JSON.parse(result.content[0].text);
            } catch (parseErr) {
              console.error('[Vite Proxy] Failed to parse MCP result:', parseErr);
              parsedResult = result;
            }

            await client.close();

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ result: parsedResult }));

          } catch (error) {
            console.error('[Vite Proxy] MCP call failed:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error'
            }));
          }
        });
      });

      server.middlewares.use('/api/list-tools', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const { serverUrl } = JSON.parse(body);
            const baseUrl = serverUrl || MCP_SERVER_URL;
            console.log(`[Vite Proxy] Listing tools on ${baseUrl}`);

            const client = new Client({ name: 'fractal-mcp-client', version: '1.0.0' });
            const transport = new StreamableHTTPClientTransport(new URL(baseUrl.replace(/\/?$/, '/mcp')));
            await client.connect(transport);

            const toolsResult = await client.listTools();
            const tools = Array.isArray(toolsResult.tools) ? toolsResult.tools : [];

            const detailedTools: any[] = [];
            for (const t of tools) {
              try {
                const detail = await (client as any).introspectTool({ name: t.name });
                detailedTools.push({ ...t, ...detail });
              } catch {
                detailedTools.push(t);
              }
            }

            await client.close();

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ tools: detailedTools }));

          } catch (error) {
            console.error('[Vite Proxy] Listing tools failed:', error);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error'
            }));
          }
        });
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  // @ts-ignore
  plugins: [react(), mcpProxyPlugin()],
  server: {
    port: 3000,
    host: true
  },
  copyPublicDir: false
})