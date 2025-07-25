# @fractal-mcp/shared-ui

Shared utilities for Fractal UI messaging and secure communication between iframe widgets and their parent applications. Provides type-safe MessageChannel-based communication with comprehensive event handling.

## Installation

```bash
npm install @fractal-mcp/shared-ui
```

## Overview

The `@fractal-mcp/shared-ui` package provides the core messaging infrastructure used throughout the Fractal ecosystem. It includes:

- **Messaging Class** - MessageChannel-based communication system
- **Type-Safe Events** - Comprehensive TypeScript types for all event types
- **Request/Response Pattern** - Promise-based request handling
- **Event Emission** - Fire-and-forget event broadcasting
- **Error Handling** - Built-in error propagation and timeout management
- **Bidirectional Communication** - Support for both inbound and outbound events

## Quick Start

### Basic Messaging Setup

```typescript
import { Messaging } from '@fractal-mcp/shared-ui';

// Create a MessageChannel
const channel = new MessageChannel();

// Initialize messaging with one port
const messaging = new Messaging({ port: channel.port1 });

// Send the other port to iframe/worker
iframe.contentWindow.postMessage({ type: 'INIT_PORT' }, '*', [channel.port2]);

// Handle events
messaging.on('action', async (event) => {
  console.log('Action received:', event.data.name, event.data.params);
  return { success: true };
});

// Send requests
const result = await messaging.request('queryDom', { name: '', params: {} });
```

### Widget Communication Example

```typescript
import { Messaging, FractalActionEvent } from '@fractal-mcp/shared-ui';

// In parent application
function setupWidgetCommunication(iframe: HTMLIFrameElement) {
  const channel = new MessageChannel();
  const messaging = new Messaging({ port: channel.port1 });

  // Handle widget actions
  messaging.on('action', async (event: FractalActionEvent) => {
    switch (event.data.name) {
      case 'saveData':
        await saveToDatabase(event.data.params);
        return { success: true };
      
      case 'loadData':
        const data = await loadFromDatabase(event.data.params.id);
        return { data };
      
      default:
        throw new Error(`Unknown action: ${event.data.name}`);
    }
  });

  // Handle navigation requests
  messaging.on('navigate', async (event) => {
    router.push(event.data.name, event.data.params);
  });

  // Send port to widget
  iframe.contentWindow?.postMessage({ type: 'INIT_PORT' }, '*', [channel.port2]);
  
  return messaging;
}
```

## API Reference

### `Messaging`

The main class for handling MessageChannel-based communication between parent and child contexts.

#### Constructor

```typescript
new Messaging(options: { port: MessagePort })
```

**Parameters:**
- `options.port: MessagePort` - One end of a MessageChannel for communication

**Example:**
```typescript
const channel = new MessageChannel();
const messaging = new Messaging({ port: channel.port1 });
```

#### `on<T>(messageType, handler)`

Register an event handler for a specific message type.

**Parameters:**
- `messageType: T` - Type of event to handle (type-safe)
- `handler: (event: FractalEventByType<T>) => Promise<unknown> | void` - Event handler function

**Returns:** `void`

**Example:**
```typescript
// Handle action events
messaging.on('action', async (event) => {
  console.log('Action:', event.data.name);
  console.log('Params:', event.data.params);
  
  // Return response for request-style events
  return { status: 'processed' };
});

// Handle navigation events
messaging.on('navigate', (event) => {
  console.log('Navigate to:', event.data.name);
  router.push(event.data.name, event.data.params);
});

// Handle resize events
messaging.on('resize', (event) => {
  const { width, height } = event.data.params;
  resizeIframe(width, height);
});

// Handle DOM queries
messaging.on('queryDom', async (event) => {
  return document.documentElement.outerHTML;
});

// Handle click commands
messaging.on('click', async (event) => {
  const { id, xpath } = event.data.params;
  const element = findElement(id, xpath);
  if (element) {
    element.click();
    return 'success';
  }
  return 'not found';
});
```

#### `request<T>(messageType, data)`

Send a request and wait for a response.

**Parameters:**
- `messageType: T` - Type of request to send
- `data: FractalEventData<T>` - Request data (type-safe based on message type)

**Returns:** `Promise<unknown>` - Response from the handler

**Example:**
```typescript
// Query DOM structure
const html = await messaging.request('queryDom', {
  name: '',
  params: {}
});

// Click an element
const clickResult = await messaging.request('click', {
  name: '',
  params: { id: 'submit-button', xpath: '' }
});

// Enter text in a field
await messaging.request('enterText', {
  name: '',
  params: { 
    id: 'username-input', 
    xpath: '', 
    text: 'john@example.com' 
  }
});

// Custom action request
const actionResult = await messaging.request('action', {
  name: 'processData',
  params: { 
    data: [1, 2, 3, 4, 5],
    operation: 'sum'
  }
});
```

#### `emit<T>(messageType, data)`

Send an event without expecting a response (fire-and-forget).

**Parameters:**
- `messageType: T` - Type of event to emit
- `data: FractalEventData<T>` - Event data

**Returns:** `void`

**Example:**
```typescript
// Emit navigation event
messaging.emit('navigate', {
  name: 'dashboard',
  params: { tab: 'overview' }
});

// Emit action event
messaging.emit('action', {
  name: 'userInteraction',
  params: { 
    type: 'click',
    element: 'header-logo',
    timestamp: Date.now()
  }
});

// Emit resize event
messaging.emit('resize', {
  name: '',
  params: { width: 800, height: 600 }
});

// Emit data event
messaging.emit('data', {
  name: 'statusUpdate',
  params: { 
    status: 'loading',
    progress: 50
  }
});
```

---

## Event Types

### Outbound Events (from widget to parent)

#### `FractalActionEvent`

Represents user actions or operations performed within the widget.

```typescript
interface FractalActionEvent {
  type: "action";
  data: { 
    name: string;                    // Action identifier
    params: Record<string, unknown>; // Action parameters
  };
}
```

**Common Use Cases:**
- Button clicks
- Form submissions
- Data operations
- User interactions

**Example:**
```typescript
messaging.emit('action', {
  name: 'submitForm',
  params: {
    formData: { name: 'John', email: 'john@example.com' },
    formId: 'contact-form'
  }
});
```

#### `FractalNavigationEvent`

Represents navigation requests from the widget.

```typescript
interface FractalNavigationEvent {
  type: "navigate";
  data: { 
    name: string;                    // Route or page identifier
    params: Record<string, unknown>; // Navigation parameters
  };
}
```

**Example:**
```typescript
messaging.emit('navigate', {
  name: 'user-profile',
  params: { userId: '123', tab: 'settings' }
});
```

#### `FractalDataEvent`

Represents data updates or information sharing.

```typescript
interface FractalDataEvent {
  type: "data";
  data: {
    name: string;                    // Data type identifier
    params: Record<string, unknown>; // Data payload
  };
}
```

**Example:**
```typescript
messaging.emit('data', {
  name: 'chartData',
  params: {
    series: [10, 20, 30, 40],
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    type: 'bar'
  }
});
```

#### `FractalResizeEvent`

Represents widget size changes for automatic iframe resizing.

```typescript
interface FractalResizeEvent {
  type: "resize";
  data: {
    name: string;
    params: {
      width: number;  // Widget width in pixels
      height: number; // Widget height in pixels
    };
  };
}
```

**Example:**
```typescript
messaging.emit('resize', {
  name: '',
  params: { width: 400, height: 300 }
});
```

### Inbound Events (from parent to widget)

#### `FractalQueryDomEvent`

Request to query the widget's DOM structure.

```typescript
interface FractalQueryDomEvent {
  type: "queryDom";
  data: { 
    name: string; 
    params: Record<string, unknown>;
  };
}
```

**Example Handler:**
```typescript
messaging.on('queryDom', async (event) => {
  return document.documentElement.outerHTML;
});
```

#### `FractalClickEvent`

Command to programmatically click elements in the widget.

```typescript
interface FractalClickEvent {
  type: "click";
  data: { 
    name: string; 
    params: {
      id?: string;    // Element ID
      xpath?: string; // XPath selector
    };
  };
}
```

**Example Handler:**
```typescript
messaging.on('click', async (event) => {
  const { id, xpath } = event.data.params;
  
  let element: Element | null = null;
  if (id) {
    element = document.getElementById(id);
  } else if (xpath) {
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    element = result.singleNodeValue as Element;
  }
  
  if (element instanceof HTMLElement) {
    element.click();
    return 'clicked';
  }
  
  return 'not found';
});
```

#### `FractalEnterTextEvent`

Command to enter text into form fields within the widget.

```typescript
interface FractalEnterTextEvent {
  type: "enterText";
  data: { 
    name: string; 
    params: {
      id?: string;    // Element ID
      xpath?: string; // XPath selector
      text: string;   // Text to enter
    };
  };
}
```

**Example Handler:**
```typescript
messaging.on('enterText', async (event) => {
  const { id, xpath, text } = event.data.params;
  
  let element: Element | null = null;
  if (id) {
    element = document.getElementById(id);
  } else if (xpath) {
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    element = result.singleNodeValue as Element;
  }
  
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return 'entered';
  }
  
  return 'not found';
});
```

---

## Type Utilities

### `FractalEventType`

Union type of all possible event types.

```typescript
type FractalEventType = 'navigate' | 'action' | 'data' | 'resize' | 'queryDom' | 'click' | 'enterText';
```

### `FractalEventData<T>`

Type-safe data structure for a specific event type.

```typescript
type FractalEventData<T extends FractalEventType> = 
  T extends 'navigate' ? FractalNavigationEvent['data'] :
  T extends 'action' ? FractalActionEvent['data'] :
  // ... etc for all event types
```

### `FractalEventByType<T>`

Extract the complete event object for a specific type.

```typescript
type FractalEventByType<T extends FractalEventType> = Extract<FractalAnyEvent, { type: T }>;
```

### Union Types

```typescript
// Outbound events (widget → parent)
type FractalUIEvent = FractalNavigationEvent | FractalActionEvent | FractalDataEvent | FractalResizeEvent;

// Inbound events (parent → widget)  
type FractalControlEvent = FractalQueryDomEvent | FractalClickEvent | FractalEnterTextEvent;

// All events
type FractalAnyEvent = FractalUIEvent | FractalControlEvent;
```

---

## Advanced Usage

### Error Handling

```typescript
import { Messaging } from '@fractal-mcp/shared-ui';

const messaging = new Messaging({ port: channel.port1 });

// Handle errors in event handlers
messaging.on('action', async (event) => {
  try {
    const result = await processAction(event.data.name, event.data.params);
    return { success: true, result };
  } catch (error) {
    console.error('Action processing failed:', error);
    throw new Error(`Failed to process action: ${error.message}`);
  }
});

// Handle request errors
try {
  const result = await messaging.request('action', {
    name: 'riskyOperation',
    params: { data: 'test' }
  });
  console.log('Success:', result);
} catch (error) {
  console.error('Request failed:', error.message);
}
```

### Custom Event Types

```typescript
// Extend the messaging system with custom events
declare module '@fractal-mcp/shared-ui' {
  interface CustomEvents {
    customAction: {
      type: 'customAction';
      data: {
        name: string;
        params: {
          customParam: string;
          value: number;
        };
      };
    };
  }
}

// Use custom events (requires extending the Messaging class)
messaging.on('customAction' as any, async (event) => {
  console.log('Custom action:', event.data.params.customParam);
  return { processed: true };
});
```

### Timeout Handling

```typescript
// The Messaging class automatically handles timeouts for requests
// Requests that don't receive responses will eventually timeout

// To handle timeouts gracefully:
async function safeRequest() {
  try {
    const result = await Promise.race([
      messaging.request('action', { name: 'slowOperation', params: {} }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), 5000)
      )
    ]);
    return result;
  } catch (error) {
    if (error.message === 'Operation timeout') {
      console.warn('Operation timed out, using fallback');
      return { fallback: true };
    }
    throw error;
  }
}
```

### Bidirectional Communication

```typescript
// Parent side
const parentMessaging = new Messaging({ port: channel.port1 });

parentMessaging.on('action', async (event) => {
  // Handle actions from widget
  console.log('Widget action:', event.data.name);
  return { handled: true };
});

// Send commands to widget
await parentMessaging.request('click', {
  name: '',
  params: { id: 'widget-button', xpath: '' }
});

// Widget side (in iframe)
const widgetMessaging = new Messaging({ port: channel.port2 });

widgetMessaging.on('click', async (event) => {
  // Handle click commands from parent
  const { id } = event.data.params;
  document.getElementById(id)?.click();
  return 'clicked';
});

// Send actions to parent
widgetMessaging.emit('action', {
  name: 'userClick',
  params: { button: 'submit' }
});
```

---

## Integration Examples

### With React Components

```tsx
import React, { useEffect, useRef } from 'react';
import { Messaging, FractalActionEvent } from '@fractal-mcp/shared-ui';

function FractalWidget({ onAction }: { onAction: (event: FractalActionEvent) => void }) {
  const messagingRef = useRef<Messaging | null>(null);

  useEffect(() => {
    // Wait for MessagePort from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'INIT_PORT' && event.ports[0]) {
        messagingRef.current = new Messaging({ port: event.ports[0] });
        
        // Handle incoming commands
        messagingRef.current.on('click', async (clickEvent) => {
          const { id } = clickEvent.data.params;
          document.getElementById(id)?.click();
          return 'clicked';
        });
        
        // Signal ready
        window.parent.postMessage({ type: 'READY' }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleButtonClick = () => {
    if (messagingRef.current) {
      messagingRef.current.emit('action', {
        name: 'buttonClick',
        params: { timestamp: Date.now() }
      });
    }
  };

  return (
    <div>
      <button id="action-button" onClick={handleButtonClick}>
        Click Me
      </button>
    </div>
  );
}
```

### With Fractal Composer

```tsx
import { useFractal } from '@fractal-mcp/composer';
import { FractalActionEvent } from '@fractal-mcp/shared-ui';

// The composer package uses shared-ui internally
function ComposerWidget() {
  const { executeAction, navigate } = useFractal();

  // These calls use the shared-ui messaging system under the hood
  const handleAction = async () => {
    await executeAction('processData', { data: [1, 2, 3] });
  };

  const handleNavigation = () => {
    navigate('nextPage', { context: 'user-action' });
  };

  return (
    <div>
      <button onClick={handleAction}>Execute Action</button>
      <button onClick={handleNavigation}>Navigate</button>
    </div>
  );
}
```

---

## Message Flow

### Request/Response Flow

```
Parent                          Widget
  |                               |
  |  1. Create MessageChannel     |
  |  2. Send port2 via postMessage|
  |------------------------------>|
  |                               |  3. Initialize Messaging
  |                               |  4. Set up event handlers
  |                               |
  |  5. Send request              |
  |------------------------------>|
  |                               |  6. Process request
  |                               |  7. Send response
  |<------------------------------|
  |  8. Resolve promise           |
```

### Event Emission Flow

```
Widget                          Parent
  |                               |
  |  1. User interaction          |
  |  2. Emit event                |
  |------------------------------>|
  |                               |  3. Handle event
  |                               |  4. Update UI/state
```

---

## Security Considerations

### MessageChannel Benefits

- **Isolated Communication** - No global message listeners
- **Port-based Security** - Only holders of ports can communicate
- **No Origin Checks Needed** - Ports are inherently secure
- **Structured Data** - JSON-serializable message format

### Best Practices

```typescript
// 1. Validate event data
messaging.on('action', async (event) => {
  if (!event.data.name || typeof event.data.name !== 'string') {
    throw new Error('Invalid action name');
  }
  
  if (!event.data.params || typeof event.data.params !== 'object') {
    throw new Error('Invalid action parameters');
  }
  
  // Process validated event
});

// 2. Sanitize DOM operations
messaging.on('click', async (event) => {
  const { id } = event.data.params;
  
  // Validate ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid element ID');
  }
  
  const element = document.getElementById(id);
  if (element) {
    element.click();
  }
});

// 3. Limit operation scope
messaging.on('queryDom', async (event) => {
  // Only return safe DOM information
  const safeData = {
    title: document.title,
    url: window.location.href,
    elementCount: document.querySelectorAll('*').length
  };
  
  return safeData;
});
```

---

## Performance Considerations

### Memory Management

```typescript
class ManagedMessaging {
  private messaging: Messaging;
  private cleanup: (() => void)[] = [];

  constructor(port: MessagePort) {
    this.messaging = new Messaging({ port });
    
    // Track handlers for cleanup
    const originalOn = this.messaging.on.bind(this.messaging);
    this.messaging.on = (type, handler) => {
      originalOn(type, handler);
      this.cleanup.push(() => {
        // Remove handler if needed
      });
    };
  }

  destroy() {
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
    // Close port if needed
  }
}
```

### Efficient Event Handling

```typescript
// Debounce frequent events
let resizeTimeout: NodeJS.Timeout;

messaging.on('resize', (event) => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    handleResize(event.data.params.width, event.data.params.height);
  }, 100);
});

// Batch operations
const pendingActions: any[] = [];
let batchTimeout: NodeJS.Timeout;

messaging.on('action', (event) => {
  pendingActions.push(event);
  
  clearTimeout(batchTimeout);
  batchTimeout = setTimeout(() => {
    processBatchedActions(pendingActions.splice(0));
  }, 10);
});
```

---

## Dependencies

This package has no runtime dependencies and uses only browser-native APIs:
- `MessageChannel` and `MessagePort` for communication
- `crypto.randomUUID()` for generating unique request IDs
- Standard Promise APIs for async operations

## Requirements

- Modern browser with MessageChannel support
- ES2020+ JavaScript environment
- TypeScript 5.0+ for full type safety

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

All modern browsers that support MessageChannel and crypto.randomUUID().
