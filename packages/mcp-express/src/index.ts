import express, { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { JSONRPCError } from '@modelcontextprotocol/sdk/types.js';
import { InitializeRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { IMcpConnectable } from '@fractal-mcp/mcp';

const SESSION_ID_HEADER = 'mcp-session-id';

function isInitializeRequest(body: any): boolean {
    const tryInit = (data: any) => {
        const result = InitializeRequestSchema.safeParse(data);
        return result.success;
    };
    if (Array.isArray(body)) return body.some(tryInit);
    return tryInit(body);
}

function createError(message: string): JSONRPCError {
    return {
        jsonrpc: '2.0',
        error: { code: -32000, message },
        id: randomUUID(),
    };
}

/**
 * Default CORS middleware that allows you to connect to the preview
 * @param req - The request object
 * @param res - The response object
 * @param next - The next function
 */
export const defaultCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Set CORS headers for all requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, mcp-session-id, mcp-protocol-version, mcp-server-name, mcp-server-version, mcp-client-name, mcp-client-version',
    );
    res.header(
        'Access-Control-Expose-Headers',
        'mcp-session-id, mcp-protocol-version, mcp-server-name, mcp-server-version, mcp-client-name, mcp-client-version',
    );
    res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
};

/**
 * Creates an Express app that can be used to start the MCP server.
 * Does not handle authentication or cors.
 * Use this method for maximum flexibility
 * @param app - The Express app to use
 * @param mcpServer - The MCP server to connect to
 * @returns An Express server that can be used to start the MCP server
 */
export function makeExpressRoutes(app: express.Express, mcpServer: IMcpConnectable) {
    const transports: Record<string, StreamableHTTPServerTransport> = {};

    app.post('/', async (req: Request, res: Response) => {
        const sessionId = req.headers[SESSION_ID_HEADER] as string | undefined;

        // 3a) Existing session → route to transport
        if (sessionId && transports[sessionId]) {
            await transports[sessionId].handleRequest(req, res, req.body);
            return;
        }

        // 3b) Initialize call → create new transport
        if (!sessionId && isInitializeRequest(req.body)) {
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized(sessionId) {
                    transports[sessionId] = transport;
                },

            });
            await mcpServer.connect(transport);
            await transport.handleRequest(req, res, req.body);

            if (transport.sessionId) {
                transports[transport.sessionId] = transport;
            }
            return;
        }

        // 3c) Bad request
        res.status(400).json(createError('Bad Request: invalid session or method'));
    });

    app.get('/', async (req: Request, res: Response) => {
        const sessionId = req.headers[SESSION_ID_HEADER] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
            res.status(400).json(createError('Bad Request: invalid session ID'));
            return;
        }
        await transports[sessionId].handleRequest(req, res);
    });

    return app;
}
