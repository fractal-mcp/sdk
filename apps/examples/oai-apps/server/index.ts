import { 
  McpServer, 
  registerOpenAIWidget, 
  startOpenAIWidgetHttpServer
} from "@fractal-mcp/oai-server";
import { bundleJSEntrypoint, bundleReactComponent } from "@fractal-mcp/bundle";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFile } from "fs/promises";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a simple MCP server with async initialization
const createMcpServer = async () => {
  const server = new McpServer({
    name: "example-oai-server",
    version: "1.0.0"
  });

  // Bundle the React component with EVERYTHING INLINED
  console.log("Bundling widget UI with inline assets...");
  const bundleOutDir = resolve(__dirname, '../ui/bundle');
  // await bundleReactComponent({
  //   entrypoint: resolve(__dirname, '../ui/Component.tsx'),
  //   out: bundleOutDir,
  //   output: {
  //     type: 'html',
  //     inline: { js: true, css: true },
  //     rootOnly: false  // Just the snippet, no <html> wrapper
  //   }
  // });
  
  // Read the fully inlined HTML
  const widgetHtml = await readFile(resolve(bundleOutDir, 'index.html'), 'utf-8');
  console.log(`Widget UI bundled! Size: ${widgetHtml.length} bytes`);

  const widgetHtml2 =`
<div id="root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-albums-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-albums-0038.js"></script>
`
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
  serverFactory: createMcpServer
});

console.log("OpenAI widget server starting on http://localhost:8001");
