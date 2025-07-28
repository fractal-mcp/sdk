import express, { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { JSONRPCError } from "@modelcontextprotocol/sdk/types.js";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { IMcpConnectable } from "./types";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";

const SESSION_ID_HEADER = "mcp-session-id";
const JWKS_URL = "https://auth.fractalmcp.com/.well-known/jwks.json";

let cachedPublicKey: string | null = null;
let cachedKeyId: string | null = null;

// Fetch the public key from the JWKS endpoint
const fetchPublicKey = async (): Promise<string> => {
    if (cachedPublicKey) return cachedPublicKey;
    const res = await fetch(JWKS_URL);
    if (!res.ok) throw new Error("Failed to fetch JWKS");
    const { keys } = await res.json();
    if (!keys || !keys.length) throw new Error("No keys found in JWKS");
    // Find the first key with 'n' and 'e' (RSA public key)
    const jwk = keys.find((k: any) => k.kty === "RSA" && k.n && k.e);
    if (!jwk) throw new Error("No suitable RSA key found in JWKS");
    cachedKeyId = jwk.kid;
    // Convert JWK to PEM using jwk-to-pem
    const pubKey = jwkToPem(jwk);
    cachedPublicKey = pubKey;
    return pubKey;
};

function isInitializeRequest(body: any): boolean {
    const tryInit = (data: any) => {
        const result = InitializeRequestSchema.safeParse(data);
        return result.success;
    }
    if (Array.isArray(body)) return body.some(tryInit);
    return tryInit(body);
}

function createError(message: string): JSONRPCError {
    return {
        jsonrpc: "2.0",
        error: { code: -32000, message },
        id: randomUUID()
    };
}

/**
 * Creates an Express app that can be used to start the MCP server.
 * @param app - The Express app to use
 * @param mcpServer - The MCP server to connect to
 * @returns An Express server that can be used to start the MCP server
 */
export function makeExpressApp(app: express.Express, mcpServer: IMcpConnectable) {
    const transports: Record<string, StreamableHTTPServerTransport> = {};

    app.post("/mcp", async (req: Request, res: Response) => {
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
        res.status(400).json(createError("Bad Request: invalid session or method"));
    });

    app.get("/mcp", async (req: Request, res: Response) => {
        const sessionId = req.headers[SESSION_ID_HEADER] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
            res.status(400).json(createError("Bad Request: invalid session ID"));
            return;
        }
        await transports[sessionId].handleRequest(req, res);
    });

    // Health check endpoint
    app.get("/health", (req: Request, res: Response) => {
        res.status(200).json({ status: "ok" });
    });

    return app;
}

/**
 * Default CORS middleware that you can use if you want :)
 * @param req - The request object
 * @param res - The response object
 * @param next - The next function
 */
export const defaultCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, mcp-session-id");
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
    }
    next();
}

export const defaultAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for localhost requests
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost' || 
                       clientIp === '::ffff:127.0.0.1' || req.hostname === 'localhost';
    
    if (isLocalhost) {
        next();
        return;
    }

    const auth = req.headers["authorization"];
    if (!auth || !auth.startsWith("Bearer ")) {
        res.status(401).json({ error: "missing_token" });
        return;
    }
    const token = auth.substring(7);

    try {
        const publicKey = await fetchPublicKey();

        const payload = jwt.verify(token, publicKey, {
            algorithms: ["RS256"],
            issuer: "fractal-auth",
            audience: "fractal",
        });
        (req as any).auth = payload;
        next();
    } catch (err) {
        res.status(401).json({ error: "invalid_token", details: (err as Error).message });
    }
}


export function startExpressServer(mcpServer: IMcpConnectable, port: number = 3000): void {
    const transports: Record<string, StreamableHTTPServerTransport> = {};
    const app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use(defaultCorsMiddleware);
    app.use(defaultAuthMiddleware);

    makeExpressApp(app, mcpServer);

    app.listen(port, () => {
        console.log(`MCP Streamable HTTP Server listening on port ${port}`);
    });
}
