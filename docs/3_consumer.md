# Consumer Documentation

**🎨 Building a chat application?**  
*"I am building a chat application and would like to provide rich visual experiences directly in chat!"*

This guide will help you integrate Fractal into your chat application to enable rich, interactive UI components powered by MCP servers.

## Overview

As a **Consumer** in the Fractal ecosystem, you're building a user-facing chat application that connects to Fractal's MCP proxy to display rich UI components. Instead of traditional text-only chat responses, your users will see interactive weather cards, charts, forms, and other visual components.

## Core Consumer Libraries

### @fractal-mcp/client
The main client library for connecting to Fractal's MCP proxy and accessing the tool registry.

**Key Features:**
- Connect to Fractal's MCP proxy
- Search and discover available tools
- Authenticate with consumer API keys
- Manage tool registry access

**Usage:**
```typescript
import { FractalSDK } from '@fractal-mcp/client';

const fractalClient = new FractalSDK({ 
  apiKey: process.env.FRACTAL_CONSUMER_KEY! 
});
await fractalClient.connect();
```

### @fractal-mcp/render
Handles rendering of Fractal components in your React application.

**Key Features:**
- Render interactive UI components from MCP responses
- Handle component events and user interactions
- Convert tool invocations to React components
- Manage component lifecycle

**Usage:**
```typescript
import { renderLayoutAsComponent, FractalFrameEvent } from '@fractal-mcp/render';

// Render components from tool invocations
const component = renderLayoutAsComponent(toolInvocation, handleFrameEvent);

// Handle events from interactive components
const handleFrameEvent = useCallback((event: FractalFrameEvent) => {
  append({
    role: 'data',
    content: JSON.stringify(event),
  })
}, [append]);
```

### @fractal-mcp/vercel-connector
Specialized connector for integrating with Vercel AI SDK and handling streaming responses.

**Key Features:**
- Seamless integration with Vercel AI SDK
- Stream handling for real-time responses
- Message processing and cleanup
- Event handling for component interactions

**Usage:**
```typescript
import { FractalVercel, cleanMessages } from '@fractal-mcp/vercel-connector';

const fractalVercel = new FractalVercel(fractalClient);
const tools = await fractalVercel.getTools();

// Handle data messages from component events
const wasHandled = await fractalVercel.handleDataMessage(messages, res);
```

### Supporting Libraries

**@ai-sdk/react & @ai-sdk/openai**
- Vercel's AI SDK for chat functionality
- Streaming responses and tool calling
- React hooks for chat state management

**ai**
- Core AI SDK functionality
- Message handling and conversion
- Streaming text generation

## Tutorial: Building Your First Fractal Chat App

This tutorial will walk you through creating a complete chat application with Fractal integration, deployed on Vercel.

### Prerequisites

- Node.js 18+ installed
- A Fractal consumer API key (get yours at [registry.fractalmcp.com](https://registry.fractalmcp.com))
- An OpenAI API key
- Vercel account for deployment

### Step 1: Project Setup

Create a new project directory and initialize it:

```bash
mkdir my-fractal-chat
cd my-fractal-chat
npm init -y
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install @fractal-mcp/client @fractal-mcp/render @fractal-mcp/vercel-connector
npm install @ai-sdk/openai @ai-sdk/react ai
npm install react react-dom express cors

# Dev dependencies  
npm install -D @vitejs/plugin-react typescript vite tailwindcss
```

### Step 3: Project Structure

Create the following project structure:

```
my-fractal-chat/
├── package.json
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── server.tsconfig.json
├── server/
│   └── index.ts
└── src/
    ├── main.tsx
    ├── Chat.tsx
    └── index.css
```

### Step 4: Configuration Files

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite --port 5174",
    "build": "vite build && tsc -p server.tsconfig.json",
    "start": "node dist/server/index.js",
    "preview": "vite preview"
  }
}
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 }
});
```

**tailwind.config.js:**
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: []
}
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**server.tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "./dist",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["server"]
}
```

### Step 5: HTML Template

**index.html:**
```html

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Fractal Chat App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 6: Styling

**src/index.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 7: React Entry Point

**src/main.tsx:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Chat from './Chat';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Chat />
  </React.StrictMode>
);
```

### Step 8: Chat Component

**src/Chat.tsx:**
```typescript
import { useChat } from '@ai-sdk/react';
import { FractalFrameEvent, renderLayoutAsComponent } from '@fractal-mcp/render';
import { useCallback } from 'react';

export default function Chat() {
  // Set up chat functionality with Vercel AI SDK
  const { messages, input, handleInputChange, handleSubmit, append } = useChat({
    api: '/api/chat'
  });

  // Handle events from interactive Fractal components
  const handleFrameEvent = useCallback((event: FractalFrameEvent) => {
    // Send component events back to the server as data messages
    append({
      role: 'data',
      content: JSON.stringify(event),
    })
  }, [append]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">My Fractal Chat</h1>
      
      {/* Display chat messages */}
      <div className="space-y-4 mb-6">
        {messages
          .filter(m => !["system", "data"].includes(m.role))
          .map(message => (
            <div key={message.id} className={`p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-100 ml-12' 
                : 'bg-gray-100 mr-12'
            }`}>
              <div className="font-medium text-sm mb-2">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              
              {/* Render message parts */}
              {message.parts.map((part, i) => {
                // Regular text
                if (part.type === 'text') {
                  return <div key={i}>{part.text}</div>;
                }
                    
                // Tool invocations (this is where Fractal magic happens!)
                    if (part.type === 'tool-invocation') {
                      const toolInvocation = (part as any).toolInvocation;
                      
                  // Render Fractal components
                      if (toolInvocation.toolName === 'renderLayout') {
                    return (
                      <div key={i} className="mt-3">
                        {renderLayoutAsComponent(toolInvocation, handleFrameEvent)}
                      </div>
                    );
                      }

                  // Show other tools being called
                      return (
                    <div key={i} className="mt-2 text-sm text-gray-600">
                      🔧 Using tool: {toolInvocation.toolName}
                        </div>
                      );
                    }
                    
                    return null;
                  })}
            </div>
          ))}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
          placeholder="Ask me anything..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </form>
    </div>
  );
}
```

### Step 9: Server Implementation

**server/index.ts:**
```typescript
import express from 'express';
import cors from 'cors';
import { streamText, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { FractalSDK } from '@fractal-mcp/client';
import { FractalVercel, cleanMessages } from '@fractal-mcp/vercel-connector';

const app = express();
app.use(cors());
app.use(express.json());

// Simple system message for the AI
const systemMessage = `
You are a helpful assistant.
`;

let fractalVercel: FractalVercel | null = null;

async function setupFractal() {
  if (!fractalVercel) {
    const client = new FractalSDK({ 
      apiKey: process.env.FRACTAL_CONSUMER_KEY! 
    });
    await client.connect();
    fractalVercel = new FractalVercel(client);
  }
  return fractalVercel;
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  // Prevent enormous react components from clogging the model's context
  const cleanedMessages = cleanMessages(messages, ["renderLayout"]);

  const fractal = await setupFractal();
  
  // Handle component events
  const wasHandled = await fractal.handleDataMessage(cleanedMessages, res);
  
  if (!wasHandled) {
    // Get available tools and stream response
    const tools = await fractal.getTools();

    const result = streamText({
      model: openai('gpt-4o'),
      system: systemMessage,
      messages: convertToCoreMessages(cleanedMessages),
      tools,
    });
    
    result.pipeDataStreamToResponse(res);
  }
});

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
```

### Step 10: Environment Variables

Create a `.env` file in your project root:

```env
FRACTAL_CONSUMER_KEY=your_fractal_consumer_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**Get your Fractal Consumer Key:**
Visit [registry.fractalmcp.com](https://registry.fractalmcp.com) to sign up and get your consumer API key.

### Step 11: Development

Run your application locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser to `http://localhost:5174` and start chatting!


Add your environment variables (`FRACTAL_CONSUMER_KEY`, `OPENAI_API_KEY`) in the Vercel dashboard.

## Key Concepts

### Component Rendering
Fractal components are rendered using the `renderLayoutAsComponent` function from `@fractal-mcp/render`. This function takes tool invocations and converts them into React components.

### Event Handling
Interactive components can trigger events that are handled by your `handleFrameEvent` callback. These events are sent back to the server as data messages.

### Message Processing
The `cleanMessages` function from `@fractal-mcp/vercel-connector` processes messages to handle component events and tool calls properly.

### Tool Integration
Tools are automatically discovered and made available through the `FractalVercel.getTools()` method, which integrates seamlessly with the Vercel AI SDK.

## Next Steps

- Explore available tools in the Fractal registry
- Customize your chat UI and styling
- Add authentication and user management
- Deploy to production with proper monitoring

For more examples and advanced usage, check out the [example-consumer-vercel](../apps/example-consumer-vercel) in this repository.