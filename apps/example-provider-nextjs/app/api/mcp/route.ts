import { createFractalMcpRoute } from "@fractal-mcp/mcp-nextjs";
import { FractalMCPServer } from "@fractal-mcp/mcp"
import { z } from "zod";
import { getCurrentWeather, getHourlyForecast } from "../../../lib/weather";
import * as path from 'path';

// Create and configure the MCP server
const server = new FractalMCPServer({
  name: "example-nextjs-weather-provider",
  version: "1.0.0"
});

// Add weather component tools
server.componentTool({
  name: 'get_current_weather',
  description: 'Get current weather in a city with interactive UI',
  componentBundlePath: path.resolve('./bundled/CurrentWeather'),
  inputSchema: { location: z.string().describe("City name to get weather for") },
  price: 100,
  handler: async ({ location }) => getCurrentWeather(location),
});

server.componentTool({
  name: 'get_hourly_forecast',
  description: 'Get hourly forecast for a city with interactive charts',
  componentBundlePath: path.resolve('./bundled/HourlyForecast'),
  inputSchema: { location: z.string().describe("City name to get hourly forecast for") },
  price: 1000,
  handler: async ({ location }) => getHourlyForecast(location),
});

// Keep a few simple tools for demonstration
    server.tool({
  name: "echo",
  description: "Echo back the provided message",
      inputSchema: {
    message: z.string().describe("The message to echo back")
      },
  handler: async ({ message }) => {
        return {
      echo: message,
      timestamp: new Date().toISOString(),
      server: "example-nextjs-weather-provider"
    };
  }
});

server.tool({
  name: "get_time",
  description: "Get the current server time",
  inputSchema: {},
  handler: async () => {
    const now = new Date();
    return {
      iso: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      formatted: now.toLocaleString()
        };
      }
    });

// Create the route handlers
const { GET, POST, OPTIONS } = createFractalMcpRoute(server, {
    auth: {
    required: false, // Set to true in production
      allowLocalhost: true
    },
    cors: {
      origins: "*"
  }
});

export { GET, POST, OPTIONS };