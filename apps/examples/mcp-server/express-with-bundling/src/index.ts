import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeExpressRoutes, defaultCorsMiddleware } from "@fractal-mcp/mcp-express";
import { createUIResource } from "@mcp-ui/server";
import { bundleReactComponent } from "@fractal-mcp/bundle";
import { readFile } from "fs/promises";
import { resolve, join } from "path";

async function startServer(port: number = 3000) {
  const app = express();
  const server = new McpServer({ name: 'bundling-server', version: '1.0.0' });

  // Bundle the Hello component on server start
  console.log('Bundling Hello component...');
  const helloComponentPath = resolve(
    process.cwd(),
    '../../mcp-ui/hello-example-react/src/Hello.tsx'
  );
  const bundleOutputDir = resolve(process.cwd(), './bundled');

  try {
    await bundleReactComponent({
      entrypoint: helloComponentPath,
      out: bundleOutputDir
    });
    console.log('✓ Hello component bundled successfully');
  } catch (error) {
    console.error('Failed to bundle Hello component:', error);
    process.exit(1);
  }

  // Read the bundled HTML file
  const bundledHtmlPath = join(bundleOutputDir, 'index.html');

  server.registerTool('hello', {
    title: 'Hello',
    description: 'Shows a greeting UI with bundled React component',
    inputSchema: {
      name: z.string().describe('Name to say hello to'),
    },
  }, async ({ name }: { name: string }) => {
    // Read the bundled HTML
    const htmlString = await readFile(bundledHtmlPath, 'utf-8');

    // Create UI resource using rawHtml type
    const uiResource = createUIResource({
      uri: 'ui://hello',
      content: { type: 'rawHtml', htmlString },
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
    description: 'Shows a goodbye message',
    inputSchema: {
      name: z.string().describe('Name to say goodbye to'),
    },
  }, async ({ name }: { name: string }) => {
    // For goodbye, we'll also use the same bundled component
    const htmlString = await readFile(bundledHtmlPath, 'utf-8');

    const uiResource = createUIResource({
      uri: 'ui://goodbye',
      content: { type: 'rawHtml', htmlString },
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
  app.listen(port);
}

startServer(3000);
