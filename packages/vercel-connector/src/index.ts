import { pipeDataStreamToResponse, formatDataStreamPart, UIMessage } from 'ai';
import { ServerResponse } from 'http';
import { IncomingMessage } from 'http';

import { z } from 'zod';

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
