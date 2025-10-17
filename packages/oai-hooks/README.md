# @fractal-mcp/oai-hooks

React hooks for building [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/) compatible widget UIs that communicate with ChatGPT.

## What is this?

OpenAI's [Apps SDK](https://developers.openai.com/apps-sdk/) allows developers to build rich, interactive widget applications for ChatGPT using the Model Context Protocol (MCP). This package provides **client-side React hooks** for your widget UI components to:

- Access widget props passed from the MCP server
- Manage persistent widget state across re-renders
- Respond to layout changes (max height, display mode)
- Access ChatGPT's global context (theme, safe area, etc.)

This is the **UI companion** to [@fractal-mcp/oai-server](https://github.com/fractal-mcp/sdk/tree/main/packages/oai-server), which handles the server-side widget registration.

## Credits

This package is based on the reference hooks from [OpenAI's Apps SDK Examples](https://github.com/openai/openai-apps-sdk-examples/). The original code provides excellent patterns for building widget UIs, but isn't published as an importable npm package. This package makes those hooks easily installable and reusable across projects.

## Installation

```bash
npm install @fractal-mcp/oai-hooks
```

## API Overview

This package provides hooks based on the **official [OpenAI Apps SDK API](https://developers.openai.com/apps-sdk/build/custom-ux)**. All hooks use the `window.openai` global and the `openai:set_globals` event pattern from OpenAI's documentation.

### Core Hooks

| Hook | Description | Based on Official SDK |
|------|-------------|----------------------|
| `useOpenAiGlobal(key)` | Access any `window.openai` property reactively | ✅ Official pattern |
| `useToolOutput()` | Get tool output data | ✅ `window.openai.toolOutput` |
| `useToolInput()` | Get tool input arguments | ✅ `window.openai.toolInput` |
| `useToolResponseMetadata()` | Get tool response metadata | ✅ `window.openai.toolResponseMetadata` |
| `useTheme()` | Get current theme (light/dark) | ✅ `window.openai.theme` |
| `useDisplayMode()` | Get display mode (inline/pip/fullscreen) | ✅ `window.openai.displayMode` |
| `useMaxHeight()` | Get max height constraint | ✅ `window.openai.maxHeight` |
| `useSafeArea()` | Get safe area insets (mobile) | ✅ `window.openai.safeArea` |
| `useWidgetState()` | Manage persistent state | ✅ Uses `window.openai.setWidgetState` |

### Legacy Hooks (Backward Compatibility)

| Hook | Description | Status |
|------|-------------|--------|
| `useWebplusGlobal(key)` | Access legacy `window.webplus` | 🔄 Legacy (still works) |
| `useWidgetProps()` | Legacy alias for `useToolOutput()` | 🔄 Legacy (still works) |

## Quick Start

Here's a simple widget that displays props and manages state:

```tsx
import { 
  useToolOutput, 
  useWidgetState, 
  useTheme,
  useOpenAiGlobal 
} from "@fractal-mcp/oai-hooks";

function WeatherWidget() {
  // Official OpenAI Apps SDK API - get tool output
  const props = useToolOutput<{ location: string; temp: number }>();
  
  // Get current theme
  const theme = useTheme();
  
  // Manage widget state (persisted across re-renders)
  const [state, setState] = useWidgetState({ unit: "fahrenheit" });

  const toggleUnit = () => {
    setState({ unit: state.unit === "fahrenheit" ? "celsius" : "fahrenheit" });
  };

  const displayTemp = state.unit === "celsius" 
    ? Math.round((props.temp - 32) * 5/9)
    : props.temp;

  return (
    <div className={`widget ${theme}`}>
      <h2>Weather in {props.location}</h2>
      <p>{displayTemp}°{state.unit === "celsius" ? "C" : "F"}</p>
      <button onClick={toggleUnit}>Toggle Unit</button>
    </div>
  );
}
```

## Core Hooks

### `useWidgetProps<T>(defaultState?)`

Access props passed from the MCP server's tool response.

**What it does:**
- Reads `structuredContent` from your server's tool response
- Provides type-safe access to widget props
- Falls back to `defaultState` if no props are available

**Type Parameters:**
- `T` - Shape of your props object

**Parameters:**
- `defaultState` (optional) - Default props or factory function

**Returns:** Props object of type `T`

**Example:**
```tsx
import { useWidgetProps } from "@fractal-mcp/oai-hooks";

interface FlightProps {
  from: string;
  to: string;
  price: number;
}

function FlightWidget() {
  const props = useWidgetProps<FlightProps>({
    from: "SFO",
    to: "JFK", 
    price: 0
  });

  return (
    <div>
      Flight: {props.from} → {props.to} - ${props.price}
    </div>
  );
}
```

---

### `useWidgetState<T>(defaultState?)`

Manage persistent widget state that survives re-renders and can be accessed by the server.

**What it does:**
- Provides React state that persists across widget re-renders
- Syncs state with ChatGPT's widget state system
- Allows the server to read widget state if needed

**Type Parameters:**
- `T extends WidgetState` - Shape of your state object

**Parameters:**
- `defaultState` (optional) - Initial state or factory function

**Returns:** Tuple of `[state, setState]` (similar to `useState`)

**Example:**
```tsx
import { useWidgetState } from "@fractal-mcp/oai-hooks";

interface CounterState {
  count: number;
}

function CounterWidget() {
  const [state, setState] = useWidgetState<CounterState>({ count: 0 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => setState({ count: state.count + 1 })}>
        Increment
      </button>
    </div>
  );
}
```

---

### `useDisplayMode()`

Access the current display mode of your widget.

**What it does:**
- Returns the current display mode: `"inline"`, `"pip"`, or `"fullscreen"`
- Updates when the display mode changes
- Useful for responsive layouts

**Returns:** `DisplayMode | null` - Current display mode

**Example:**
```tsx
import { useDisplayMode } from "@fractal-mcp/oai-hooks";

function ResponsiveWidget() {
  const displayMode = useDisplayMode();

  return (
    <div className={`widget-${displayMode}`}>
      {displayMode === "fullscreen" && <DetailedView />}
      {displayMode === "inline" && <CompactView />}
      {displayMode === "pip" && <MinimalView />}
    </div>
  );
}
```

---

### `useMaxHeight()`

Access the maximum height constraint for your widget.

**What it does:**
- Returns the max height (in pixels) your widget should respect
- Updates when the constraint changes
- Useful for scrollable content or dynamic layouts

**Returns:** `number | null` - Max height in pixels

**Example:**
```tsx
import { useMaxHeight } from "@fractal-mcp/oai-hooks";

function ScrollableWidget() {
  const maxHeight = useMaxHeight();

  return (
    <div style={{ maxHeight: maxHeight || "100vh", overflow: "auto" }}>
      <LongContent />
    </div>
  );
}
```

---

### `useWebplusGlobal<K>(key)`

Low-level hook to access any global value from ChatGPT's widget context.

**What it does:**
- Provides access to the underlying `window.webplus` global object
- Useful for advanced use cases not covered by other hooks
- Automatically subscribes to changes for the specified key

**Type Parameters:**
- `K extends keyof WebplusGlobals` - Key of the global to access

**Parameters:**
- `key` - The global property name (e.g., `"theme"`, `"safeArea"`)

**Returns:** Value of the specified global

**Available globals:**
- `theme`: `"light" | "dark"` - Current theme
- `userAgent`: `UserAgent` - User agent info
- `maxHeight`: `number` - Max height constraint
- `displayMode`: `DisplayMode` - Display mode
- `safeArea`: `SafeArea` - Safe area insets (for mobile)
- `toolInput`: `object` - Tool input arguments
- `toolOutput`: `object` - Tool output (same as `useWidgetProps`)
- `widgetState`: `object | null` - Widget state (same as `useWidgetState`)
- `setWidgetState`: `function` - Set widget state

**Example:**
```tsx
import { useWebplusGlobal } from "@fractal-mcp/oai-hooks";

function ThemedWidget() {
  const theme = useWebplusGlobal("theme");
  const safeArea = useWebplusGlobal("safeArea");

  return (
    <div 
      className={theme}
      style={{ 
        paddingTop: safeArea.insets.top,
        paddingBottom: safeArea.insets.bottom 
      }}
    >
      Theme: {theme}
    </div>
  );
}
```

## How It Works

### Props Flow
1. Your MCP server tool handler returns `structuredContent`
2. ChatGPT injects this data into `window.webplus.toolOutput`
3. `useWidgetProps()` reads from this global and provides it to your component

### State Persistence
1. `useWidgetState()` initializes with `defaultState` or reads from `window.webplus.widgetState`
2. When you call `setState()`, the hook:
   - Updates local React state
   - Calls `window.webplus.setWidgetState()` to persist
3. ChatGPT stores this state and restores it when the widget re-renders

### Global Context
- ChatGPT injects a `window.webplus` object with layout info, theme, etc.
- Hooks subscribe to changes via custom events
- Fallback values are provided when running outside ChatGPT (for development)

## TypeScript Support

All hooks are fully typed. Define your own interfaces for type safety:

```tsx
import { useWidgetProps, useWidgetState } from "@fractal-mcp/oai-hooks";

interface MyProps {
  userId: string;
  data: Array<{ id: number; name: string }>;
}

interface MyState {
  selectedId: number | null;
  filter: string;
}

function MyWidget() {
  const props = useWidgetProps<MyProps>();
  const [state, setState] = useWidgetState<MyState>({
    selectedId: null,
    filter: ""
  });

  // Fully typed!
  const handleSelect = (id: number) => {
    setState({ ...state, selectedId: id });
  };

  return <div>{/* ... */}</div>;
}
```

## Development & Testing

These hooks provide fallback values when `window.webplus` is not available, so you can develop your widgets in a standard React environment:

```tsx
// Works in development without ChatGPT
function DevWidget() {
  const props = useWidgetProps({ foo: "default" }); // Uses default
  const [state, setState] = useWidgetState({ count: 0 }); // Works locally
  
  return <div>Count: {state.count}</div>;
}
```

The hooks automatically detect the ChatGPT environment and use real globals when available.

## Bundling Your Widget

To use these hooks in a ChatGPT widget, you need to bundle your React component into a standalone file. Use [@fractal-mcp/bundle](https://github.com/fractal-mcp/sdk/tree/main/packages/bundle) to create widget bundles:

```bash
npx @fractal-mcp/bundle bundle-widget src/MyWidget.tsx -o dist/my-widget.html
```

Then reference the bundled file in your server's widget configuration:

```typescript
import { registerOpenAIWidget } from "@fractal-mcp/oai-server";

registerOpenAIWidget(
  server,
  {
    id: "my-widget",
    title: "My Widget",
    templateUri: "ui://widget/my-widget.html",
    html: `
      <div id="root"></div>
      <script type="module" src="https://your-cdn.com/my-widget.js"></script>
    `,
    // ...
  },
  handler
);
```

## API Reference Summary

| Hook | Purpose | Returns |
|------|---------|---------|
| `useWidgetProps<T>()` | Access server-provided props | `T` |
| `useWidgetState<T>()` | Manage persistent state | `[T, setter]` |
| `useDisplayMode()` | Get display mode | `DisplayMode \| null` |
| `useMaxHeight()` | Get max height constraint | `number \| null` |
| `useWebplusGlobal<K>()` | Access any global value | `WebplusGlobals[K]` |

## Examples

See the [examples directory](../../apps/examples/mcp-ui) for complete working examples:
- Counter widget with state management
- Hello/Goodbye widget with props
- Themed widget with display mode

## License

MIT

