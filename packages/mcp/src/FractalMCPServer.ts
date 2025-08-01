import * as z from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { FractalComponentTool, McpInput, registerComponentTool } from "./ComponentTool.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { IMcpConnectable } from "./index.js";

export type FractalTool = {
    name: string;
    description: string | undefined;
    inputSchema: z.ZodRawShape;
    outputSchema?: z.ZodRawShape;
    handler: (args: { [x: string]: any }, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => any;
}

export const AuthStructSchema = z.object({
    authType: z.enum(["OAUTH2", "TOKEN"]),
    scopes: z.array(z.string()),
    authUrl: z.string(),
    tokenUrl: z.string(),
    refreshTokenUrl: z.string(),
});

export type AuthStruct = z.infer<typeof AuthStructSchema>;


export class FractalMCPServer implements IMcpConnectable {
    public server: McpServer;
    private tools: FractalTool[];
    private componentTools: FractalComponentTool<any, any>[];
    private auth: AuthStruct[];
    constructor({ name, version, auth = [], server }: { name: string, version: string, auth?: AuthStruct[], server?: McpServer }) {
        this.server = server || new McpServer({ name, version });
        this.tools = [];
        this.componentTools = [];
        this.auth = auth || []
    }

    tool(data: FractalTool) {
        this.tools.push(data);
        this.server.tool(data.name, data.description || "", data.inputSchema, async (...args) => {
            return data.handler(...args)
        });
    }

    componentTool<T1 extends McpInput,T2>(data: FractalComponentTool<T1, T2>) {
        this.componentTools.push(data);
        registerComponentTool(this.server, data);
    }

    async connect(transport: Transport) {
        this.server.connect(transport);
    }

    // Method to connect tools to an existing McpServer instance
    connectToServer(server: McpServer) {
        // Register all tools with the provided server
        for (const tool of this.tools) {
            server.tool(tool.name, tool.description || "", tool.inputSchema, async (...args) => {
                return tool.handler(...args);
            });
        }
        
        // Register component tools
        for (const componentTool of this.componentTools) {
            registerComponentTool(server, componentTool);
        }
    }

    async introspect() {
        const result = {
            auth: this.auth,
            tools: [] as Array<{
                name: string;
                description: string | undefined;
                inputSchema: any;
                outputSchema: any;
            }>,
            componentTools: [] as Array<{
                name: string;
                description: string;
                inputSchema: any;
                outputSchema: any;
            }>
        };

        // Process regular tools
        for (const tool of this.tools) {
            const inputSchema = zodToJsonSchema(z.object(tool.inputSchema));
            
            // For regular tools, we don't have a defined output schema structure
            // so we'll create a generic one
            const outputSchema = {
                type: "any",
                description: "Tool output - structure depends on implementation"
            };

            result.tools.push({
                name: tool.name,
                description: tool.description,
                inputSchema,
                outputSchema
            });
        }

        // Process component tools
        for (const componentTool of this.componentTools) {
            const inputSchema = zodToJsonSchema(z.object(componentTool.inputSchema));
            
            // Component tools have a defined output structure
            const outputSchema = {
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            error: { type: "string" }
                        },
                        required: ["error"],
                        description: "Error response"
                    },
                    {
                        type: "object",
                        properties: {
                            data: { 
                                type: "any",
                                description: "Tool-specific data output"
                            },
                            component: { 
                                type: "string",
                                description: "React component as string"
                            }
                        },
                        required: ["data", "component"],
                        description: "Success response with data and component"
                    }
                ],
                description: "Component tool response - either error or success with data and component"
            };

            result.componentTools.push({
                name: componentTool.name,
                description: componentTool.description,
                inputSchema,
                outputSchema
            });
        }

        return result;
    }
    
}