import type { NextRequest } from 'next/server';

async function proxy(req: NextRequest) {
  const url = new URL('/api/mcp', req.url);
  const res = await fetch(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.method === 'POST' ? req.body : undefined,
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
}

export async function GET(req: NextRequest) { return proxy(req); }
export async function POST(req: NextRequest) { return proxy(req); }
export async function OPTIONS(req: NextRequest) { return proxy(req); }
