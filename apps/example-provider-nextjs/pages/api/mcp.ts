import { FractalMCPServer } from '@fractal-mcp/mcp';
import { createNextApiHandler } from '@fractal-mcp/mcp-nextjs';
import path from 'path';
import { z } from 'zod';
import { getCurrentWeather, getHourlyForecast } from '../../lib';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

const mcpServer = new FractalMCPServer({ name: 'weather-next', version: '1.0.0', auth: [] });

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

export default createNextApiHandler(mcpServer);
