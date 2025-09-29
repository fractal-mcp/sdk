import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import  { makeExpressRoutes, defaultCorsMiddleware } from "@fractal-mcp/mcp-express";
import { createUIResource } from "@mcp-ui/server";

const FRONTEND_URL = "http://localhost:5175";

async function startServer(port: number = 3001) {
    const app = express();
    const server = new McpServer({ name: 'my-server', version: '1.0.0' });
    
    server.registerTool('hello', {
        title: 'Hello',
        description: 'Simple hello world tool',
        inputSchema: {
            name: z.string().describe('Name to say hello to'),
        },
      }, async ({ name }: { name: string }) => {
        // Create the UI resource to be returned to the client (this is the only part specific to MCP-UI)
        const uiResource = createUIResource({
          uri: 'ui://hello',
          content: { type: 'externalUrl', iframeUrl:  `${FRONTEND_URL}/hello` },
          encoding: 'text',
          uiMetadata: {
            'initial-render-data': { name },
          },
        });
  
        return {
          content: [uiResource],
        };
      });

    server.registerTool('goodbye', {
      title: 'Goodbye',
      description: 'Simple goodbye world tool',
      inputSchema: {
        name: z.string().describe('Name to say goodbye to'),
      },
    }, async ({ name }: { name: string }) => {
      const uiResource = createUIResource({
        uri: 'ui://goodbye',
        content: { type: 'externalUrl', iframeUrl:  `${FRONTEND_URL}/goodbye` },
        encoding: 'text',
        uiMetadata: {
          'initial-render-data': { name },
        },
      });
      return {
        content: [uiResource],
      };
    });
    
    app.use(express.json({ limit: '50mb' }));
    app.use(defaultCorsMiddleware);
    makeExpressRoutes(app, server);
    console.log(`Server started on port ${port}`);
    app.listen(3000);
}

startServer(3000);