# @fractal-mcp/generate

TypeScript code generation from MCP (Model Context Protocol) server tool schemas. This package introspects MCP servers to discover available tools and generates type-safe TypeScript interfaces and mappings.

## Installation

```bash
npm install @fractal-mcp/generate
```

## Overview

The `@fractal-mcp/generate` package provides utilities for automatically generating TypeScript types from MCP server tool schemas. This enables type-safe development when working with MCP tools by creating interfaces that match the exact input and output schemas defined by the server.

### Key Features

- **MCP Server Introspection** - Connect to MCP servers and discover available tools
- **Automatic Type Generation** - Convert JSON schemas to TypeScript interfaces
- **Type-Safe Tool Mapping** - Generate comprehensive tool maps with input/output types
- **Pascal Case Conversion** - Automatically format type names following TypeScript conventions
- **Zero Configuration** - Works out of the box with any MCP-compliant server

## Quick Start

```typescript
import { introspectServerUrl, generateToolTypes } from '@fractal-mcp/generate';

// 1. Discover tools from an MCP server
const tools = await introspectServerUrl('http://localhost:3001/mcp');

// 2. Generate TypeScript types
const typeDefinitions = await generateToolTypes(tools);

// 3. Write to file
import fs from 'fs';
fs.writeFileSync('./generated-types.ts', typeDefinitions);
```

## API Reference

### `introspectServerUrl(serverUrl: string)`

Connects to an MCP server and retrieves the schemas for all available tools.

**Parameters:**
- `serverUrl: string` - The URL of the MCP server to introspect

**Returns:** `Promise<Tool[]>` - Array of tool schemas with their input/output definitions

**Tool Schema Structure:**
```typescript
interface Tool {
  name: string;           // Tool identifier
  description?: string;   // Human-readable description
  inputSchema: object;    // JSON Schema for input parameters
  outputSchema?: object;  // JSON Schema for output (optional)
}
```

**Example:**
```typescript
// Connect to local MCP server
const tools = await introspectServerUrl('http://localhost:3001/mcp');

console.log(`Found ${tools.length} tools:`);
tools.forEach(tool => {
  console.log(`- ${tool.name}: ${tool.description}`);
});

// Example tool structure:
// {
//   name: 'weather-forecast',
//   description: 'Get weather forecast for a location',
//   inputSchema: {
//     type: 'object',
//     properties: {
//       location: { type: 'string' },
//       days: { type: 'number', default: 5 }
//     },
//     required: ['location']
//   },
//   outputSchema: {
//     type: 'object',
//     properties: {
//       temperature: { type: 'number' },
//       conditions: { type: 'string' },
//       forecast: {
//         type: 'array',
//         items: {
//           type: 'object',
//           properties: {
//             date: { type: 'string' },
//             high: { type: 'number' },
//             low: { type: 'number' }
//           }
//         }
//       }
//     }
//   }
// }
```

**Error Handling:**
```typescript
try {
  const tools = await introspectServerUrl('http://localhost:3001/mcp');
  console.log('Successfully connected and retrieved tools');
} catch (error) {
  console.error('Failed to introspect server:', error.message);
  // Common errors:
  // - Server not running
  // - Invalid URL
  // - Network connectivity issues
  // - MCP protocol errors
}
```

**Supported Server URLs:**
```typescript
// Local development server
await introspectServerUrl('http://localhost:3001/mcp');

// Remote server
await introspectServerUrl('https://api.example.com/mcp');

// Custom port
await introspectServerUrl('http://localhost:8080/mcp');
```

---

### `generateToolTypes(toolSchemas: Tool[])`

Generates TypeScript type definitions from an array of tool schemas.

**Parameters:**
- `toolSchemas: Tool[]` - Array of tool schemas (typically from `introspectServerUrl`)

**Returns:** `Promise<string>` - Complete TypeScript code as a string

**Generated Code Structure:**
1. **Input Interfaces** - One interface per tool for input parameters
2. **Output Interfaces** - One interface per tool for output data
3. **ToolMap Interface** - Aggregate mapping of all tools with their types

**Example:**
```typescript
const tools = await introspectServerUrl('http://localhost:3001/mcp');
const typeDefinitions = await generateToolTypes(tools);

console.log(typeDefinitions);
// Output:
// /* AUTO-GENERATED — DO NOT EDIT */
// 
// export interface WeatherForecastInput {
//   location: string;
//   days?: number;
// }
// 
// export interface WeatherForecastOutput {
//   temperature: number;
//   conditions: string;
//   forecast: Array<{
//     date: string;
//     high: number;
//     low: number;
//   }>;
// }
// 
// export interface ToolMap {
//   "weather-forecast": { input: WeatherForecastInput; output: WeatherForecastOutput };
// }
```

**Type Name Conversion:**
The function automatically converts tool names to Pascal case for TypeScript interfaces:

```typescript
// Tool name: "weather-forecast" 
// Generates: WeatherForecastInput, WeatherForecastOutput

// Tool name: "user_profile"
// Generates: UserProfileInput, UserProfileOutput

// Tool name: "getData"
// Generates: GetDataInput, GetDataOutput
```

---

## Complete Workflow Example

### 1. Server Introspection and Type Generation

```typescript
import { introspectServerUrl, generateToolTypes } from '@fractal-mcp/generate';
import fs from 'fs/promises';
import path from 'path';

async function generateTypesFromServer() {
  try {
    // Step 1: Connect to MCP server and discover tools
    console.log('Connecting to MCP server...');
    const tools = await introspectServerUrl('http://localhost:3001/mcp');
    
    if (tools.length === 0) {
      console.warn('No tools found on the server');
      return;
    }
    
    console.log(`Found ${tools.length} tools:`);
    tools.forEach(tool => console.log(`  - ${tool.name}`));
    
    // Step 2: Generate TypeScript types
    console.log('Generating TypeScript types...');
    const typeDefinitions = await generateToolTypes(tools);
    
    // Step 3: Write to file
    const outputPath = path.join(process.cwd(), 'generated', 'mcp-types.ts');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, typeDefinitions);
    
    console.log(`✅ Types generated successfully: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Type generation failed:', error.message);
    process.exit(1);
  }
}

generateTypesFromServer();
```

### 2. Using Generated Types

```typescript
// Import the generated types
import { ToolMap, WeatherForecastInput, WeatherForecastOutput } from './generated/mcp-types';

// Type-safe tool execution
async function executeWeatherTool(client: MCPClient) {
  const input: WeatherForecastInput = {
    location: 'San Francisco',
    days: 7
  };
  
  const output: WeatherForecastOutput = await client.executeTool('weather-forecast', input);
  
  // TypeScript knows the exact structure
  console.log(`Temperature: ${output.temperature}°F`);
  console.log(`Conditions: ${output.conditions}`);
  
  output.forecast.forEach(day => {
    console.log(`${day.date}: ${day.high}°F / ${day.low}°F`);
  });
}

// Generic tool executor with type safety
async function executeAnyTool<K extends keyof ToolMap>(
  client: MCPClient,
  toolName: K,
  input: ToolMap[K]['input']
): Promise<ToolMap[K]['output']> {
  return client.executeTool(toolName, input);
}
```

### 3. Integration with Build Process

**package.json:**
```json
{
  "scripts": {
    "generate-types": "node scripts/generate-types.js",
    "prebuild": "npm run generate-types",
    "build": "tsc",
    "dev": "concurrently \"npm run generate-types -- --watch\" \"tsc --watch\""
  }
}
```

**scripts/generate-types.js:**
```javascript
import { introspectServerUrl, generateToolTypes } from '@fractal-mcp/generate';
import fs from 'fs/promises';

const SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp';
const OUTPUT_FILE = './src/generated/mcp-types.ts';

async function main() {
  const tools = await introspectServerUrl(SERVER_URL);
  const types = await generateToolTypes(tools);
  
  await fs.mkdir('./src/generated', { recursive: true });
  await fs.writeFile(OUTPUT_FILE, types);
  
  console.log(`Generated types for ${tools.length} tools`);
}

main().catch(console.error);
```

---

## Advanced Usage

### Custom Type Generation

```typescript
import { generateToolTypes } from '@fractal-mcp/generate';

// Manually define tool schemas
const customTools = [
  {
    name: 'custom-api',
    description: 'Custom API endpoint',
    inputSchema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
        data: { type: 'object' }
      },
      required: ['endpoint', 'method']
    },
    outputSchema: {
      type: 'object',
      properties: {
        status: { type: 'number' },
        data: { type: 'any' },
        headers: { type: 'object' }
      }
    }
  }
];

const types = await generateToolTypes(customTools);
```

### Multiple Server Integration

```typescript
async function generateFromMultipleServers() {
  const servers = [
    'http://localhost:3001/mcp',
    'http://localhost:3002/mcp',
    'https://api.example.com/mcp'
  ];
  
  const allTools = [];
  
  for (const serverUrl of servers) {
    try {
      const tools = await introspectServerUrl(serverUrl);
      allTools.push(...tools);
      console.log(`✅ Connected to ${serverUrl}: ${tools.length} tools`);
    } catch (error) {
      console.warn(`⚠️  Failed to connect to ${serverUrl}: ${error.message}`);
    }
  }
  
  if (allTools.length > 0) {
    const types = await generateToolTypes(allTools);
    // Write combined types...
  }
}
```

### Watch Mode Implementation

```typescript
import chokidar from 'chokidar';

function watchAndGenerate(serverUrl: string, outputPath: string) {
  let isGenerating = false;
  
  const generate = async () => {
    if (isGenerating) return;
    isGenerating = true;
    
    try {
      const tools = await introspectServerUrl(serverUrl);
      const types = await generateToolTypes(tools);
      await fs.writeFile(outputPath, types);
      console.log('🔄 Types regenerated');
    } catch (error) {
      console.error('❌ Generation failed:', error.message);
    } finally {
      isGenerating = false;
    }
  };
  
  // Initial generation
  generate();
  
  // Watch for server changes (if server supports file watching)
  // This is a conceptual example - actual implementation depends on your setup
  setInterval(generate, 30000); // Poll every 30 seconds
}
```

---

## Error Handling

### Connection Errors

```typescript
try {
  const tools = await introspectServerUrl('http://localhost:3001/mcp');
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('Server is not running. Please start your MCP server.');
  } else if (error.code === 'ENOTFOUND') {
    console.error('Invalid server URL or DNS resolution failed.');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Schema Validation Errors

```typescript
try {
  const types = await generateToolTypes(tools);
} catch (error) {
  console.error('Type generation failed:', error.message);
  // Common causes:
  // - Invalid JSON Schema format
  // - Circular references in schemas
  // - Unsupported schema features
}
```

### Graceful Degradation

```typescript
async function safeTypeGeneration(serverUrl: string) {
  try {
    const tools = await introspectServerUrl(serverUrl);
    
    // Filter out tools with invalid schemas
    const validTools = tools.filter(tool => {
      try {
        JSON.stringify(tool.inputSchema);
        return true;
      } catch {
        console.warn(`Skipping tool ${tool.name}: invalid schema`);
        return false;
      }
    });
    
    if (validTools.length > 0) {
      return await generateToolTypes(validTools);
    } else {
      throw new Error('No valid tools found');
    }
  } catch (error) {
    console.error('Type generation failed:', error.message);
    return generateFallbackTypes();
  }
}

function generateFallbackTypes(): string {
  return `
/* AUTO-GENERATED FALLBACK TYPES */

export interface GenericToolInput {
  [key: string]: any;
}

export interface GenericToolOutput {
  [key: string]: any;
}

export interface ToolMap {
  [toolName: string]: { input: GenericToolInput; output: GenericToolOutput };
}
`;
}
```

---

## Dependencies

- `json-schema-to-typescript` - Converts JSON Schema to TypeScript interfaces
- `@modelcontextprotocol/sdk` - MCP client SDK for server communication

## Requirements

- Node.js 18+
- TypeScript 5.0+
- Access to MCP-compliant server

## Integration

This package is designed to work seamlessly with:
- `@fractal-mcp/cli` - Provides the `generate` command
- `@fractal-mcp/client` - Uses generated types for type-safe tool execution
- Any MCP-compliant server

## Best Practices

1. **Regenerate types regularly** during development
2. **Version control generated files** for reproducible builds
3. **Use type guards** for runtime validation
4. **Handle server unavailability** gracefully
5. **Document custom schemas** when not using introspection
