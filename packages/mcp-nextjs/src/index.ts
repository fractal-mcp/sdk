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

export interface FractalAuthConfig {
  jwksUrl?: string;
  issuer?: string;
  audience?: string;
  required?: boolean;
  requiredScopes?: string[];
  allowLocalhost?: boolean;
}

export interface FractalCorsConfig {
  origins?: string | string[];
  methods?: string[];
  headers?: string[];
}

export interface FractalMcpConfig {
  auth?: FractalAuthConfig;
  cors?: FractalCorsConfig;
  basePath?: string;
  maxDuration?: number;
  verboseLogs?: boolean;
}

/**
 * Creates a Fractal token verification function
 */
export function createFractalTokenVerifier(config: FractalAuthConfig = {}) {
  const {
    jwksUrl = DEFAULT_JWKS_URL,
    issuer = "fractal-auth",
    audience = "fractal",
    allowLocalhost = true
  } = config;

  return async (req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
    // Skip auth for localhost requests if allowed
    if (allowLocalhost) {
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
    }

    if (!bearerToken) {
      throw new Error("missing_token");
    }

  try {
      const publicKey = await fetchPublicKey(jwksUrl);
      
      const payload = jwt.verify(bearerToken, publicKey, {
        algorithms: ["RS256"],
        issuer,
        audience,
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
export function addFractalCorsHeaders(response: Response, config: FractalCorsConfig = {}): Response {
  const {
    origins = "*",
    methods = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    headers = ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "mcp-session-id"]
  } = config;

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Access-Control-Allow-Origin", Array.isArray(origins) ? origins.join(", ") : origins);
  responseHeaders.set("Access-Control-Allow-Methods", Array.isArray(methods) ? methods.join(", ") : methods);
  responseHeaders.set("Access-Control-Allow-Headers", Array.isArray(headers) ? headers.join(", ") : headers);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
        });
      }
      
/**
 * Creates CORS preflight OPTIONS handler
 */
export function createFractalOptionsHandler(config: FractalCorsConfig = {}) {
  const {
    origins = "*",
    methods = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    headers = ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "mcp-session-id"]
  } = config;

  return async function OPTIONS(req: Request): Promise<Response> {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": Array.isArray(origins) ? origins.join(", ") : origins,
        "Access-Control-Allow-Methods": Array.isArray(methods) ? methods.join(", ") : methods,
        "Access-Control-Allow-Headers": Array.isArray(headers) ? headers.join(", ") : headers,
      }
    });
  };
}

/**
 * Factory function that creates authenticated MCP route handlers
 */
export function createFractalMcpRoute(
  serverOrCallback: FractalMCPServer | ((server: FractalMCPServer) => void | Promise<void>),
  config: FractalMcpConfig = {}
) {
  const {
    auth = { required: true },
    cors = {},
    basePath = "/api",
    maxDuration = 60,
    verboseLogs = false
  } = config;

  // Handle server setup
  let fractalServer: FractalMCPServer;
  if (serverOrCallback instanceof FractalMCPServer) {
    fractalServer = serverOrCallback;
  } else {
    // Create a new FractalMCPServer and call the setup function
    fractalServer = new FractalMCPServer({ 
      name: "fractal-mcp-server", 
      version: "1.0.0" 
    });
    const result = serverOrCallback(fractalServer);
    if (result instanceof Promise) {
      // Note: We can't await here, but the user should handle async setup themselves
      console.warn("Async server setup detected. Ensure setup completes before handling requests.");
    }
  }

  // Create base MCP handler using a setup function
  const baseHandler = createMcpHandler(
    (server) => {
        // Connect the FractalMCPServer tools to this server instance
        fractalServer.connectToServer(server);
    },
    {
      serverInfo: {
        name: "fractal-mcp-server",
        version: "1.0.0"
      }
    },
    {
      basePath,
      maxDuration,
      verboseLogs
    }
  );

  // Create token verifier
  const verifyToken = createFractalTokenVerifier(auth);

  // Wrap with auth if required
  const handler = auth.required 
    ? withMcpAuth(baseHandler, verifyToken, {
        required: auth.required,
        requiredScopes: auth.requiredScopes
      })
    : baseHandler;

  // Create wrapped handlers with CORS
  const wrappedHandler = async (req: Request): Promise<Response> => {
    try {
      const response = await handler(req);
      return addFractalCorsHeaders(response, cors);
    } catch (error) {
      console.error('❌ Error in MCP handler:', error);
      const errorResponse = new Response(JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      return addFractalCorsHeaders(errorResponse, cors);
    }
  };

  return {
    GET: wrappedHandler,
    POST: wrappedHandler,
    OPTIONS: createFractalOptionsHandler(cors)
  };
}

// Re-export useful types and utilities
export { createMcpHandler, withMcpAuth } from "@vercel/mcp-adapter";
export { FractalMCPServer } from "@fractal-mcp/mcp";

// Legacy exports for backward compatibility
export {
  createNextApiHandler,
  createAppRouteHandler,
  defaultCorsMiddleware,
  defaultAuthMiddleware,
  healthHandler,
  appRouteHealthHandler
} from "./legacy.js";