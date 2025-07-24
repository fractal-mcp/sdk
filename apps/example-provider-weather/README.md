# Weather MCP Server Provider

A Model Context Protocol (MCP) server that provides weather information using the National Weather Service (NWS) API. This app demonstrates how to use both `@fractal-mcp/composer` and `@fractal-mcp/mcp` packages in a turbo monorepo setup.

## Features

- **Current Weather**: Get current weather conditions for any US city
- **7-Day Forecast**: Retrieve detailed 7-day weather forecasts  
- **Hourly Forecast**: Get hourly weather data for the next ~48 hours
- **MCP Integration**: Full Model Context Protocol support for AI applications
- **Provider UI**: Includes FractalUI integration for enhanced user interactions
- **Dual Transport**: Supports both stdio (CLI) and HTTP transport modes

## Usage

### Building the App

```bash
# From the root of the monorepo
npm run build

# Or build just this app
cd apps/provider-weather
npm run build
```

### Running the Server

#### Stdio Mode (for CLI integration)
```bash
npm run start
# or
node dist/index.js
```

#### HTTP Mode (for web integration)
```bash
npm run start:http
# or  
node dist/index.js http
```

The HTTP server will run on `http://localhost:3001/mcp` by default.

### Environment Variables

- `PORT`: Set the HTTP server port (default: 3001)

## MCP Tool Usage

The server exposes three tools that each return both data and a UI component loaded from disk:

### `get_current_weather`

Get the latest observation for a city.

**Parameters:**
- `location` (string, required) – City name

### `get_forecast`

Retrieve a 7‑day forecast for a city.

**Parameters:**
- `location` (string, required) – City name

### `get_hourly_forecast`

Get the hourly forecast for the next two days.

**Parameters:**
- `location` (string, required) – City name

Each tool returns `structuredContent` with the fetched `data` and a `component` string containing the JSX for the appropriate UI widget.

## Integration Examples

### With fractal CLI

Generate TypeScript types for the tools:
```bash
npx fractal generate -s http://localhost:3001/mcp -o ./generated-types
```

### With Claude Desktop

Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/anonymous-library/apps/provider-weather/dist/index.js"]
    }
  }
}
```

### With Provider UI

The app includes FractalUI integration for enhanced client interactions:

```typescript
import { FractalUI } from "@fractal-mcp/composer";

// The FractalUI instance is available for import
import { fractalUI } from "./index.js";

// Use the typed hooks
const { useFractalAction, useData } = fractalUI;
```

## API Dependencies

- **National Weather Service API**: Used for weather data
- **Open-Meteo Geocoding API**: Used for city name to coordinates conversion

Both APIs are free and don't require API keys, but the NWS API requires a proper User-Agent header (which is included).

## Package Dependencies

This app demonstrates integration with:
- `@fractal-mcp/composer`: UI components and hooks for MCP providers
- `@fractal-mcp/mcp`: Express server utilities for MCP hosting
- `@modelcontextprotocol/sdk`: Official MCP TypeScript SDK
- `zod`: Schema validation for tool parameters

## Development

The app is part of a turbo monorepo and benefits from:
- Shared TypeScript configuration
- Automatic dependency linking between packages
- Parallel build processes
- Unified tooling across the monorepo


## Deployment
You must run from the root of the repo! Meaning you gotta cd .. a couple times.
```
fly deploy --config apps/provider-weather/fly.toml --dockerfile apps/provider-weather/Dockerfile
```