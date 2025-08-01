import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import {
    ListToolsRequest,
    ListToolsResult,
    CallToolRequest,
    ClientCapabilities
} from '@modelcontextprotocol/sdk/types.js';

export type FractalSDKInitOptions = {
    apiKey: string;      // JWT from fractal-auth
    baseUrl?: string;       // e.g. https://fractalwhatever.ai
    authUrl?: string;       // e.g. http://localhost:8080/registry-auth
};

export type ConnectOptions = {
    branches?: string[];                // x-registry-branches header
    sessionId?: string;                 // resume existing session
    capabilities?: ClientCapabilities;  // advertise extra capabilities
};

// MCP is unfortunate.
const MCPToolOutputSchema = z.object({
    content: z.array(z.object({
        type: z.literal('text'),
        text: z.string()
    })).optional(),
    data: z.any().optional(),
});

const ComponentToolOutputSchema = z.object({
    component: z.object({ html: z.string() }).optional(),
    data: z.record(z.any()).optional(),
    error: z.string().optional(),
});

const ComponentToolOpaqueOutputSchema = z.object({
    id: z.string(),
    jsx: z.string(),
})

export type ComponentToolResponse = z.infer<typeof ComponentToolOutputSchema>;

export interface ComponentToolOutput extends ComponentToolResponse {
    toolName?: string;
}
export type MCPToolOutput = z.infer<typeof MCPToolOutputSchema>;

export type RenderOutput = {
    layout: string,
    includedIds: string[],
    componentToolOutputs: {[id:string]: ComponentToolResponse}
}

const LOCAL_REGISTRY_URL = 'http://localhost:5055';
const LOCAL_AUTH_URL = 'http://localhost:8080/registry-auth';

const DEFAULT_REGISTRY_URL = "https://mcp.fractalmcp.com";
const DEFAULT_AUTH_URL = "https://auth.fractalmcp.com";


// Tools 
export const RENDER_LAYOUT_TOOL = {
    name: 'renderLayout',
    description: 'Use this tool to render a layout for the user. This is used when you get components back from tool calls. You may render a snippet of JSX that can include custom components that you receive from tool calls. Dont forget to mention which ids were used.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            layout: {
                type: 'string'
            },
            includedIds: {
                type: 'array',
                items: { type: 'string' }
            }
        },
        required: ['layout', 'includedIds']
    }
};



export class FractalSDK extends Client {

    // You should have a consumer API key from fractal
    private readonly apiKey: string;

    // Optional, defaults to http://localhost:5055
    private readonly baseUrl: string;

    // Optional, defaults to http://localhost:8080/registry-auth
    private readonly authUrl: string;

    // The transport to the Fractal MCP server
    private fractalTransport?: StreamableHTTPClientTransport;

    // Temporary storage for component tool outputs
    // Used to provide a destination for component tool outputs
    // so that they can bypass the LLM context.
    private componentToolOutputs: Map<string, ComponentToolOutput> = new Map();

    // The access token and refresh token
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private expiresAt: number = 0;

    constructor(opts: FractalSDKInitOptions) {
        super({ name: 'fractal-sdk-client', version: '1.0.0' });
        this.apiKey = opts.apiKey;
        this.baseUrl = opts.baseUrl ?? DEFAULT_REGISTRY_URL;
        this.authUrl = opts.authUrl ?? DEFAULT_AUTH_URL;
    }

    /**
     * Request a new token from the Fractal API.
     *
     * @returns The access token.
     */
    async requestToken() {
        if (!this.apiKey) throw new Error('apiKey is not set');
        const resp = await fetch(`${this.authUrl}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ api_key: this.apiKey }),
        });
        if (!resp.ok) {
            throw new Error(`Token request failed: ${resp.status}`);
        }
        const data: any = await resp.json();
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.expiresAt = Date.now() + (data.expires_in || 0) * 1000;
        return this.accessToken!;
    }

    /**
     * Refresh the access token using the refresh token.
     *
     * @returns The access token.
     */
    async refresh() {
        if (!this.refreshToken) return this.requestToken();
        const resp = await fetch(`${this.authUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ refresh_token: this.refreshToken }),
        });
        if (!resp.ok) {
            return this.requestToken();
        }
        const data: any = await resp.json();
        this.accessToken = data.access_token;
        this.refreshToken = data.refresh_token;
        this.expiresAt = Date.now() + (data.expires_in || 0) * 1000;
        return this.accessToken!;
    }

    /**
     * Get a valid access token, refreshing or requesting a new one if needed.
     *
     * @returns The access token.
     */
    async getFractalAccessToken() {
        if (this.accessToken && Date.now() < this.expiresAt - 10000) {
            return this.accessToken;
        }
        if (this.refreshToken && Date.now() < this.expiresAt) {
            try {
                return await this.refresh();
            } catch {
                return this.requestToken();
            }
        }
        return this.requestToken();
    }

    /** Call once before using listTools / callTool … */
    async connect(opts: ConnectOptions = {}) {
        const accessToken = await this.getFractalAccessToken();

        const headers: Record<string, string> = {
            authorization: `Bearer ${accessToken}`,
        };
        if (opts.branches?.length) headers['x-registry-branches'] = opts.branches.join(',');
        if (opts.sessionId) headers['mcp-session-id'] = opts.sessionId;

        this.fractalTransport = new StreamableHTTPClientTransport(
            new URL('/mcp', this.baseUrl),
            {
                sessionId: opts.sessionId,
                requestInit: { headers },
            },
        );

        await super.connect(this.fractalTransport);
    }

    /** Session ID assigned by the server after connect() */
    get sessionId(): string | undefined {
        return this.fractalTransport?.sessionId;
    }

    // ––– MCP convenience wrappers ––––––––––––––––––––––––––––––––––––––

    override async listTools(params?: ListToolsRequest['params'], options?: RequestOptions): Promise<ListToolsResult> {
        const result = await super.listTools(params, options);
        
        // Add the renderLayout tool to the response
        const renderLayoutTool = {
            name: 'renderLayout',
            description: 'Use this tool to render a layout for the user. This is used when you get components back from tool calls. You may render a snippet of JSX that can include custom components that you receive from tool calls. Dont forget to mention which ids were used.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    layout: {
                        type: 'string'
                    },
                    includedIds: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                },
                required: ['layout', 'includedIds']
            }
        };

        // Add the renderLayout tool to the existing tools
        if (result && typeof result === 'object' && 'tools' in result && Array.isArray(result.tools)) {
            result.tools.push(renderLayoutTool);
        } else {
            // If no tools exist, create the structure
            return {
                ...result,
                tools: [renderLayoutTool]
            };
        }

        return result;
    }

    /**
     * This is a standard MCP callTool! 
     * We intercept because of the need to handle specific cases withing fractal_tool_execute
     * @param params 
     * @param resultSchema 
     * @param options 
     * @returns 
     */
    override async callTool(params: CallToolRequest['params'], resultSchema?: any, options?: RequestOptions) {
        try {
            // Handle renderLayout tool locally
            if (params.name === 'renderLayout') {
                const args = params.arguments as {layout: string, includedIds: string[]}
                
                // Extract component tool outputs for the included IDs
                const componentToolOutputs: Record<string, ComponentToolOutput> = {};
                if (args.includedIds) {
                    for (const id of args.includedIds) {
                        const output = this.componentToolOutputs.get(id);
                        if (output) {
                            componentToolOutputs[id] = output;
                        }
                    }
                }
                
                return {
                    data: {
                        ...args,
                        componentToolOutputs
                    }
                } as any;
            }

            const res = await super.callTool(params, resultSchema, options).then(res => MCPToolOutputSchema.parse(res));

            if (params.name === 'fractal_tool_execute') {
                let content: any = null;
                const toolName = (params.arguments as any)?.fractalToolId;
                try {
                    content = JSON.parse(res.content?.[0]?.text ?? '');
                } catch (e) {
                    console.error('Error parsing tool output', e);
                }
    
                const toolResponse = ComponentToolOutputSchema.parse(content);

                if (toolResponse.data != null && toolResponse.component != null) {
                    const id = crypto.randomUUID();
                    this.componentToolOutputs.set(id, {
                        component: toolResponse.component,
                        data: toolResponse.data,
                        toolName,
                    });
                    return { id, jsx: `<Frac id={'${id}'}/>` } as any;
                }
            }
            return res;
        } catch (err:any) {
            return {
                content: [{
                    type: 'text' as const,
                    text: (err as Error).message
                }]
            } as any;
        }
    }


    /** Example custom helper that wraps a Fractal search tool */
    search(term: string) {
        return this.callTool({
            name: 'fractal_tool_search',
            arguments: { term },
        });
    }

    /** Execute a tool with the given name and arguments */
    async executeTool(toolName: string, args: Record<string, any> = {}) {
        return this.callTool({
            name: "fractal_tool_execute",
            arguments: {
                fractalToolId: toolName,
                params: args,
            },
        });
    }

    /** Execute a tool with the given name and arguments */
    async navigate(toolName: string, args: Record<string, any> = {}): Promise<RenderOutput> {
        const res = await this.executeTool(toolName, args)
        const parsedRes = ComponentToolOpaqueOutputSchema.parse(res)
        const componentToolOutput = this.componentToolOutputs.get(parsedRes.id)
        if (!componentToolOutput) throw new Error("Could not find component data for tool.")
        return {
            layout: parsedRes.jsx,
            includedIds: [parsedRes.id],
            componentToolOutputs: {[parsedRes.id]: componentToolOutput}
        }
    }
}