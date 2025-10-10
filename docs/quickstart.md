# Quickstart Guide

Get up and running with the Fractal OpenAI Apps SDK in minutes.

## Prerequisites

- **Node.js 22** (recommended, though it works with Node 18+)
- npm or your preferred package manager

## Installation

Install the required packages:

```bash
npm install @fractal-mcp/oai-hooks @fractal-mcp/oai-server zod
npm install -D @fractal-mcp/cli tailwindcss@next @tailwindcss/vite@next
```

## Create Your Widget Component

Create a `Component.tsx` file for your widget UI:

```tsx
// Component.tsx
import { useWidgetProps } from "@fractal-mcp/oai-hooks";
import "./styles.css";

interface WidgetProps {
  title: string;
  message: string;
}

export default function Component() {
  const props = useWidgetProps<WidgetProps>();
  
  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{props.title}</h2>
      <p className="text-gray-600">{props.message}</p>
    </div>
  );
}
```

## Add Tailwind Styles

Create a `styles.css` file:

```css
@import "tailwindcss";
```

That's it for Tailwind 4! No configuration file needed.

## Create Your MCP Server

Create a `server/index.ts` file:

```typescript
// server/index.ts
import { McpServer, registerOpenAIWidget, startOpenAIWidgetHttpServer } from "@fractal-mcp/oai-server";
import { z } from "zod";
import fs from "fs";

function createServer() {
  const server = new McpServer({ 
    name: "my-app", 
    version: "1.0.0" 
  });
  
  // Read the bundled widget HTML
  const widgetHtml = fs.readFileSync("./bundle/index.html", "utf-8");
  
  registerOpenAIWidget(
    server,
    {
      id: "my-widget",
      title: "My Widget",
      description: "A simple widget example",
      templateUri: "ui://widget/my-widget.html",
      invoking: "Loading...",
      invoked: "Widget loaded!",
      html: widgetHtml,
      responseText: "Here's your widget",
      inputSchema: z.object({
        title: z.string().describe("Widget title"),
        message: z.string().describe("Widget message")
      })
    },
    async (args) => ({
      content: [{ type: "text", text: `Widget: ${args.title}` }],
      structuredContent: { 
        title: args.title,
        message: args.message
      }
    })
  );
  
  return server;
}

startOpenAIWidgetHttpServer({
  port: 8000,
  serverFactory: createServer
});
```

`registerOpenAIWidget` takes care of registering your widgets tools and resources.

## Bundle Your Widget

Bundle your Component.tsx using the CLI:

```bash
npx @fractal-mcp/cli bundle --entrypoint=ui/Component.tsx --out=bundle --root-only --inline-js --inline-css
```

This creates `bundle/index.html` with your widget bundled as a single HTML file, including all your Tailwind styles.
The `--root-only` option tells the bundler to only output the html body rather than a full standalone html file.

## Set Up TypeScript Configuration

Create a `tsconfig.json` file in your project root:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./server",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["server/**/*"],
  "exclude": ["node_modules"]
}
```

## Start Your Server

Build your server code:

```bash
npx tsc
```

Then start it:

```bash
node dist/index.js
```

Your MCP server is now running at `http://localhost:8000`!

## Test Your Integration

Now you can test your widget in ChatGPT. Follow OpenAI's comprehensive testing guide:

👉 [OpenAI Apps SDK Testing Guide](https://developers.openai.com/apps-sdk/deploy/testing)

The guide covers:
- Using MCP Inspector for local debugging
- Connecting to ChatGPT in developer mode
- Testing via the API Playground
- Running through your regression checklist

## Next Steps

- Explore the [full documentation](../README.md) for advanced features
- Check out [oai-hooks](../packages/oai-hooks/README.md) for more React hooks
- Learn about [widget state management](../packages/oai-hooks/README.md#usewidgetstate)
- See complete [examples](../apps/examples)

