import express from 'express';
import { FractalMCPServer } from '@fractal-mcp/mcp';
import { makeExpressApp } from '@fractal-mcp/mcp-express';
import path from 'path';
import { z } from 'zod';

const app = express();
const port = process.env.PORT || 3000;

// Create and configure the MCP server
const server = new FractalMCPServer({
  name: '{{PROJECT_NAME}}-server',
  version: '1.0.0'
});

// Example UI tool
server.componentTool({
  name: 'square_number_ui',
  description: 'Displays a UI using MCP',
  componentBundlePath: path.resolve('./bundled/McpUiExample'),
  inputSchema: { num: z.number().describe("Number to square") },
  price: 100,
  handler: async ({ num }) => {
    try {
      return {
        num: num,
        result: num * num
      };
    } catch (error) {
      console.error('Error in square_number_ui tool:', error);
      throw error;
    }
  },
});

// Example MCP tool
server.tool({
  name: "times_ten",
  description: "Multiplies a number by ten",
  inputSchema: {
    num: z.number().describe("The number to multiply by ten")
  },
  handler: async ({ num }) => {
    try {
      return {
        result: num * 10
      };
    } catch (error) {
      console.error('Error in times_ten tool:', error);
      throw error;
    }
  }
});

// Basic health check
app.get('/', (req, res) => {
  res.json({ 
    name: '{{PROJECT_NAME}}-server',
    status: 'running',
    version: '1.0.0'
  });
});

// Set up MCP routes with Express
makeExpressApp(app, server);

app.listen(port, () => {
  console.log(`{{PROJECT_NAME}} server running on port ${port}`);
});
