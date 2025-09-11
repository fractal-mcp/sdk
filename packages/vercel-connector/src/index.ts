
import { FractalSDK } from "@fractal-mcp/client";
import { pipeDataStreamToResponse, tool, jsonSchema, formatDataStreamPart, UIMessage } from 'ai';
import { ServerResponse } from 'http';
import { IncomingMessage } from 'http';
import { z } from 'zod';

export const UIEventSchema = z.object({
    type: z.string(),
    data: z.object({
        name: z.string(),
        params: z.record(z.unknown()),
    }),
    toolName: z.string(), // source tool that triggered this.
    componentId: z.string(),
})

/**
 * Converts the tools from the fractal format to the vercel format.
 * @param mcpTools - The tools to convert
 * @param fractalClient - The fractal client to use
 * @returns The tools in the vercel format
 */
interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
}

export function convertToolsToVercelFormat(mcpTools: MCPTool[], fractalClient: FractalSDK) {
    const tools: Record<string, any> = {};
    for (const t of mcpTools) {
        tools[t.name] = tool({
            description: t.description || '',
            parameters: jsonSchema(t.inputSchema || { type: 'object', properties: {} }),
            execute: async (args: unknown) => {
                const result = await fractalClient.callTool({ name: t.name, arguments: args as Record<string, unknown> });
                return result
            },
        });
    }
    return tools;
}

/**
 * Strips heavy html from the messages on the client side before sending to LLM.
 * @param input - The messages to transform
 * @returns The transformed messages
 */
export function cleanMessages(input: unknown, toolNames: string[] = ["renderLayout", "renderComponent"]): UIMessage[] {
    const msgs = input as UIMessage[];
    return msgs.map(msg => {
        return {
            ...msg,
            parts: msg.parts.map(part => {
                if (part.type == "tool-invocation") {
                    if (toolNames.includes(part.toolInvocation.toolName)) {
                        return {
                            ...part,
                            toolInvocation: {
                                ...part.toolInvocation,
                                result: "-- RESULT RENDERED ON SCREEN --"
                            }
                        }
                    }
                }
                return part
            })
        }
    })
}

export class FractalVercel {
    fractalClient: FractalSDK;
    constructor(fractalClient: FractalSDK) {
        this.fractalClient = fractalClient;
    }

    /**
     * Gets the tools from the fractal client and converts them to the vercel format.
     * @returns The tools in the vercel format
     */
    async getTools() {
        const tools = await this.fractalClient.listTools();
        return convertToolsToVercelFormat(tools.tools, this.fractalClient);
    }

    /**
     * Handles 'data' messages.
     * If the last message is a 'data' message, it will be parsed as a tool call and the tool will be called.
     * Does nothing if the last message is not a 'data' message.
     * @param messages - The messages to handle
     * @returns Promise<boolean> - true if the message was handled, false otherwise
     */
    async handleDataMessage(messages: UIMessage[], res: ServerResponse<IncomingMessage>): Promise<boolean> {
        const lastMessage = messages[messages.length - 1];
        if ((lastMessage as { role: string }).role === "data") {
            // parse as tool call from UI 
            const parsed = UIEventSchema.parse(JSON.parse((lastMessage as { content: string }).content))
            // proxy event back.
            console.log("parsed", parsed)
            // Get the orgiinbal org, server and toolNames 
            const [_org, _server, _tool] = parsed.toolName.split(":")
            const fullToolPath  = [_org, _server, parsed.data.name].join(":")

            // console.log("the output", res)

            const client = this.fractalClient;
            
            // Wrap pipeDataStreamToResponse in a Promise to make it awaitable
            await new Promise<void>((resolve, reject) => {
                pipeDataStreamToResponse(res, {
                    async execute(ds) {
                        try {
                            // 1️⃣  invent an ID so the result can point back at the call
                            const toolCallId = 'call_' + crypto.randomUUID();
                            
                            // 2️⃣  send the tool-call part
                            ds.write(
                                formatDataStreamPart('tool_call', {
                                    toolCallId,                 // REQUIRED
                                    toolName: "fractal_tool_execute",     // e.g. "org:server:myComponent"
                                    args: parsed.data.params    // must be a plain object
                                }),
                            );
                            const data = await client.navigate(fullToolPath, parsed.data.params);
                            
                            // 3️⃣  stream the tool-result part
                            ds.write(
                                formatDataStreamPart('tool_result', {
                                    toolCallId,                 // SAME id ties call ↔ result
                                    result: data,
                                }),
                            );
                        
                            // leave the function → pipeDataStreamToResponse automatically appends
                            // the required finish_step (e:) and finish_message (d:) parts
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
            
            return true;
        } else {
            return false;
        }
    }
}