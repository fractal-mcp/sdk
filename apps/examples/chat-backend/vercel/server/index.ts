import express from 'express';
import cors from 'cors';
import { streamText, UIMessage, convertToCoreMessages, experimental_createMCPClient } from 'ai';
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {FractalVercel} from "@fractal-mcp/vercel-connector"

import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const systemMessage = `
You are a helpful assistant. Help the user with their questions. 
You have access to the Fractal tool registry, which provides you the ability to search for different tools. When you encounter a question that requires information from the internet, search for a tool first on fractal.
`;

/**
 * Calls an MCP tool directly using the official MCP client
 * @param transport - The MCP transport
 * @param toolName - Name of the tool to call
 * @param toolArgs - Arguments to pass to the tool
 * @returns Promise with the tool result
 */
export async function callMcpToolDirect(
  transport: StreamableHTTPClientTransport,
  toolName: string,
  toolArgs: Record<string, unknown> = {}
) {
  // Create the official MCP client
  const client = new Client({
      name: "direct-tool-caller",
      version: "1.0.0"
  });

  // Connect to the transport
  await client.connect(transport);

  // Call the tool directly
  const result = await client.callTool({
    name: toolName,
    arguments: toolArgs
  });

  return result;
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  const processedMessages = messages as UIMessage[];
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/"));
  // const transport = new StreamableHTTPClientTransport(new URL("https://mcpstorefront.com/?store=demostore.mock.shop&mode=tool"));
  
  const fractalVercel = new FractalVercel({
    callTool: async (toolName: string, args: Record<string, unknown>) => {
      const result = await callMcpToolDirect(transport, toolName, args);
      return result;
    },
  });
  
  const wasHandled = await fractalVercel.handleDataMessage(processedMessages, res);
  if (!wasHandled) {
    const mcpClient = await experimental_createMCPClient({ transport });
    const mcpTools = await mcpClient.tools();

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: systemMessage,
      messages: convertToCoreMessages(processedMessages),
      temperature: 0.0,
      maxSteps: 10,
      maxRetries: 3,
      tools: mcpTools,
      // onStepFinish: (step) => {
      //   console.log('=== Step Finished ===');
      //   console.log('Step type:', step.stepType);
        
      //   if (step.toolCalls && step.toolCalls.length > 0) {
      //     console.log('\n--- Tool Calls ---');
      //     step.toolCalls.forEach((toolCall, index) => {
      //       console.log(`\nTool Call ${index + 1}:`);
      //       console.log('  Tool Name:', toolCall.toolName);
      //       console.log('  Arguments:', JSON.stringify(toolCall.args, null, 2));
      //     });
      //   }
        
      //   if (step.toolResults && step.toolResults.length > 0) {
      //     console.log('\n--- Tool Results ---');
      //     step.toolResults.forEach((toolResult, index) => {
      //       console.log(`\nTool Result ${index + 1}:`);
      //       console.log('  Tool Name:', toolResult.toolName);
      //       console.log('  Result:', JSON.stringify(toolResult.result, null, 2));
      //     });
      //   }
        
      //   console.log('===================\n');
      // },
    })
    result.pipeDataStreamToResponse(res);
    }
  });
  

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


