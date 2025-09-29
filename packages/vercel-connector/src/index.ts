import { pipeDataStreamToResponse, formatDataStreamPart, UIMessage } from 'ai';
import { ServerResponse } from 'http';
import { IncomingMessage } from 'http';
import { z } from 'zod';

export class FractalVercel {
    handleToolCall: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
    constructor(args:{
        handleToolCall: (toolName: string, args: Record<string, unknown>) => Promise<unknown>,
    }) {
        this.handleToolCall = args.handleToolCall;
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
            console.log("lastMessage", lastMessage)

            // await new Promise<void>((resolve, reject) => {
            //     pipeDataStreamToResponse(res, {
            //         async execute(ds) {
            //             try {
            //                 // 1️⃣  invent an ID so the result can point back at the call
            //                 const toolCallId = 'call_' + crypto.randomUUID();
                            
            //                 // 2️⃣  send the tool-call part
            //                 ds.write(
            //                     formatDataStreamPart('tool_call', {
            //                         toolCallId,                 // REQUIRED
            //                         toolName: "fractal_tool_execute",     // e.g. "org:server:myComponent"
            //                         args: parsed.data.params    // must be a plain object
            //                     }),
            //                 );
            //                 const data = await client.navigate(fullToolPath, parsed.data.params);
                            
            //                 // 3️⃣  stream the tool-result part
            //                 ds.write(
            //                     formatDataStreamPart('tool_result', {
            //                         toolCallId,                 // SAME id ties call ↔ result
            //                         result: data,
            //                     }),
            //                 );
                        
            //                 // leave the function → pipeDataStreamToResponse automatically appends
            //                 // the required finish_step (e:) and finish_message (d:) parts
            //                 resolve();
            //             } catch (error) {
            //                 reject(error);
            //             }
            //         },
                    
            //         onError: (err) => {
            //             const errorMessage = err instanceof Error ? err.message : String(err);
            //             reject(errorMessage);
            //             return errorMessage;
            //         },
            //     });
            // });
            
            return true;
        } else {
            return false;
        }
    }
}