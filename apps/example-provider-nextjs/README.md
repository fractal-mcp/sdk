# Next.js MCP Server Provider

This example mirrors the weather provider but exposes the MCP server through Next.js.

The **pages** router is used for the main API at `pages/api/mcp.ts`. Since the Next.js **app** router is the modern approach, a thin proxy is included under `app/api/mcp/route.ts` so either router works.

## Run the dev server

```bash
npm run dev
```

## Build and start

```bash
npm run build
npm run start
```
