/*
 * Example: Pizzaz Widgets MCP Server
 * 
 * This example demonstrates how to use the @fractal-mcp/oai-server SDK
 * to create an MCP server with OpenAI widget support.
 */

import { z } from "zod";
import {
  McpServer,
  registerOpenAIWidget,
  startOpenAIWidgetHttpServer
} from "./index";

// Define input schema for the pizza widgets
const pizzaInputSchema = z.object({
  pizzaTopping: z.string().describe("Topping to mention when rendering the widget.")
})

// Create and configure the server
function createPizzazServer(): McpServer {
  const server = new McpServer({ name: "pizzaz-node", version: "0.1.0" });

  // Register pizza-map widget
  registerOpenAIWidget(
    server,
    {
      id: "pizza-map",
      title: "Show Pizza Map",
      templateUri: "ui://widget/pizza-map.html",
      invoking: "Hand-tossing a map",
      invoked: "Served a fresh map",
      html: `
<div id="pizzaz-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-0038.js"></script>
      `.trim(),
      responseText: "Rendered a pizza map!",
      inputSchema: pizzaInputSchema
    },
    async (args) => ({
      content: [
        { type: "text" as const, text: `Rendered a pizza map with ${args.pizzaTopping} topping!` }
      ],
      structuredContent: { pizzaTopping: args.pizzaTopping }
    })
  );

  // Register pizza-carousel widget
  registerOpenAIWidget(
    server,
    {
      id: "pizza-carousel",
      title: "Show Pizza Carousel",
      templateUri: "ui://widget/pizza-carousel.html",
      invoking: "Carousel some spots",
      invoked: "Served a fresh carousel",
      html: `
<div id="pizzaz-carousel-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-carousel-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-carousel-0038.js"></script>
      `.trim(),
      responseText: "Rendered a pizza carousel!",
      inputSchema: pizzaInputSchema
    },
    async (args) => ({
      content: [
        { type: "text" as const, text: `Rendered a pizza carousel with ${args.pizzaTopping} topping!` }
      ],
      structuredContent: { pizzaTopping: args.pizzaTopping }
    })
  );

  // Register pizza-albums widget
  registerOpenAIWidget(
    server,
    {
      id: "pizza-albums",
      title: "Show Pizza Album",
      templateUri: "ui://widget/pizza-albums.html",
      invoking: "Hand-tossing an album",
      invoked: "Served a fresh album",
      html: `
<div id="pizzaz-albums-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-albums-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-albums-0038.js"></script>
      `.trim(),
      responseText: "Rendered a pizza album!",
      inputSchema: pizzaInputSchema
    },
    async (args) => ({
      content: [
        { type: "text" as const, text: `Rendered a pizza album with ${args.pizzaTopping} topping!` }
      ],
      structuredContent: { pizzaTopping: args.pizzaTopping }
    })
  );

  // Register pizza-list widget
  registerOpenAIWidget(
    server,
    {
      id: "pizza-list",
      title: "Show Pizza List",
      templateUri: "ui://widget/pizza-list.html",
      invoking: "Hand-tossing a list",
      invoked: "Served a fresh list",
      html: `
<div id="pizzaz-list-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-list-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-list-0038.js"></script>
      `.trim(),
      responseText: "Rendered a pizza list!",
      inputSchema: pizzaInputSchema
    },
    async (args) => ({
      content: [
        { type: "text" as const, text: `Rendered a pizza list with ${args.pizzaTopping} topping!` }
      ],
      structuredContent: { pizzaTopping: args.pizzaTopping }
    })
  );

  // Register pizza-video widget
  registerOpenAIWidget(
    server,
    {
      id: "pizza-video",
      title: "Show Pizza Video",
      templateUri: "ui://widget/pizza-video.html",
      invoking: "Hand-tossing a video",
      invoked: "Served a fresh video",
      html: `
<div id="pizzaz-video-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-video-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-video-0038.js"></script>
      `.trim(),
      responseText: "Rendered a pizza video!",
      inputSchema: pizzaInputSchema
    },
    async (args) => ({
      content: [
        { type: "text" as const, text: `Rendered a pizza video with ${args.pizzaTopping} topping!` }
      ],
      structuredContent: { pizzaTopping: args.pizzaTopping }
    })
  );

  return server;
}

// Start the HTTP server
const portEnv = Number(process.env.PORT ?? 8001);
const port = Number.isFinite(portEnv) ? portEnv : 8001;

startOpenAIWidgetHttpServer({
  port,
  serverFactory: createPizzazServer
});
