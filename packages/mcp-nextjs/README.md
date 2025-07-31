# @fractal-mcp/mcp-nextjs

Next.js utilities for hosting Model Context Protocol (MCP) servers. This mirrors the functionality of `@fractal-mcp/mcp-express` but targets Next.js applications.

## Installation
```bash
npm install @fractal-mcp/mcp-nextjs
```

## Usage

Create a Next.js API route using the **pages** router:

```typescript
// pages/api/mcp.ts
import { FractalMCPServer } from '@fractal-mcp/mcp';
import { createNextApiHandler } from '@fractal-mcp/mcp-nextjs';

const mcpServer = new FractalMCPServer({ name: 'example', version: '1.0.0' });
// register tools ...

export default createNextApiHandler(mcpServer);
```

For projects using the newer **app** router you can proxy requests to the pages route:

```typescript
// app/api/mcp/route.ts
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  return fetch(new URL('/api/mcp', req.url), { headers: req.headers });
}
export async function POST(req: NextRequest) {
  return fetch(new URL('/api/mcp', req.url), {
    method: 'POST',
    headers: req.headers,
    body: req.body,
  });
}
```

The helpers `defaultCorsMiddleware` and `defaultAuthMiddleware` are available if you need more control.
