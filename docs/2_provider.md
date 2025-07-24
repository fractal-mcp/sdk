# Building Your First Provider

## What is a Provider?

A **provider** is a service that exposes tools and UI components through the Model Context Protocol (MCP). Think of it as a microservice that can:

- **Expose tools** that AI agents can call to perform actions
- **Provide UI components** that render the results of those tools
- **Handle data processing** and external API integrations
- **Serve interactive interfaces** that users can navigate

Providers are the building blocks of the Fractal ecosystem - they encapsulate specific functionality (like weather data, file operations, or database queries) and make them available to AI agents and users through a standardized interface.

## The Three Key Packages

When building a provider, you'll work with three main packages:

### 1. `@modelcontextprotocol/sdk` 
The foundational MCP protocol implementation. Provides the core types and interfaces for MCP communication.

### 2. `@fractal-mcp/mcp`
The Fractal server framework that extends MCP with:
- `FractalMCPServer` - Enhanced MCP server with component support
- `componentTool()` - Method to register tools with UI components
- `startExpressServer()` - HTTP server integration

### 3. `@fractal-mcp/composer`
The React library for building UI components:
- `useFractal()` - Hook to access tool data and navigation
- Pre-built utilities for common UI patterns

## Building Your First Provider: Weather Example

Let's walk through building a weather provider step by step, based on our [example-provider-weather](../apps/example-provider-weather).

### Step 1: Project Structure

Create a provider with this structure:
```
my-provider/
├── package.json
├── server/
│   ├── index.ts      # Main server file
│   ├── lib.ts        # Business logic
│   └── types.ts      # TypeScript types
└── ui/
    ├── package.json
    └── CurrentWeather.tsx
```

### Step 2: Server Setup

Create your main server file (`server/index.ts`):

```typescript
import { startExpressServer, FractalMCPServer } from '@fractal-mcp/mcp';
import { getCurrentWeather } from './lib.js';
import type { WeatherData } from './types.js';
import * as path from 'path';
import { z } from 'zod';

async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3100;

  // Create the MCP server
  const mcpServer = new FractalMCPServer({ 
    name: 'weather', 
    version: '1.0.0' 
  });

  // Register a component tool
  mcpServer.componentTool({
    name: 'get_current_weather',
    description: 'Get current weather in a city',
    componentPath: path.resolve('ui/CurrentWeather.tsx'),
    inputSchema: { location: z.string() },
    price: 100, // Optional: cost in credits
    handler: async (params) => {
      return await getCurrentWeather(params.location);
    },
  });

  // Start the server
  startExpressServer(mcpServer, port);
  console.log(`Server running on http://localhost:${port}/mcp`);
}

main().catch(console.error);
```

### Step 3: Define Types

First, create your data types (`server/types.ts`):

```typescript
export interface WeatherData {
  properties: {
    timestamp: string;
    temperature: {
      value: number;
      unitCode: string;
    };
    textDescription: string;
    windSpeed: {
      value: number;
      unitCode: string;
    };
    relativeHumidity: {
      value: number;
      unitCode: string;
    };
  };
}
```

### Step 4: Business Logic

Implement your core functionality (`server/lib.ts`):

```typescript
import type { WeatherData } from './types.js';

export async function getCurrentWeather(city: string): Promise<WeatherData> {
  // For this example, we'll return mock data
  // In a real implementation, you could fetch from weather APIs like:
  // - National Weather Service API
  // - OpenWeatherMap API
  // - WeatherAPI, etc.
  
  return {
    properties: {
      timestamp: new Date().toISOString(),
      temperature: {
        value: Math.floor(Math.random() * 30) + 50, // 50-80°F
        unitCode: "wmoUnit:degF"
      },
      textDescription: "Partly cloudy with light winds",
      windSpeed: {
        value: Math.floor(Math.random() * 15) + 5, // 5-20 mph
        unitCode: "wmoUnit:mph"
      },
      relativeHumidity: {
        value: Math.floor(Math.random() * 40) + 40, // 40-80%
        unitCode: "wmoUnit:percent"
      }
    }
  };
}
```

### Step 5: UI Component

Create a React component (`ui/CurrentWeather.tsx`):

```typescript
import { useFractal } from '@fractal-mcp/composer';
import type { WeatherData } from '../server/types';

export default function CurrentWeather() {
  // Access the tool data and navigation with proper typing
  const { data, error, navigate } = useFractal<WeatherData>();

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data?.properties) {
    return <div>Loading weather data...</div>;
  }

  const { properties } = data;

  return (
    <div className="weather-card">
      <h2>Current Weather</h2>
      <div className="temperature">
        {properties.temperature.value}°F
      </div>
      <div className="description">
        {properties.textDescription}
      </div>
      <div className="details">
        <p>Wind: {properties.windSpeed.value} mph</p>
        <p>Humidity: {properties.relativeHumidity.value}%</p>
      </div>
      
      {/* Navigate to another tool */}
      <button 
        onClick={() => navigate('get_hourly_forecast', { location: 'San Francisco' })}
      >
        View Hourly Forecast
      </button>
    </div>
  );
}
```

### Step 6: Package Configuration

Configure your `package.json`:

```json
{
  "name": "my-weather-provider",
  "type": "module",
  "scripts": {
    "build": "tsc --project server",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@fractal-mcp/mcp": "^2.1.0",
    "@fractal-mcp/composer": "^2.1.0",
    "zod": "^3.22.0"
  }
}
```

## How It All Works Together

Here's how everything flows together when a user interacts with your provider:

1. **Tool Registration**: Your server registers tools with `mcpServer.componentTool()`
2. **User Request**: An AI agent or user calls your tool (e.g., "get current weather for Boston")
3. **Handler Execution**: Your tool handler function runs, processes the request, and fetches data
4. **Data Return**: The handler returns structured data to the MCP protocol
5. **UI Rendering**: The associated React component receives the data via `useFractal()`
6. **User Interaction**: Users can interact with the UI, navigate to other tools, or trigger new requests

## Running the Example

Want to see a complete working example? Check out our [example-provider-weather](../apps/example-provider-weather):

```bash
cd apps/example-provider-weather
npm run build
npm run start
```

The server will start on `http://localhost:3100/mcp` and you can test the weather tools!

## Next Steps

- **Add more tools**: Register additional `componentTool()` calls for different functionality
- **Enhance UI**: Build richer React components with charts, forms, and interactions
- **Add validation**: Use Zod schemas for robust input validation
- **Handle errors**: Implement proper error handling and user feedback
- **Deploy**: Package your provider for production deployment

Your provider is now ready to be consumed by AI agents and integrated into larger applications!