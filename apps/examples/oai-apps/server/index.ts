import { 
  McpServer, 
  registerOpenAIWidget, 
  startOpenAIWidgetHttpServer 
} from "@fractal-mcp/oai-server";
import { bundleReactComponent } from "@fractal-mcp/bundle";
import { resolve } from "path";
import { readFile } from "fs/promises";
import { z } from "zod";

// Create a simple MCP server with async initialization
const createServer = async () => {
  const server = new McpServer({
    name: "example-oai-server",
    version: "1.0.0"
  });

  // Bundle the React component
  console.log("Bundling widget UI...");
  const bundleOutDir = resolve(__dirname, '../ui/bundle');
  await bundleReactComponent({
    entrypoint: resolve(__dirname, '../ui/Component.tsx'),
    out: bundleOutDir,
    output: {
      type: 'html',
      inline: { js: true, css: true },
      rootOnly: true
    }
  });
  
  // Read the bundled HTML file
  const widgetHtml = await readFile(resolve(bundleOutDir, 'index.html'), 'utf-8');
  console.log("Widget UI bundled successfully!", widgetHtml.substring(0,100));

  // Register a simple widget
  registerOpenAIWidget(
    server,
    {
      id: "hello-widget",
      title: "Hello Widget",
      templateUri: "ui://widget/hello",
      invoking: "Creating hello widget...",
      invoked: "Hello widget created",
      html: widgetHtml,
      responseText: "Widget displayed successfully",
      inputSchema: z.object({
        name: z.string().describe("Name to greet")
      }),
      description: "A simple hello widget"
    },
    async (args) => {
      return {
        content: [
          {
            type: "text",
            text: `Hello, ${args.name}!`
          }
        ],
        structuredContent: {
          name: args.name,
          timestamp: new Date().toISOString()
        }
      };
    }
  );

  return server;
};

// Start the HTTP server with SSE transport
startOpenAIWidgetHttpServer({
  port: 8001,
  serverFactory: createServer
});

console.log("OpenAI widget server starting on http://localhost:8001");

