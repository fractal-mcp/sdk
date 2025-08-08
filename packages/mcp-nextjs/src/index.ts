import { createMcpHandler, withMcpAuth } from "@vercel/mcp-adapter";
import { FractalMCPServer } from "@fractal-mcp/mcp";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const DEFAULT_JWKS_URL = "https://auth.fractalmcp.com/.well-known/jwks.json";

let cachedPublicKey: string | null = null;
let cachedKeyId: string | null = null;

// Fetch the public key from the JWKS endpoint
const fetchPublicKey = async (jwksUrl: string = DEFAULT_JWKS_URL): Promise<string> => {
  if (cachedPublicKey) return cachedPublicKey;
  const res = await fetch(jwksUrl);
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

export interface FractalMcpOptions {
  auth?: boolean;
  cors?: boolean;
  basePath?: string;
}

/**
 * Creates a Fractal token verification function
 */
export function createFractalTokenVerifier() {
  return async (req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
    // Skip auth for localhost requests
    const url = new URL(req.url);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    if (isLocalhost) {
      return { 
        token: "localhost-token",
        clientId: "localhost-client",
        scopes: ["read", "write"],
        extra: { 
          userId: "localhost-user",
          sub: "localhost", 
          iss: "localhost" 
        }
      };
    }

    if (!bearerToken) {
      throw new Error("missing_token");
    }

    try {
      const publicKey = await fetchPublicKey(DEFAULT_JWKS_URL);
      
      const payload = jwt.verify(bearerToken, publicKey, {
        algorithms: ["RS256"],
        issuer: "fractal-auth",
        audience: "fractal",
      }) as any;

      return {
        token: bearerToken,
        clientId: payload.client_id || payload.aud || "unknown-client",
        scopes: payload.scope ? payload.scope.split(' ') : [],
        expiresAt: payload.exp,
        extra: {
          userId: payload.sub || payload.user_id,
          claims: payload
        }
      };
    } catch (err) {
      throw new Error(`invalid_token: ${(err as Error).message}`);
    }
  };
}

/**
 * Adds CORS headers to a response
 */
export function addFractalCorsHeaders(response: Response): Response {
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  responseHeaders.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, mcp-session-id, mcp-protocol-version, mcp-server-name, mcp-server-version, mcp-client-name, mcp-client-version");
  responseHeaders.set("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version, mcp-server-name, mcp-server-version, mcp-client-name, mcp-client-version");
  responseHeaders.set("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}
      
/**
 * Creates CORS preflight OPTIONS handler
 */
export function createFractalOptionsHandler() {
  return async function OPTIONS(req: Request): Promise<Response> {
    return new Response(null, {
      status: 200
    });
  };
}

/**
 * Factory function that creates authenticated MCP route handlers
 */
export function createFractalMcpRoute(
  server: FractalMCPServer,
  options: FractalMcpOptions = {}
) {
  const { auth = true, cors = true, basePath = "/api" } = options;

  // Create base MCP handler using a setup function
  const baseHandler = createMcpHandler(
    (mcpServer) => {
        // Connect the FractalMCPServer tools to this server instance
        server.connectToServer(mcpServer);
    },
    {
      serverInfo: {
        name: "fractal-mcp-server",
        version: "1.0.0"
      }
    },
    {
      basePath
    }
  );

  // Wrap with auth if required
  let handler = baseHandler;
  if (auth) {
    const verifyToken = createFractalTokenVerifier();
    handler = withMcpAuth(baseHandler, verifyToken, {
      required: true
    });
  }

  // Create wrapped handlers with optional CORS
  const wrappedHandler = async (req: Request): Promise<Response> => {
    try {
      const response = await handler(req);
      return cors ? addFractalCorsHeaders(response) : response;
    } catch (error) {
      const errorResponse = new Response(JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return cors ? addFractalCorsHeaders(errorResponse) : errorResponse;
    }
  };

  // Create wrapped OPTIONS handler with optional CORS
  const optionsHandler = async (req: Request): Promise<Response> => {
    const response = new Response(null, { status: 200 });
    return cors ? addFractalCorsHeaders(response) : response;
  };

  return {
    GET: wrappedHandler,
    POST: wrappedHandler,
    OPTIONS: optionsHandler
  };
}