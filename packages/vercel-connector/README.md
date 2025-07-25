# @fractal-mcp/vercel-connector

A connector package for seamless integration between Fractal MCP tools and Vercel AI SDK. Provides utilities for converting MCP tools to Vercel format, handling UI events, and managing tool execution in Vercel AI applications.

## Installation

```bash
npm install @fractal-mcp/vercel-connector
```

## Overview

The `@fractal-mcp/vercel-connector` package bridges the gap between Fractal MCP tools and Vercel AI SDK, enabling:

- **Tool Format Conversion** - Convert MCP tools to Vercel AI SDK format
- **UI Event Handling** - Process UI events from Fractal components
- **Message Cleaning** - Strip heavy HTML content from messages
- **Stream Integration** - Handle data streaming with Vercel AI SDK
- **Navigation Support** - Process navigation events from components
- **Layout Rendering** - Integrate with Fractal's layout system

## Quick Start

### Basic Integration

```typescript
import { FractalVercel } from '@fractal-mcp/vercel-connector';
import { FractalSDK } from '@fractal-mcp/client';
import { streamText } from 'ai';

// Initialize Fractal client
const fractalClient = new FractalSDK({ apiKey: 'your-api-key' });
await fractalClient.connect();

// Create Vercel connector
const fractalVercel = new FractalVercel(fractalClient);

// Get tools in Vercel format
const tools = await fractalVercel.getTools();

// Use with Vercel AI SDK
const result = await streamText({
  model: openai('gpt-4'),
  messages: [{ role: 'user', content: 'Hello!' }],
  tools: {
    ...tools,
    renderLayout: fractalVercel.getRenderLayoutTool()
  }
});
```

### Chat Application Example

```typescript
import { FractalVercel, cleanMessages } from '@fractal-mcp/vercel-connector';
import { streamText, convertToCoreMessages } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  // Initialize Fractal connector
  const fractalClient = new FractalSDK({ apiKey: process.env.FRACTAL_API_KEY });
  await fractalClient.connect();
  const fractalVercel = new FractalVercel(fractalClient);
  
  // Handle UI events first
  const handled = await fractalVercel.handleDataMessage(messages, res);
  if (handled) return; // Event was processed
  
  // Clean messages for LLM
  const cleanedMessages = cleanMessages(messages);
  
  // Get tools and stream response
  const tools = await fractalVercel.getTools();
  
  const result = await streamText({
    model: openai('gpt-4'),
    messages: convertToCoreMessages(cleanedMessages),
    tools: {
      ...tools,
      renderLayout: fractalVercel.getRenderLayoutTool()
    }
  });
  
  return result.toDataStreamResponse();
}
```

## API Reference

### `FractalVercel`

Main class for integrating Fractal MCP with Vercel AI SDK.

#### Constructor

```typescript
new FractalVercel(fractalClient: FractalSDK)
```

**Parameters:**
- `fractalClient: FractalSDK` - Connected Fractal SDK instance

**Example:**
```typescript
import { FractalSDK } from '@fractal-mcp/client';
import { FractalVercel } from '@fractal-mcp/vercel-connector';

const client = new FractalSDK({ apiKey: 'your-key' });
await client.connect();

const vercelConnector = new FractalVercel(client);
```

#### `getTools()`

Retrieves MCP tools and converts them to Vercel AI SDK format.

**Returns:** `Promise<Record<string, VercelTool>>` - Tools in Vercel format

**Example:**
```typescript
const tools = await fractalVercel.getTools();

// Use with streamText
const result = await streamText({
  model: openai('gpt-4'),
  messages: messages,
  tools: tools
});

// Individual tool structure:
// {
//   toolName: {
//     description: "Tool description",
//     parameters: jsonSchema(inputSchema),
//     execute: async (args) => { /* tool execution */ }
//   }
// }
```

#### `getRenderLayoutTool()`

Gets the special renderLayout tool for handling Fractal component layouts.

**Returns:** `VercelTool` - Layout rendering tool

**Example:**
```typescript
const layoutTool = fractalVercel.getRenderLayoutTool();

const tools = {
  ...await fractalVercel.getTools(),
  renderLayout: layoutTool
};

// The layout tool handles:
// - Component arrangement
// - Layout string processing
// - Component ID management
```

#### `handleDataMessage(messages, res)`

Processes UI events from Fractal components and handles navigation/actions.

**Parameters:**
- `messages: UIMessage[]` - Array of UI messages
- `res: ServerResponse` - HTTP response object for streaming

**Returns:** `Promise<boolean>` - true if message was handled, false otherwise

**Example:**
```typescript
import { pipeDataStreamToResponse } from 'ai';

export async function POST(req: Request, res: Response) {
  const { messages } = await req.json();
  
  const fractalVercel = new FractalVercel(fractalClient);
  
  // Check if last message is a UI event
  const wasHandled = await fractalVercel.handleDataMessage(messages, res);
  
  if (wasHandled) {
    // UI event was processed and response streamed
    return;
  }
  
  // Continue with normal chat processing
  const result = await streamText({
    // ... normal chat configuration
  });
  
  return result.toDataStreamResponse();
}
```

**UI Event Processing:**
```typescript
// The method handles events like:
{
  role: "data",
  content: JSON.stringify({
    type: "action",
    data: {
      name: "buttonClick",
      params: { buttonId: "submit" }
    },
    toolName: "org:server:component",
    componentId: "widget-123"
  })
}

// And converts them to tool calls:
{
  toolCallId: "call_uuid",
  toolName: "renderLayout", 
  args: { /* navigation parameters */ }
}
```

---

### Utility Functions

#### `convertToolsToVercelFormat(mcpTools, fractalClient)`

Converts MCP tools to Vercel AI SDK tool format.

**Parameters:**
- `mcpTools: MCPTool[]` - Array of MCP tool definitions
- `fractalClient: FractalSDK` - Fractal client for tool execution

**Returns:** `Record<string, VercelTool>` - Tools in Vercel format

**Example:**
```typescript
import { convertToolsToVercelFormat } from '@fractal-mcp/vercel-connector';

const mcpTools = [
  {
    name: 'weather-tool',
    description: 'Get weather information',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        units: { type: 'string', enum: ['celsius', 'fahrenheit'] }
      },
      required: ['location']
    }
  }
];

const vercelTools = convertToolsToVercelFormat(mcpTools, fractalClient);

// Result:
// {
//   'weather-tool': {
//     description: 'Get weather information',
//     parameters: jsonSchema(inputSchema),
//     execute: async (args) => {
//       return await fractalClient.callTool({ 
//         name: 'weather-tool', 
//         arguments: args 
//       });
//     }
//   }
// }
```

#### `cleanMessages(messages, toolNames?)`

Removes heavy HTML content from messages before sending to LLM.

**Parameters:**
- `messages: UIMessage[]` - Array of UI messages to clean
- `toolNames?: string[]` - Tool names to clean (default: ['renderLayout', 'renderComponent'])

**Returns:** `UIMessage[]` - Cleaned messages

**Example:**
```typescript
import { cleanMessages } from '@fractal-mcp/vercel-connector';

const originalMessages = [
  {
    role: 'user',
    content: 'Hello'
  },
  {
    role: 'assistant', 
    parts: [
      {
        type: 'tool-invocation',
        toolInvocation: {
          toolName: 'renderLayout',
          result: '<div></div>'
        }
      }
    ]
  }
];

const cleaned = cleanMessages(originalMessages);

// Result:
// [
//   { role: 'user', content: 'Hello' },
//   {
//     role: 'assistant',
//     parts: [
//       {
//         type: 'tool-invocation',
//         toolInvocation: {
//           toolName: 'renderLayout',
//           result: '-- RESULT RENDERED ON SCREEN --'
//         }
//       }
//     ]
//   }
// ]

// Custom tool names to clean
const customCleaned = cleanMessages(originalMessages, ['myCustomTool', 'anotherTool']);
```

---

## Type Definitions

### `UIEventSchema`

Zod schema for validating UI events from Fractal components.

```typescript
const UIEventSchema = z.object({
  type: z.string(),                    // Event type (action, navigate, etc.)
  data: z.object({
    name: z.string(),                  // Event name
    params: z.record(z.unknown()),    // Event parameters
  }),
  toolName: z.string(),               // Source tool that triggered the event
  componentId: z.string(),            // Component that emitted the event
});

type UIEvent = z.infer<typeof UIEventSchema>;
```

### `MCPTool`

Interface for MCP tool definitions.

```typescript
interface MCPTool {
  name: string;                       // Tool identifier
  description?: string;               // Human-readable description
  inputSchema?: Record<string, unknown>; // JSON Schema for input validation
}
```

---

## Integration Examples

### Next.js API Route

```typescript
// app/api/chat/route.ts
import { FractalSDK } from '@fractal-mcp/client';
import { FractalVercel, cleanMessages } from '@fractal-mcp/vercel-connector';
import { streamText, convertToCoreMessages } from 'ai';
import { openai } from 'ai/openai';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Initialize Fractal
    const fractalClient = new FractalSDK({ 
      apiKey: process.env.FRACTAL_API_KEY 
    });
    await fractalClient.connect();
    
    const fractalVercel = new FractalVercel(fractalClient);
    
    // Handle UI events
    const handled = await fractalVercel.handleDataMessage(messages, res);
    if (handled) return new Response(); // Event processed
    
    // Clean messages for LLM
    const cleanedMessages = cleanMessages(messages);
    
    // Get tools
    const tools = await fractalVercel.getTools();
    
    // Stream response
    const result = await streamText({
      model: openai('gpt-4'),
      messages: convertToCoreMessages(cleanedMessages),
      tools: {
        ...tools,
        renderLayout: fractalVercel.getRenderLayoutTool()
      },
      maxTokens: 1000,
    });
    
    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

### React Chat Component

```tsx
// components/Chat.tsx
import { useChat } from 'ai/react';
import { FractalFrame } from '@fractal-mcp/render';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  const handleFrameEvent = async (event) => {
    // Send UI events back to the chat
    const eventMessage = {
      role: 'data',
      content: JSON.stringify({
        type: event.type,
        data: event.data,
        toolName: event.toolName,
        componentId: event.componentId
      })
    };
    
    // Add event message and trigger response
    setMessages(prev => [...prev, eventMessage]);
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.role === 'user' && (
              <div>{message.content}</div>
            )}
            
            {message.role === 'assistant' && (
              <div>
                {message.toolInvocations?.map((tool, toolIndex) => {
                  if (tool.toolName === 'renderLayout' && tool.result) {
                    return (
                      <FractalFrame
                        key={toolIndex}
                        jsx={tool.result.layout}
                        map={tool.result.componentToolOutputs || {}}
                        onEvent={handleFrameEvent}
                      />
                    );
                  }
                  return (
                    <div key={toolIndex}>
                      Tool: {tool.toolName}
                      <pre>{JSON.stringify(tool.result, null, 2)}</pre>
                    </div>
                  );
                })}
                
                {message.content && <div>{message.content}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="input-form">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
```

### Express.js Integration

```typescript
// server.js
import express from 'express';
import { FractalSDK } from '@fractal-mcp/client';
import { FractalVercel, cleanMessages } from '@fractal-mcp/vercel-connector';
import { streamText } from 'ai';

const app = express();
app.use(express.json());

// Initialize Fractal once
const fractalClient = new FractalSDK({ apiKey: process.env.FRACTAL_API_KEY });
await fractalClient.connect();
const fractalVercel = new FractalVercel(fractalClient);

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  
  try {
    // Handle UI events
    const handled = await fractalVercel.handleDataMessage(messages, res);
    if (handled) return; // Response already sent
    
    // Process normal chat
    const cleanedMessages = cleanMessages(messages);
    const tools = await fractalVercel.getTools();
    
    const result = await streamText({
      model: openai('gpt-4'),
      messages: cleanedMessages,
      tools: {
        ...tools,
        renderLayout: fractalVercel.getRenderLayoutTool()
      }
    });
    
    // Stream response
    result.pipeDataStreamToResponse(res);
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Advanced Usage

### Custom Tool Processing

```typescript
import { FractalVercel } from '@fractal-mcp/vercel-connector';

class CustomFractalVercel extends FractalVercel {
  async getTools() {
    const baseTool = await super.getTools();
    
    // Add custom processing to tools
    const enhancedTools = {};
    
    for (const [name, tool] of Object.entries(baseTools)) {
      enhancedTools[name] = {
        ...tool,
        execute: async (args) => {
          // Add logging
          console.log(`Executing tool: ${name}`, args);
          
          // Add validation
          if (!this.validateArgs(name, args)) {
            throw new Error(`Invalid arguments for tool: ${name}`);
          }
          
          // Execute original tool
          const result = await tool.execute(args);
          
          // Add post-processing
          return this.postProcessResult(name, result);
        }
      };
    }
    
    return enhancedTools;
  }
  
  private validateArgs(toolName: string, args: any): boolean {
    // Custom validation logic
    return true;
  }
  
  private postProcessResult(toolName: string, result: any): any {
    // Custom post-processing
    return result;
  }
}
```

### Event Filtering and Transformation

```typescript
import { cleanMessages } from '@fractal-mcp/vercel-connector';

function customCleanMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map(message => {
    if (message.role === 'assistant' && message.parts) {
      return {
        ...message,
        parts: message.parts.map(part => {
          if (part.type === 'tool-invocation') {
            const toolName = part.toolInvocation.toolName;
            
            // Custom cleaning rules
            if (toolName.startsWith('render')) {
              return {
                ...part,
                toolInvocation: {
                  ...part.toolInvocation,
                  result: `[${toolName.toUpperCase()} RENDERED]`
                }
              };
            }
            
            // Clean large data objects
            if (typeof part.toolInvocation.result === 'object') {
              const resultSize = JSON.stringify(part.toolInvocation.result).length;
              if (resultSize > 1000) {
                return {
                  ...part,
                  toolInvocation: {
                    ...part.toolInvocation,
                    result: `[LARGE DATA OBJECT: ${resultSize} characters]`
                  }
                };
              }
            }
          }
          
          return part;
        })
      };
    }
    
    return message;
  });
}
```

### Error Handling and Retry Logic

```typescript
class RobustFractalVercel extends FractalVercel {
  private maxRetries = 3;
  private retryDelay = 1000;
  
  async getTools() {
    return this.withRetry(() => super.getTools());
  }
  
  async handleDataMessage(messages: UIMessage[], res: ServerResponse) {
    return this.withRetry(() => super.handleDataMessage(messages, res));
  }
  
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw new Error(`Operation failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Performance Optimization

### Tool Caching

```typescript
class CachedFractalVercel extends FractalVercel {
  private toolsCache: Record<string, any> | null = null;
  private cacheExpiry: number = 0;
  private cacheDuration = 5 * 60 * 1000; // 5 minutes
  
  async getTools() {
    const now = Date.now();
    
    if (this.toolsCache && now < this.cacheExpiry) {
      return this.toolsCache;
    }
    
    const tools = await super.getTools();
    this.toolsCache = tools;
    this.cacheExpiry = now + this.cacheDuration;
    
    return tools;
  }
  
  invalidateCache() {
    this.toolsCache = null;
    this.cacheExpiry = 0;
  }
}
```

### Message Optimization

```typescript
function optimizeMessages(messages: UIMessage[]): UIMessage[] {
  // Remove duplicate consecutive messages
  const deduplicated = messages.filter((msg, index) => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    return !(msg.role === prev.role && msg.content === prev.content);
  });
  
  // Limit message history
  const maxMessages = 50;
  const trimmed = deduplicated.slice(-maxMessages);
  
  // Clean heavy content
  return cleanMessages(trimmed);
}
```

---

## Troubleshooting

### Common Issues

**Tool Conversion Fails:**
```typescript
// Check tool schema validity
const tools = await fractalClient.listTools();
console.log('Available tools:', tools);

// Validate individual tool schemas
tools.tools.forEach(tool => {
  try {
    jsonSchema(tool.inputSchema || {});
    console.log(`✅ Tool ${tool.name} schema is valid`);
  } catch (error) {
    console.error(`❌ Tool ${tool.name} schema error:`, error);
  }
});
```

**UI Events Not Processing:**
```typescript
// Debug event structure
const lastMessage = messages[messages.length - 1];
console.log('Last message:', lastMessage);

if (lastMessage.role === 'data') {
  try {
    const parsed = JSON.parse(lastMessage.content);
    console.log('Parsed event:', parsed);
    
    // Validate against schema
    const validated = UIEventSchema.parse(parsed);
    console.log('Validated event:', validated);
  } catch (error) {
    console.error('Event validation failed:', error);
  }
}
```

**Stream Response Issues:**
```typescript
// Ensure proper response handling
app.post('/api/chat', async (req, res) => {
  // Set proper headers
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const handled = await fractalVercel.handleDataMessage(messages, res);
    if (handled) {
      // Don't send additional response
      return;
    }
    
    // Continue with normal processing
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});
```

---

## Dependencies

- `@fractal-mcp/client` - Fractal SDK for MCP communication
- `@modelcontextprotocol/sdk` - MCP protocol types and utilities
- `ai` - Vercel AI SDK for tool integration and streaming
- `zod` - Schema validation for UI events
- `dotenv` - Environment variable management

## Requirements

- Node.js 18+
- Vercel AI SDK 3.0+
- Active Fractal MCP server connection
- Valid Fractal API credentials

## Best Practices

1. **Cache tools** when possible to reduce API calls
2. **Clean messages** before sending to LLM to reduce token usage
3. **Handle errors gracefully** with proper retry logic
4. **Validate UI events** before processing
5. **Use proper streaming** for real-time responses
6. **Monitor performance** and optimize message handling
7. **Implement proper logging** for debugging
8. **Test tool conversion** thoroughly before deployment

## License

MIT 