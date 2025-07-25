# @fractal-mcp/render

React components for hosting sandboxed Fractal widgets inside iframes with secure MessageChannel communication. Provides imperative APIs for sending commands and receiving events from embedded widgets.

## Installation

```bash
npm install @fractal-mcp/render
```

## Overview

The `@fractal-mcp/render` package provides React components and utilities for rendering Fractal widgets in secure, sandboxed iframes. It includes:

- **FractalComponent** - Individual iframe-based widget renderer
- **FractalFrame** - JSX-based layout renderer with multiple widgets
- **Secure Communication** - MessageChannel-based widget communication
- **Automatic Resizing** - Dynamic iframe sizing based on content
- **Event Handling** - Comprehensive event system for widget interactions
- **DOM Manipulation** - Remote DOM interaction capabilities

## Quick Start

### Basic Widget Rendering

```tsx
import { FractalComponent } from '@fractal-mcp/render';

function MyApp() {
  return (
    <FractalComponent
      srcDoc="<div>Hello from widget!</div>"
      onEvent={(event) => console.log('Widget event:', event)}
    />
  );
}
```

### Layout with Multiple Widgets

```tsx
import { FractalFrame } from '@fractal-mcp/render';

function Dashboard() {
  const jsx = `
    <div className="dashboard">
      <Frac id="header" />
      <div className="content">
        <Frac id="sidebar" />
        <Frac id="main" />
      </div>
    </div>
  `;
  
  const map = {
    header: {
      component: { html: '<header>Dashboard Header</header>' },
      data: { title: 'My Dashboard' }
    },
    sidebar: {
      component: { html: '<nav>Navigation</nav>' },
      data: { items: ['Home', 'Profile', 'Settings'] }
    },
    main: {
      component: { html: '<main>Main Content</main>' },
      data: { content: 'Welcome to the dashboard' }
    }
  };

  return (
    <FractalFrame
      jsx={jsx}
      map={map}
      onEvent={(event) => console.log('Frame event:', event)}
    />
  );
}
```

## API Reference

### `FractalComponent`

A React component that renders a single Fractal widget in a sandboxed iframe.

#### Props

```typescript
interface Props {
  src?: string;                    // URL of iframe content
  srcDoc?: string;                 // HTML content string (takes precedence over src)
  data?: unknown;                  // Arbitrary data available to the widget
  onEvent?: (e: FractalUIEvent) => void; // Event handler for widget events
  sandbox?: string;                // iframe sandbox attribute (default: 'allow-scripts allow-same-origin')
  handlers?: CommandHandlers;      // Custom command handlers
  registryUrl?: string;           // Custom registry URL for MCP calls
}
```

#### Example

```tsx
import { FractalComponent, FractalComponentHandle } from '@fractal-mcp/render';
import { useRef } from 'react';

function WeatherWidget() {
  const widgetRef = useRef<FractalComponentHandle>(null);

  const handleWeatherEvent = (event) => {
    if (event.type === 'action' && event.data.name === 'refresh') {
      // Handle refresh action
      console.log('Refreshing weather data...');
    }
  };

  const clickButton = async () => {
    await widgetRef.current?.click({ id: 'refresh-btn', xpath: '' });
  };

  return (
    <div>
      <button onClick={clickButton}>Click Widget Button</button>
      <FractalComponent
        ref={widgetRef}
        srcDoc={`
          <div>
            <h2>Weather Widget</h2>
            <button id="refresh-btn">Refresh</button>
            <p>Temperature: 72°F</p>
          </div>
        `}
        onEvent={handleWeatherEvent}
      />
    </div>
  );
}
```

#### Imperative API

The component exposes an imperative API through refs:

```typescript
interface FractalComponentHandle {
  queryDom: (selector: string) => Promise<unknown>;
  click: (params: {id: string, xpath: string}) => Promise<unknown>;
  enterText: (params: {id: string, xpath: string, text: string}) => Promise<unknown>;
  send: (cmd: FractalEventType, data?: { name: string; params: Record<string, unknown> }) => Promise<unknown>;
}
```

**Methods:**

- `queryDom(selector)` - Query the widget's DOM structure
- `click(params)` - Programmatically click elements in the widget
- `enterText(params)` - Enter text into form fields
- `send(cmd, data)` - Send custom commands to the widget

**Example:**
```tsx
const widgetRef = useRef<FractalComponentHandle>(null);

// Query DOM
const html = await widgetRef.current?.queryDom('body');

// Click an element by ID
await widgetRef.current?.click({ id: 'submit-btn', xpath: '' });

// Click an element by XPath
await widgetRef.current?.click({ id: '', xpath: '//button[text()="Submit"]' });

// Enter text in a form field
await widgetRef.current?.enterText({ 
  id: 'username', 
  xpath: '', 
  text: 'john@example.com' 
});

// Send custom command
await widgetRef.current?.send('customAction', {
  name: 'updateData',
  params: { value: 'new data' }
});
```

---

### `FractalFrame`

A React component that renders JSX layouts containing multiple `<Frac />` elements, each resolved to a `FractalComponent`.

#### Props

```typescript
interface FractalFrameProps {
  jsx: string;                                    // JSX string containing <Frac /> elements
  map: Record<string, FractalDefinition>;        // Mapping of Frac IDs to component definitions
  onEvent?: (event: FractalFrameEvent) => void;  // Event handler for frame events
}

interface FractalDefinition {
  component: { html: string };    // Component HTML content
  data: unknown;                  // Component data
  toolName?: string;              // Optional tool name for tracking
}

interface FractalFrameEvent extends FractalUIEvent {
  toolName?: string;              // Tool that generated the component
  componentId: string;            // ID of the component that emitted the event
}
```

#### Example

```tsx
import { FractalFrame } from '@fractal-mcp/render';

function MultiWidgetLayout() {
  const jsx = `
    <div className="layout">
      <header>
        <Frac id="nav" />
      </header>
      <main>
        <aside><Frac id="sidebar" /></aside>
        <section><Frac id="content" /></section>
      </main>
      <footer>
        <Frac id="footer" />
      </footer>
    </div>
  `;

  const map = {
    nav: {
      component: { html: '<nav><a href="/">Home</a><a href="/about">About</a></nav>' },
      data: { currentPage: 'home' },
      toolName: 'navigation-tool'
    },
    sidebar: {
      component: { html: '<div>Sidebar content</div>' },
      data: { items: ['Item 1', 'Item 2'] },
      toolName: 'sidebar-tool'
    },
    content: {
      component: { html: '<article>Main content</article>' },
      data: { title: 'Welcome', body: 'Hello world!' },
      toolName: 'content-tool'
    },
    footer: {
      component: { html: '<footer>&copy; 2024 My App</footer>' },
      data: { year: 2024 },
      toolName: 'footer-tool'
    }
  };

  const handleFrameEvent = (event) => {
    console.log(`Event from ${event.componentId} (${event.toolName}):`, event);
    
    if (event.type === 'action') {
      switch (event.componentId) {
        case 'nav':
          handleNavigation(event.data);
          break;
        case 'sidebar':
          handleSidebarAction(event.data);
          break;
        // Handle other components...
      }
    }
  };

  return (
    <FractalFrame
      jsx={jsx}
      map={map}
      onEvent={handleFrameEvent}
    />
  );
}
```

#### Dynamic Updates

The `FractalFrame` component supports dynamic updates to both JSX and component mappings:

```tsx
function DynamicFrame() {
  const [jsx, setJsx] = useState('<div><Frac id="widget1" /></div>');
  const [map, setMap] = useState({
    widget1: {
      component: { html: '<div>Initial content</div>' },
      data: { message: 'Hello' }
    }
  });

  const addWidget = () => {
    setJsx('<div><Frac id="widget1" /><Frac id="widget2" /></div>');
    setMap(prev => ({
      ...prev,
      widget2: {
        component: { html: '<div>New widget</div>' },
        data: { message: 'World' }
      }
    }));
  };

  return (
    <div>
      <button onClick={addWidget}>Add Widget</button>
      <FractalFrame jsx={jsx} map={map} />
    </div>
  );
}
```

---

### `useFractalComponent`

A React hook that creates a ref for the `FractalComponent` imperative API.

```typescript
function useFractalComponent(): React.RefObject<FractalComponentHandle>
```

**Example:**
```tsx
import { useFractalComponent, FractalComponent } from '@fractal-mcp/render';

function MyWidget() {
  const widgetRef = useFractalComponent();

  const interactWithWidget = async () => {
    // Use the imperative API
    await widgetRef.current?.click({ id: 'button', xpath: '' });
    const dom = await widgetRef.current?.queryDom('body');
  };

  return (
    <FractalComponent
      ref={widgetRef}
      srcDoc="<button id='button'>Click me</button>"
    />
  );
}
```

---

### Layout Rendering Utilities

#### `renderLayout(toolInvocation, onEvent)`

Renders a layout from a tool invocation result containing component tool outputs.

**Parameters:**
- `toolInvocation: any` - Tool invocation result with layout and component data
- `onEvent: (event: FractalFrameEvent) => void` - Event handler

**Returns:** `React.ReactElement | null`

**Example:**
```tsx
import { renderLayout } from '@fractal-mcp/render';

function ToolResultRenderer({ toolResult }) {
  const handleEvent = (event) => {
    console.log('Layout event:', event);
  };

  // toolResult structure:
  // {
  //   result: {
  //     data: {
  //       layout: '<div><Frac id="comp1" /><Frac id="comp2" /></div>',
  //       componentToolOutputs: {
  //         comp1: { component: { html: '...' }, data: {...} },
  //         comp2: { component: { html: '...' }, data: {...} }
  //       }
  //     }
  //   }
  // }

  return (
    <div>
      <h2>Tool Result:</h2>
      {renderLayout(toolResult, handleEvent)}
    </div>
  );
}
```

#### `renderLayoutAsComponent(toolInvocation, onEvent)`

Renders a single component from a tool invocation result (uses the first component).

**Parameters:**
- `toolInvocation: any` - Tool invocation result with component data
- `onEvent: (event: FractalFrameEvent) => void` - Event handler

**Returns:** `React.ReactElement | null`

**Example:**
```tsx
import { renderLayoutAsComponent } from '@fractal-mcp/render';

function SingleComponentRenderer({ toolResult }) {
  const handleEvent = (event) => {
    console.log('Component event:', event);
  };

  return (
    <div>
      <h2>Single Component:</h2>
      {renderLayoutAsComponent(toolResult, handleEvent)}
    </div>
  );
}
```

---

## Event System

### Event Types

The render package handles various event types from widgets:

```typescript
interface FractalUIEvent {
  type: 'action' | 'navigate' | 'resize' | 'click' | 'enterText' | 'queryDom';
  data: {
    name: string;
    params: Record<string, unknown>;
  };
}

interface FractalFrameEvent extends FractalUIEvent {
  toolName?: string;      // Tool that generated the component
  componentId: string;    // ID of the component that emitted the event
}
```

### Event Handling Examples

```tsx
function EventHandlingExample() {
  const handleWidgetEvent = (event: FractalUIEvent) => {
    switch (event.type) {
      case 'action':
        console.log('Action:', event.data.name, event.data.params);
        // Handle widget actions (button clicks, form submissions, etc.)
        break;
        
      case 'navigate':
        console.log('Navigation:', event.data.name, event.data.params);
        // Handle navigation requests from widgets
        break;
        
      case 'resize':
        console.log('Resize:', event.data.params);
        // Widget size changed (handled automatically)
        break;
    }
  };

  const handleFrameEvent = (event: FractalFrameEvent) => {
    console.log(`Event from component ${event.componentId}:`, event);
    
    // Route events based on component ID or tool name
    if (event.toolName === 'user-profile-tool') {
      handleUserProfileEvent(event);
    } else if (event.componentId === 'navigation') {
      handleNavigationEvent(event);
    }
  };

  return (
    <div>
      {/* Single component */}
      <FractalComponent
        srcDoc="<button onclick='parent.postMessage({type: \"action\", data: {name: \"click\", params: {}}}, \"*\")'>Click</button>"
        onEvent={handleWidgetEvent}
      />
      
      {/* Multiple components */}
      <FractalFrame
        jsx="<div><Frac id='comp1' /><Frac id='comp2' /></div>"
        map={{
          comp1: { component: { html: '...' }, data: {} },
          comp2: { component: { html: '...' }, data: {} }
        }}
        onEvent={handleFrameEvent}
      />
    </div>
  );
}
```

---

## Security Features

### Sandboxing

All widgets run in sandboxed iframes with restricted permissions:

```tsx
// Default sandbox settings
<FractalComponent
  sandbox="allow-scripts allow-same-origin"
  srcDoc="<div>Sandboxed content</div>"
/>

// Custom sandbox settings
<FractalComponent
  sandbox="allow-scripts allow-forms allow-popups"
  srcDoc="<div>Custom sandbox</div>"
/>
```

### MessageChannel Communication

Secure communication between parent and widget using MessageChannel:

- No direct `postMessage` calls required
- Private communication channel per widget
- Automatic message routing and handling
- Type-safe event system

### Content Security

```tsx
// Safe: HTML content is sandboxed
<FractalComponent
  srcDoc="<script>console.log('Safe in sandbox')</script>"
/>

// External content with restrictions
<FractalComponent
  src="https://trusted-widget.example.com"
  sandbox="allow-scripts allow-same-origin"
/>
```

---

## Advanced Usage

### Custom Command Handlers

```tsx
interface CommandHandlers {
  [command: string]: (data: unknown, reply: (resp: unknown) => void) => void;
}

function AdvancedWidget() {
  const customHandlers: CommandHandlers = {
    customCommand: (data, reply) => {
      console.log('Custom command received:', data);
      reply({ status: 'success', result: 'processed' });
    },
    
    fetchData: async (data, reply) => {
      try {
        const result = await fetch('/api/data');
        const json = await result.json();
        reply({ data: json });
      } catch (error) {
        reply({ error: error.message });
      }
    }
  };

  return (
    <FractalComponent
      srcDoc="<div>Widget with custom handlers</div>"
      handlers={customHandlers}
    />
  );
}
```

### Integration with MCP Tools

```tsx
import { FractalFrame, callMcpTool } from '@fractal-mcp/render';

function McpIntegration() {
  const [layout, setLayout] = useState('');
  const [componentMap, setComponentMap] = useState({});

  const executeToolAndRender = async (toolName: string, args: any) => {
    try {
      const result = await callMcpTool(toolName, args);
      
      if (result.component && result.data) {
        const componentId = `tool-${Date.now()}`;
        setLayout(`<div><Frac id="${componentId}" /></div>`);
        setComponentMap({
          [componentId]: {
            component: result.component,
            data: result.data,
            toolName
          }
        });
      }
    } catch (error) {
      console.error('Tool execution failed:', error);
    }
  };

  return (
    <div>
      <button onClick={() => executeToolAndRender('weather-tool', { location: 'NYC' })}>
        Get Weather
      </button>
      
      {layout && (
        <FractalFrame
          jsx={layout}
          map={componentMap}
          onEvent={(event) => {
            if (event.type === 'action' && event.data.name === 'refresh') {
              executeToolAndRender(event.toolName!, event.data.params);
            }
          }}
        />
      )}
    </div>
  );
}
```

### Performance Optimization

```tsx
import { memo, useMemo } from 'react';
import { FractalFrame } from '@fractal-mcp/render';

// Memoize FractalFrame to prevent unnecessary re-renders
const MemoizedFractalFrame = memo(FractalFrame);

function OptimizedLayout({ widgets, onEvent }) {
  // Memoize expensive computations
  const jsx = useMemo(() => {
    return widgets.map(w => `<Frac id="${w.id}" />`).join('');
  }, [widgets]);

  const componentMap = useMemo(() => {
    return widgets.reduce((map, widget) => {
      map[widget.id] = {
        component: widget.component,
        data: widget.data,
        toolName: widget.toolName
      };
      return map;
    }, {});
  }, [widgets]);

  return (
    <MemoizedFractalFrame
      jsx={jsx}
      map={componentMap}
      onEvent={onEvent}
    />
  );
}
```

---

## Error Handling

### Component Error Boundaries

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert" style={{ padding: '20px', border: '1px solid red' }}>
      <h2>Widget Error</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function SafeWidgetRenderer() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <FractalComponent
        srcDoc="<div>Potentially problematic widget</div>"
        onEvent={(event) => {
          // Handle events safely
          try {
            processEvent(event);
          } catch (error) {
            console.error('Event handling error:', error);
          }
        }}
      />
    </ErrorBoundary>
  );
}
```

### Widget Communication Errors

```tsx
function RobustWidget() {
  const widgetRef = useRef<FractalComponentHandle>(null);

  const safeInteraction = async () => {
    try {
      await widgetRef.current?.click({ id: 'button', xpath: '' });
    } catch (error) {
      console.error('Widget interaction failed:', error);
      // Handle gracefully - maybe show user feedback
    }
  };

  return (
    <FractalComponent
      ref={widgetRef}
      srcDoc="<button id='button'>Click me</button>"
      onEvent={(event) => {
        // Validate event structure
        if (!event || !event.type || !event.data) {
          console.warn('Invalid event received:', event);
          return;
        }
        
        // Process valid events
        handleValidEvent(event);
      }}
    />
  );
}
```

---

## Testing

### Unit Testing Components

```tsx
import { render, screen } from '@testing-library/react';
import { FractalComponent } from '@fractal-mcp/render';

describe('FractalComponent', () => {
  it('renders iframe with srcDoc content', () => {
    const onEvent = jest.fn();
    
    render(
      <FractalComponent
        srcDoc="<div>Test content</div>"
        onEvent={onEvent}
      />
    );
    
    const iframe = screen.getByTitle('sandboxed-widget');
    expect(iframe).toBeInTheDocument();
  });

  it('handles events from widget', async () => {
    const onEvent = jest.fn();
    
    render(
      <FractalComponent
        srcDoc="<button onclick='parent.postMessage({type: \"action\"}, \"*\")'>Click</button>"
        onEvent={onEvent}
      />
    );
    
    // Simulate event from widget
    // Note: Testing iframe communication requires special setup
  });
});
```

### Integration Testing

```tsx
import { renderHook } from '@testing-library/react';
import { useFractalComponent } from '@fractal-mcp/render';

describe('useFractalComponent', () => {
  it('returns a ref object', () => {
    const { result } = renderHook(() => useFractalComponent());
    
    expect(result.current).toHaveProperty('current');
    expect(result.current.current).toBeNull(); // Initially null
  });
});
```

---

## Dependencies

- `@fractal-mcp/shared-ui` - Shared messaging utilities and types
- `react-jsx-parser` - JSX string parsing for FractalFrame
- `react` & `react-dom` - React framework (peer dependencies)

## Requirements

- React 19.0+
- Modern browser with MessageChannel support
- ES2020+ JavaScript environment

## Best Practices

1. **Always use error boundaries** around Fractal components
2. **Memoize expensive computations** for large component maps
3. **Handle events gracefully** with proper error checking
4. **Use TypeScript** for better type safety with events
5. **Test widget communication** in isolation
6. **Validate event data** before processing
7. **Implement loading states** for async widget operations
8. **Use refs sparingly** - prefer event-driven communication