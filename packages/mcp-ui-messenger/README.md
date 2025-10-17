# @fractal-mcp/mcp-ui-messenger

MCP UI compatible cross-iframe messenger for embedding interactive UIs. Implements the [MCP-UI embeddable UI protocol](https://mcpui.dev/guide/embeddable-ui).

## Installation

```bash
npm install @fractal-mcp/mcp-ui-messenger
```

## Quick Start

```typescript
import { initUIMessenger } from '@fractal-mcp/mcp-ui-messenger';

// Initialize the messenger BEFORE mounting React app
// (blocks until render data received if waitForRenderData=true in URL)
const messenger = await initUIMessenger({
  rootElId: 'root',           // Element to observe for size changes
  forceWaitForRenderData: false,  // Force wait even without query param
  log: false                  // Enable debug logging
});

// Get initial render data from host
const renderData = messenger.getRenderData();
console.log('Theme:', renderData?.theme);

// Mount your app (react example shown)
root.render(<App messenger={messenger} renderData={renderData} />);
```

## Core API

### Initialization

```typescript
// Async init - waits for render data if needed
const messenger = await initUIMessenger({ rootElId: 'root' });

```

### Render Data

```typescript
// Get cached render data (synchronous)
// Best if you're willing to call initUIMessenger before mounting your app
const data = messenger.getRenderData();

// Wait for render data (if not received yet)
const data = await messenger.waitForRenderData();

// Explicitly request fresh render data from host
const data = await messenger.requestRenderData();
```

### Sending Messages to Host

#### Fire-and-forget (emit)
```typescript
// Send intent (user action that host should handle)
messenger.emitIntent({ 
  intent: 'create-task', 
  params: { title: 'Buy groceries' } 
});

// Notify host of state change
messenger.emitNotify({ message: 'cart-updated' });

// Ask host to run a prompt
messenger.emitPrompt({ prompt: 'What is the weather in Tokyo?' });

// Ask host to call a tool
messenger.emitTool({ 
  toolName: 'get-weather', 
  params: { city: 'Tokyo' } 
});

// Ask host to navigate
messenger.emitLink({ url: 'https://example.com' });
```

#### Request-response (with tracking)
```typescript
// Get acknowledgment and result
const req = messenger.requestIntent({ 
  intent: 'create-task', 
  params: { title: 'Buy groceries' } 
});

// Wait for host to process
const result = await req.response();
console.log('Result:', result);

// Same pattern for other message types
const toolReq = messenger.requestTool({ toolName: 'get-weather', params: {} });
const toolResult = await toolReq.response();
```

### Custom Data Requests

```typescript
// Request additional data from host
const req = messenger.requestData({ 
  requestType: 'get-payment-methods',
  params: { userId: '123' }
});

const methods = await req.response();
```

### Cleanup

```typescript
// Stop size observer
messenger.stopResizeObserver();

// Full cleanup
messenger.destroy();
```

## Usage in React

```typescript
import { useEffect, useState } from 'react';
import { initUIMessenger, UIMessenger } from '@fractal-mcp/mcp-ui-messenger';

function App() {
  const [messenger, setMessenger] = useState<UIMessenger | null>(null);
  const [renderData, setRenderData] = useState<any>(null);

  useEffect(() => {
    initUIMessenger({ rootElId: 'root' })
      .then(m => {
        setMessenger(m);
        setRenderData(m.getRenderData());
      });

    return () => messenger?.destroy();
  }, []);

  const handleAction = () => {
    messenger?.emitIntent({ 
      intent: 'user-action',
      params: { foo: 'bar' }
    });
  };

  return (
    <div id="root">
      <h1>Theme: {renderData?.theme}</h1>
      <button onClick={handleAction}>Send Intent</button>
    </div>
  );
}
```

## Usage in Vanilla JS

```html
<!DOCTYPE html>
<html>
<body>
  <div id="root">
    <button id="btn">Click me</button>
  </div>

  <script type="module">
    import { initUIMessenger } from '@fractal-mcp/mcp-ui-messenger';

    const messenger = await initUIMessenger({ rootElId: 'root' });
    const renderData = messenger.getRenderData();
    
    document.getElementById('btn').addEventListener('click', () => {
      messenger.emitIntent({ 
        intent: 'button-clicked',
        params: { timestamp: Date.now() }
      });
    });
  </script>
</body>
</html>
```

## How It Works

1. **Initialization**: Iframe sends `ui-lifecycle-iframe-ready` to parent
2. **Render Data**: Parent responds with `ui-lifecycle-iframe-render-data`
3. **Size Observer**: Automatically reports size changes via `ui-size-change`
4. **Messages**: Send intents, notifications, prompts, tool calls, and custom requests
5. **Tracking**: Use `request*` methods for response tracking via message IDs

## Automatic Behaviors

### Size Change Events

The messenger **automatically handles `ui-size-change` events** for you. When you initialize with a `rootElId`, a `ResizeObserver` watches that element and sends size updates to the host whenever dimensions change. You don't need to manually send these events.

```typescript
const messenger = await initUIMessenger({ rootElId: 'root' });
// Size changes are automatically reported to the host!
```

### Request Response Tracking

When you use `request*` methods (e.g., `requestIntent`, `requestTool`), you receive an `RpcRequest` object that **automatically handles `ui-message-received` and `ui-message-response` events** behind the scenes.

The `RpcRequest` object provides:
- **`response()` method**: Returns a Promise that resolves when the host sends `ui-message-response`
- **Automatic correlation**: Message IDs are tracked internally, you don't need to handle them

**Basic Example:**
```typescript
// Send a tool request and wait for response
const req = messenger.requestTool({ 
  toolName: 'get-weather', 
  params: { city: 'Tokyo' } 
});

// The RpcRequest automatically listens for ui-message-received 
// and ui-message-response events
const result = await req.response();
console.log('Weather data:', result);
```

**Advanced: Tracking Request State**

The `RpcRequest` object provides `received()` and `response()` methods if you need to track the request lifecycle (e.g., show loading states):

```typescript
import { useState } from 'react';
import { initUIMessenger } from '@fractal-mcp/mcp-ui-messenger';

function WeatherWidget({ messenger }) {
  const [status, setStatus] = useState('idle');
  const [weather, setWeather] = useState(null);

  const fetchWeather = async () => {
    setStatus('sending');
    
    const req = messenger.requestTool({ 
      toolName: 'get-weather',
      params: { city: 'Tokyo' }
    });

    // Wait for acknowledgment from host
    req.received().then(() => {
      setStatus('processing'); // Host acknowledged, now processing
    });

    // Wait for the final response
    try {
      const result = await req.response();
      setStatus('success');
      setWeather(result);
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div>
      <button onClick={fetchWeather}>Get Weather</button>
      {status === 'sending' && <p>Sending request...</p>}
      {status === 'processing' && <p>Host is processing...</p>}
      {status === 'success' && <p>Weather: {JSON.stringify(weather)}</p>}
      {status === 'error' && <p>Failed to get weather</p>}
    </div>
  );
}
```

**How it works under the hood:**

The messenger:
1. Generates a unique `messageId` for your request
2. Sends the message to the host with that ID
3. Listens for `ui-message-received` (resolves `received()` Promise)
4. Listens for `ui-message-response` (resolves `response()` Promise)
5. Handles message correlation automatically

You don't need to worry about message IDs or manual event handlers - it's all handled for you!

## Protocol Reference

See [MCP-UI Embeddable UI Protocol](https://mcpui.dev/guide/embeddable-ui) for full specification.

### Message Types (iframe → host)
- `intent` - User expressed an intent
- `notify` - State change notification
- `prompt` - Run a prompt
- `tool` - Call a tool
- `link` - Navigate to URL
- `ui-request-data` - Request custom data
- `ui-size-change` - Size changed
- `ui-lifecycle-iframe-ready` - Iframe ready
- `ui-request-render-data` - Request render data

### Message Types (host → iframe)
- `ui-lifecycle-iframe-render-data` - Render data
- `ui-message-received` - Acknowledgment
- `ui-message-response` - Response with result/error

## License

See repository root for license information.

