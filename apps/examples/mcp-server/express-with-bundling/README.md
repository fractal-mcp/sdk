# Express MCP Server with Component Bundling

This example demonstrates how to use `@fractal-mcp/bundle` to bundle React components at server startup and serve them as self-contained HTML via MCP tools.

## Features

- ✅ Bundles React components on server start using `bundleReactComponent()`
- ✅ Serves bundled HTML via MCP tools using the `rawHtml` content type
- ✅ No separate frontend server needed - everything is bundled into a single HTML file
- ✅ Components work completely offline and self-contained

## How it Works

1. **On Server Start**: The Hello component from `hello-example-react` is bundled into a single HTML file
2. **On Tool Call**: The bundled HTML is read and returned as a `rawHtml` resource
3. **Client Side**: The client renders the HTML in an iframe with the provided render data

## Usage

```bash
# Install dependencies
npm install

# Build and start the server
npm run build
npm start
```

The server will:
1. Bundle the Hello component on startup
2. Start listening on port 3000
3. Expose `hello` and `goodbye` tools that return bundled UI

## Architecture

```
┌─────────────────────┐
│  Server Startup     │
│  1. Bundle Hello    │──────┐
│     component       │      │
└─────────────────────┘      │
                             ▼
                    ┌─────────────────┐
                    │  bundled/       │
                    │  index.html     │
                    └─────────────────┘
                             │
                             │ Read on tool call
                             ▼
┌─────────────────────────────────────┐
│  MCP Tool Response                  │
│  {                                  │
│    content: [{                      │
│      type: 'rawHtml',              │
│      htmlString: '<!DOCTYPE...'    │
│    }]                               │
│  }                                  │
└─────────────────────────────────────┘
```

## Key Differences from External URL Approach

| Aspect | External URL | Bundled HTML |
|--------|-------------|--------------|
| Frontend Server | Required | Not needed |
| Network Requests | Multiple (HTML, JS, CSS) | Single HTML file |
| Offline Support | No | Yes |
| Build Time | On request | On server start |
| File Size | Smaller individual files | Larger single file (~370KB) |

## Benefits of Bundling

1. **Self-Contained**: Everything in one HTML file - no external dependencies
2. **Offline**: Works without internet connection
3. **Simple Deployment**: No need to manage separate frontend server
4. **Fast**: Single file load, all resources inlined

## Trade-offs

1. **Larger Payload**: ~370KB for React component vs separate files
2. **Build Time**: Bundling takes time on server start
3. **Caching**: Cannot cache JS/CSS separately from HTML
