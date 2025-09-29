import express from 'express';
import cors from 'cors';
import { streamText, UIMessage, convertToCoreMessages, experimental_createMCPClient } from 'ai';
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ServerResponse } from 'http';
import { IncomingMessage } from 'http';
import { openai } from '@ai-sdk/openai';
import { pipeDataStreamToResponse, formatDataStreamPart } from 'ai';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

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
export class FractalVercel {
    callTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
    constructor(args:{
        callTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown>,
    }) {
        this.callTool = args.callTool;
    }

    extractDataMessage(messages: UIMessage[]) {
        const lastMessage = messages[messages.length - 1];
        console.log("lastMessage", lastMessage)
        if ((lastMessage as { role: string }).role !== "data") {
            return null;
        }
        try {
          return JSON.parse(lastMessage.content);
        } catch (error) {
          return null;
        }
    }

    handleToolCall(res: ServerResponse<IncomingMessage>, toolName: string, args: Record<string, unknown>) {
      console.log("handleToolCall", toolName, args)
      return new Promise<void>((resolve, reject) => {
          pipeDataStreamToResponse(res, {
              execute: async (ds) => {
                  try {
                      const toolCallId = 'call_' + crypto.randomUUID();
                      ds.write(formatDataStreamPart('tool_call', { toolCallId, toolName, args }));
                      const data = await this.callTool(toolName, args);
                      ds.write(
                          formatDataStreamPart('tool_result', {
                              toolCallId,
                              result: data,
                          }),
                      );
                      resolve();
                  } catch (error) {
                      reject(error);
                  }
              },
              onError: (err) => {
                  const errorMessage = err instanceof Error ? err.message : String(err);
                  reject(errorMessage);
                  return errorMessage;
              },
          });
      });
    }
    /**
     * Handles 'data' messages.
     * If the last message is a 'data' message, it will be parsed as a tool call and the tool will be called.
     * Does nothing if the last message is not a 'data' message.
     * @param messages - The messages to handle
     * @returns Promise<boolean> - true if the message was handled, false otherwise
     */
    async handleDataMessage(messages: UIMessage[], res: ServerResponse<IncomingMessage>): Promise<boolean> {
        // console.log("handleDataMessage", messages)
        const dataMessage = this.extractDataMessage(messages);
        console.log("dataMessage", dataMessage)
        if (dataMessage && dataMessage.type === "tool") {
          const toolName = dataMessage.payload.toolName;
          const params = dataMessage.payload.params;
            await this.handleToolCall(res, toolName, params);
            return true;
        } else {
            return false;
        }
    }
}

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
  console.log("HI HERE 1!!");
  const { messages } = req.body;
  const processedMessages = messages as UIMessage[];
  // console.log("processedMessages", processedMessages)
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"));

  const fractalVercel = new FractalVercel({
    callTool: async (toolName: string, args: Record<string, unknown>) => {
      console.log("toolName", toolName)
      console.log("args", args)
      const result = await callMcpToolDirect(transport, toolName, args);
      return result;
    },
  });
  // console.log("fractalVercel", fractalVercel)
  
  const wasHandled = await fractalVercel.handleDataMessage(processedMessages, res);
  console.log("wasHandled", wasHandled)
  if (!wasHandled) {
    const mcpClient = await experimental_createMCPClient({ transport });
    const mcpTools = await mcpClient.tools();
    // console.log("mcpTools", mcpTools)
    // throw new Error("test")
    const result = streamText({
      model: google("gemini-2.5-flash"),
      // model: openai("gpt-4.1-mini"),
      system: systemMessage,
      messages: convertToCoreMessages(processedMessages),
      temperature: 0.0,
      maxSteps: 10,
      maxRetries: 3,
      tools: mcpTools,
    })
    result.pipeDataStreamToResponse(res);
    }
  });
  

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


