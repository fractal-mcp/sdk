import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { JSONRPCError, InitializeRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { IMcpConnectable } from '@fractal-mcp/mcp';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';

const SESSION_ID_HEADER = 'mcp-session-id';
const JWKS_URL = 'https://auth.fractalmcp.com/.well-known/jwks.json';

let cachedPublicKey: string | null = null;
let cachedKeyId: string | null = null;

const fetchPublicKey = async (): Promise<string> => {
  if (cachedPublicKey) return cachedPublicKey;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error('Failed to fetch JWKS');
  const { keys } = await res.json();
  if (!keys || !keys.length) throw new Error('No keys found in JWKS');
  const jwk = keys.find((k: any) => k.kty === 'RSA' && k.n && k.e);
  if (!jwk) throw new Error('No suitable RSA key found in JWKS');
  cachedKeyId = jwk.kid;
  const pubKey = jwkToPem(jwk);
  cachedPublicKey = pubKey;
  return pubKey;
};

function isInitializeRequest(body: any): boolean {
  const tryInit = (data: any) => InitializeRequestSchema.safeParse(data).success;
  if (Array.isArray(body)) return body.some(tryInit);
  return tryInit(body);
}

function createError(message: string): JSONRPCError {
  return { jsonrpc: '2.0', error: { code: -32000, message }, id: randomUUID() };
}

export async function defaultCorsMiddleware(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, mcp-session-id, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }
  return true;
}

export async function defaultAuthMiddleware(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  const clientIp = req.socket.remoteAddress;
  const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || (req.headers.host || '').startsWith('localhost');
  if (isLocalhost) return true;

  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return false;
  }
  const token = auth.substring(7);
  try {
    const publicKey = await fetchPublicKey();
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'fractal-auth',
      audience: 'fractal',
    });
    (req as any).auth = payload;
    return true;
  } catch (err) {
    res.status(401).json({ error: 'invalid_token', details: (err as Error).message });
    return false;
  }
}

export function createNextApiHandler(mcpServer: IMcpConnectable) {
  const transports: Record<string, StreamableHTTPServerTransport> = {};
  return async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!await defaultCorsMiddleware(req, res)) return;
    if (!await defaultAuthMiddleware(req, res)) return;

    const sessionId = req.headers[SESSION_ID_HEADER] as string | undefined;
    const body = req.body;

    if (req.method === 'GET') {
      if (!sessionId || !transports[sessionId]) {
        res.status(400).json(createError('Bad Request: invalid session ID'));
        return;
      }
      await transports[sessionId].handleRequest(req as any, res as any);
      return;
    }

    if (req.method === 'POST') {
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req as any, res as any, body);
        return;
      }

      if (!sessionId && isInitializeRequest(body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized(id) { transports[id] = transport; },
        });
        await mcpServer.connect(transport);
        await transport.handleRequest(req as any, res as any, body);
        if (transport.sessionId) transports[transport.sessionId] = transport;
        return;
      }

      res.status(400).json(createError('Bad Request: invalid session or method'));
      return;
    }

    res.status(405).end();
  };
}

export function healthHandler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ status: 'ok' });
}
