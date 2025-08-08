import { Express } from 'express';
import { makeExpressApp } from '@fractal-mcp/mcp-express';
import { FractalMCPServer } from '@fractal-mcp/mcp';
import { getCurrentWeather, getHourlyForecast } from './lib.js';
import * as path from 'path';
import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

console.log("Starting weather MCP server");
async function main() {
  console.log("Starting weather MCP server");
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3100;

  // Nothing new here!
  const mcpServer = new FractalMCPServer({ 
    name: 'weather', 
    version: '1.0.0',
    auth: []
  });

  console.log("Registering component tool");

  // Register a component tool with maximum sugar
  mcpServer.componentTool({
    name: 'get_current_weather',
    description: 'Get current weather in a city',
    componentBundlePath: path.resolve('bundled/CurrentWeather'),
    inputSchema: { location: z.string() },
    price: 100,
    handler: (params: { location: string }, _extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => getCurrentWeather(params.location),
  });

  mcpServer.componentTool({
    name: 'get_hourly_forecast',
    description: 'Get hourly forecast for a city',
    componentBundlePath: path.resolve('bundled/HourlyForecast'),
    inputSchema: { location: z.string() },
    price: 1000,
    handler: (params: { location: string }, _extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => getHourlyForecast(params.location),
  });

  console.log("Connecting to transport");
  
  // Use the fractal-serve function instead of custom server logic
  const app = new Express
  makeExpressApp(app, mcpServer, )
  
  console.log(`Weather MCP server running on http://localhost:${port}/mcp`);
}

main().catch(console.error);