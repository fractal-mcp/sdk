# @fractal-mcp/mcp-ui-hooks

React hooks for MCP UI compatible cross-iframe messaging. Makes it dead simple to build embeddable UIs.

> **Note:** This package is not directly compatible with OpenAI Apps SDK. For OpenAI Apps, use `@fractal-mcp/oai-hooks` instead.

## Installation

```bash
npm install @fractal-mcp/mcp-ui-hooks
```

## Quick Start

```typescript
import { useUIMessenger } from '@fractal-mcp/mcp-ui-hooks';

function App() {
  const { ready, renderData, emitIntent } = useUIMessenger();

  if (!ready) return <div>Loading...</div>;

  return (
    <div>
      <h1>Theme: {renderData?.theme}</h1>
      <button onClick={() => emitIntent({ 
        intent: 'button-clicked',
        params: { timestamp: Date.now() }
      })}>
        Click Me
      </button>
    </div>
  );
}
```

That's it! The hook handles initialization, render data, and cleanup automatically.

## API

### `useUIMessenger(options?)`

Returns an object with messaging functions and state.

```typescript
const {
  ready,              // boolean - messenger is initialized
  renderData,         // Record<string, unknown> - data from host
  emitIntent,         // Send intent (fire-and-forget)
  emitNotify,         // Send notification
  emitPrompt,         // Ask host to run prompt
  emitTool,           // Ask host to call tool
  emitLink,           // Ask host to navigate
  requestIntent,      // Send intent and wait for response
  requestNotify,      // Send notification and wait for response
  requestPrompt,      // Send prompt and wait for response
  requestTool,        // Send tool call and wait for response ()
  requestLink,        // Send link and wait for response
  requestData,        // Request custom data from host
} = useUIMessenger({ forceWaitForRenderData: true });
```

### Options

```typescript
{
  forceWaitForRenderData?: boolean;  // Wait for render data even without URL param
}
```

## Usage Examples

### Send Intent (Fire-and-Forget)

```typescript
function TaskCreator() {
  const { emitIntent } = useUIMessenger();

  const createTask = () => {
    emitIntent({ 
      intent: 'create-task',
      params: { 
        title: 'Buy groceries',
        priority: 'high'
      }
    });
  };

  return <button onClick={createTask}>Create Task</button>;
}
```

### Request with Response (Basic)

```typescript
function WeatherWidget() {
  const { requestTool } = useUIMessenger();
  const [weather, setWeather] = useState(null);

  const getWeather = async () => {
    const req = await requestTool({ 
      toolName: 'get-weather',
      params: { city: 'Tokyo' }
    });
    
    const result = await req.response();
    setWeather(result);
  };

  return (
    <div>
      <button onClick={getWeather}>Get Weather</button>
      {weather && <div>{JSON.stringify(weather)}</div>}
    </div>
  );
}
```

### Request with Response (Advanced: Tracking State)

Track the request lifecycle to show loading states:

```typescript
function WeatherWidget() {
  const { requestTool } = useUIMessenger();
  const [status, setStatus] = useState('idle');
  const [weather, setWeather] = useState(null);

  const getWeather = async () => {
    setStatus('sending');
    
    const req = await requestTool({ 
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
      <button onClick={getWeather} disabled={status !== 'idle' && status !== 'success' && status !== 'error'}>
        Get Weather
      </button>
      {status === 'sending' && <p>Sending request...</p>}
      {status === 'processing' && <p>Host is processing...</p>}
      {status === 'success' && <p>Weather: {JSON.stringify(weather)}</p>}
      {status === 'error' && <p>Failed to get weather</p>}
    </div>
  );
}
```

The `RpcRequest` object provides:
- **`received()`**: Promise that resolves when host sends `ui-message-received` (acknowledgment)
- **`response()`**: Promise that resolves when host sends `ui-message-response` (final result)

See the [mcp-ui-messenger automatic behaviors documentation](../mcp-ui-messenger/README.md#automatic-behaviors) for more details.

### Notify Host of State Changes

```typescript
function ShoppingCart() {
  const { emitNotify } = useUIMessenger();
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems([...items, item]);
    emitNotify({ message: 'cart-updated' });
  };

  return <div>{/* cart UI */}</div>;
}
```

### Request Custom Data

```typescript
function PaymentMethods() {
  const { requestData } = useUIMessenger();
  const [methods, setMethods] = useState([]);

  useEffect(() => {
    requestData({ 
      requestType: 'get-payment-methods',
      params: { userId: '123' }
    }).then(req => req.response())
      .then(setMethods);
  }, []);

  return <ul>{methods.map(m => <li key={m.id}>{m.name}</li>)}</ul>;
}
```

### Use Render Data

```typescript
function ThemedApp() {
  const { renderData } = useUIMessenger();

  const theme = renderData?.theme || 'light';
  const locale = renderData?.locale || 'en';

  return (
    <div className={`theme-${theme}`} lang={locale}>
      {/* your app */}
    </div>
  );
}
```

### Ask Host to Run a Prompt

```typescript
function AIAssistant() {
  const { requestPrompt } = useUIMessenger();

  const askAI = async () => {
    const req = await requestPrompt({ 
      prompt: 'What is the weather in Tokyo?' 
    });
    const response = await req.response();
    console.log('AI response:', response);
  };

  return <button onClick={askAI}>Ask AI</button>;
}
```

## Alias: `useFractal`

For convenience, `useFractal` is exported as an alias:

```typescript
import { useFractal } from '@fractal-mcp/mcp-ui-hooks';

function App() {
  const { ready, emitIntent } = useFractal();
  // ... same as useUIMessenger
}
```

## Message Types

### Fire-and-Forget (emit)
- `emitIntent({ intent, params })` - User expressed an intent
- `emitNotify({ message })` - Notify host of state change
- `emitPrompt({ prompt })` - Ask host to run a prompt
- `emitTool({ toolName, params })` - Ask host to call a tool
- `emitLink({ url })` - Ask host to navigate

### Request-Response
- `requestIntent()` - Send intent and get response
- `requestNotify()` - Send notification and get response
- `requestPrompt()` - Send prompt and get response
- `requestTool()` - Send tool call and get response
- `requestLink()` - Send link request and get response
- `requestData({ requestType, params })` - Request custom data

## TypeScript Types

All payload types are re-exported from `@fractal-mcp/mcp-ui-messenger`:

```typescript
interface IntentPayload {
  intent: string;
  params?: Record<string, unknown>;
}

interface NotifyPayload {
  message: string;
}

interface PromptPayload {
  prompt: string;
}

interface ToolPayload {
  toolName: string;
  params?: Record<string, unknown>;
}

interface LinkPayload {
  url: string;
}

interface RequestDataPayload {
  requestType: string;
  params?: Record<string, unknown>;
}
```

## How It Works

1. Hook calls `initUIMessenger()` on mount
2. Automatically handles iframe lifecycle (ready event, render data)
3. Provides ready state and render data via hook return
4. All messaging functions wait for initialization before sending

### Automatic Message Handling

The underlying messenger automatically handles MCP-UI protocol details for you:

- **Size changes**: Automatically reported to the host via `ui-size-change` events
- **Request tracking**: `request*` methods automatically handle `ui-message-received` and `ui-message-response` events using message IDs

For more details, see the [mcp-ui-messenger automatic behaviors documentation](../mcp-ui-messenger/README.md#automatic-behaviors).

## Advanced: Init Before React

If you need render data before React mounts, use the base package:

```typescript
import { initUIMessenger } from '@fractal-mcp/mcp-ui-hooks';

const messenger = await initUIMessenger({ rootElId: 'root' });
const renderData = messenger.getRenderData();

root.render(<App messenger={messenger} renderData={renderData} />);
```

Then in your components, just call `useUIMessenger()` and it will use the existing instance.

## Protocol

Implements the [MCP-UI Embeddable UI Protocol](https://mcpui.dev/guide/embeddable-ui).

## License

See repository root for license information.

