# @fractal-mcp/composer

Provider UI components and utilities for building Fractal widgets that run inside sandboxed iframes and communicate with consumer applications using MessageChannel.

## Installation

```bash
npm install @fractal-mcp/composer
```

## Overview

The `@fractal-mcp/composer` package provides React hooks and utilities for building Fractal provider widgets. These widgets run in isolated iframes and communicate with the parent consumer application through a secure messaging channel.

### Key Features

- **Secure iframe communication** via MessageChannel
- **Automatic data injection** from bundled HTML
- **DOM manipulation** capabilities (click, text input, querying)
- **Automatic iframe resizing** based on content
- **Type-safe action execution** with TypeScript generics
- **Navigation routing** between widget states

## Quick Start

```tsx
import { useFractal } from '@fractal-mcp/composer';

interface Tools {
  greet: { input: { name: string }; output: string };
  getUserData: { input: { userId: string }; output: { name: string; email: string } };
}

export default function MyWidget() {
  const { data, error, executeAction, navigate } = useFractal<Tools>();

  if (error) return <p>Error: {error.message}</p>;

  const handleGreet = async () => {
    const result = await executeAction('greet', { name: 'John' });
    console.log(result); // Type-safe string result
  };

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={handleGreet}>Say Hi</button>
      <button onClick={() => navigate('next', {})}>Next Page</button>
    </div>
  );
}
```

## API Reference

### `useFractal<TM>()`

The main hook for accessing Fractal functionality in provider widgets.

**Type Parameters:**
```typescript
TM extends { [K in keyof TM]: { input: any; output: any } }
```

A type mapping that defines available tools/actions with their input and output types.

**Returns:**
```typescript
{
  data: any;                    // Initial data from consumer
  isLoading: boolean;           // Always false (data loads immediately)
  error: Error | null;          // Error state
  executeAction: <K extends keyof TM>(
    name: K, 
    params: TM[K]['input']
  ) => Promise<TM[K]['output']>; // Execute backend actions
  navigate: <K extends keyof TM>(
    name: K, 
    params: TM[K]['input']
  ) => Promise<void>;            // Navigate to different states
}
```

**Example with Type Safety:**
```tsx
interface MyTools {
  fetchUser: { 
    input: { userId: string }; 
    output: { name: string; email: string; age: number } 
  };
  updateProfile: { 
    input: { name: string; email: string }; 
    output: { success: boolean } 
  };
  showDashboard: { 
    input: { tab: 'overview' | 'settings' }; 
    output: void 
  };
}

function MyWidget() {
  const { data, executeAction, navigate } = useFractal<MyTools>();

  // Type-safe action execution
  const loadUser = async () => {
    const user = await executeAction('fetchUser', { userId: '123' });
    // user is typed as { name: string; email: string; age: number }
    console.log(user.name, user.email, user.age);
  };

  // Type-safe navigation
  const goToDashboard = () => {
    navigate('showDashboard', { tab: 'overview' });
  };

  return (
    <div>
      <button onClick={loadUser}>Load User</button>
      <button onClick={goToDashboard}>Dashboard</button>
    </div>
  );
}
```

---

### Data Loading

#### Initial Data Access

The hook automatically reads initial data from `window.__FRACTAL_DATA__`, which is injected by the bundling process:

```tsx
function MyWidget() {
  const { data } = useFractal();
  
  // Data is available immediately - no loading state needed
  console.log('Initial data:', data);
  
  return <div>{JSON.stringify(data)}</div>;
}
```

#### Data Injection Process

1. Consumer bundles widget with `@fractal-mcp/bundle`
2. Bundle includes `<script id="fractal-data">` with JSON payload
3. Widget reads `window.__FRACTAL_DATA__` on mount
4. No async loading - data is immediately available

---

### Action Execution

#### `executeAction(name, params)`

Execute backend actions through the consumer application.

**Parameters:**
- `name: K` - Name of the action (type-safe key from TM)
- `params: TM[K]['input']` - Action parameters (type-safe based on action)

**Returns:** `Promise<TM[K]['output']>` - Type-safe action result

**Example:**
```tsx
interface Actions {
  saveData: { input: { data: any }; output: { id: string } };
  deleteItem: { input: { itemId: string }; output: { success: boolean } };
  fetchItems: { input: { page: number }; output: { items: any[]; total: number } };
}

function DataWidget() {
  const { executeAction } = useFractal<Actions>();

  const handleSave = async () => {
    try {
      const result = await executeAction('saveData', { data: { name: 'test' } });
      console.log('Saved with ID:', result.id); // Type-safe access
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleDelete = async (itemId: string) => {
    const result = await executeAction('deleteItem', { itemId });
    if (result.success) {
      console.log('Item deleted successfully');
    }
  };

  return (
    <div>
      <button onClick={handleSave}>Save Data</button>
      <button onClick={() => handleDelete('item-123')}>Delete Item</button>
    </div>
  );
}
```

---

### Navigation

#### `navigate(name, params)`

Navigate to different widget states or trigger navigation in the consumer.

**Parameters:**
- `name: K` - Name of the navigation target (type-safe key from TM)
- `params: TM[K]['input']` - Navigation parameters (type-safe based on target)

**Returns:** `Promise<void>`

**Example:**
```tsx
interface Navigation {
  showDetails: { input: { itemId: string }; output: void };
  goBack: { input: {}; output: void };
  openModal: { input: { modalType: 'confirm' | 'info' }; output: void };
}

function NavigationWidget() {
  const { navigate } = useFractal<Navigation>();

  const showItemDetails = (itemId: string) => {
    navigate('showDetails', { itemId });
  };

  const openConfirmModal = () => {
    navigate('openModal', { modalType: 'confirm' });
  };

  return (
    <div>
      <button onClick={() => showItemDetails('item-123')}>
        View Details
      </button>
      <button onClick={() => navigate('goBack', {})}>
        Go Back
      </button>
      <button onClick={openConfirmModal}>
        Confirm Action
      </button>
    </div>
  );
}
```

---

## Built-in DOM Capabilities

The composer automatically handles several DOM manipulation capabilities:

### Automatic Iframe Resizing

The widget automatically observes size changes and notifies the consumer to resize the iframe:

```tsx
// No code needed - automatic behavior
function ResponsiveWidget() {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div style={{ height: expanded ? 400 : 200 }}>
      {/* Iframe will automatically resize when content changes */}
      <button onClick={() => setExpanded(!expanded)}>
        Toggle Size
      </button>
    </div>
  );
}
```

### Remote DOM Interaction

The consumer can interact with your widget's DOM remotely:

**Click Elements:**
```tsx
// Consumer can trigger clicks on elements with IDs
<button id="save-button" onClick={handleSave}>
  Save
</button>

// Or using XPath
<button data-testid="save-btn" onClick={handleSave}>
  Save
</button>
```

**Text Input:**
```tsx
// Consumer can enter text into form fields
<input id="username" type="text" />
<textarea id="message" />
```

**DOM Querying:**
```tsx
// Consumer can query the entire DOM structure
// Useful for testing and automation
```

---

## Communication Architecture

### MessageChannel Setup

1. **Widget Initialization:**
   ```tsx
   // Widget signals readiness
   window.parent.postMessage({ type: 'READY' }, '*');
   ```

2. **Consumer Response:**
   ```tsx
   // Consumer sends MessagePort for bidirectional communication
   // Handled automatically by useFractal()
   ```

3. **Secure Communication:**
   ```tsx
   // All subsequent communication uses MessageChannel
   // No more postMessage - secure and isolated
   ```

### Event Types

The messaging system handles these event types:

- `action` - Execute backend actions
- `navigate` - Navigation requests
- `resize` - Iframe size changes
- `click` - Remote DOM clicks
- `enterText` - Remote text input
- `queryDom` - DOM structure queries

---

## Error Handling

### Action Errors

```tsx
function ErrorHandlingWidget() {
  const { executeAction } = useFractal<{ riskyAction: { input: {}; output: string } }>();

  const handleRiskyAction = async () => {
    try {
      const result = await executeAction('riskyAction', {});
      console.log('Success:', result);
    } catch (error) {
      console.error('Action failed:', error);
      // Handle error appropriately
    }
  };

  return <button onClick={handleRiskyAction}>Risky Action</button>;
}
```

### Connection Errors

```tsx
function ConnectionAwareWidget() {
  const { error } = useFractal();

  if (error) {
    return (
      <div className="error">
        <h3>Connection Error</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return <div>Normal widget content</div>;
}
```

---

## Best Practices

### Type Safety

Always define comprehensive type mappings:

```tsx
// Good: Comprehensive type definitions
interface MyTools {
  fetchData: { input: { id: string }; output: { data: any } };
  saveData: { input: { data: any }; output: { success: boolean } };
  navigate: { input: { page: string }; output: void };
}

// Avoid: Loose typing
interface LooseTools {
  [key: string]: { input: any; output: any };
}
```

### Error Boundaries

Wrap widgets in error boundaries:

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MyWidget />
    </ErrorBoundary>
  );
}
```

### Performance

- Keep widgets lightweight - they run in iframes
- Minimize DOM updates to reduce resize events
- Use React.memo for expensive components
- Debounce rapid action calls

### Testing

```tsx
// Mock the useFractal hook for testing
jest.mock('@fractal-mcp/composer', () => ({
  useFractal: () => ({
    data: { test: 'data' },
    error: null,
    isLoading: false,
    executeAction: jest.fn(),
    navigate: jest.fn(),
  }),
}));
```

---

## Integration with Bundling

When using with `@fractal-mcp/bundle`:

```tsx
// Your widget component
export default function MyWidget() {
  const { data } = useFractal();
  return <div>{JSON.stringify(data)}</div>;
}

// Bundle command will inject data automatically
// No additional configuration needed
```

The bundled HTML includes:
```html
<script id="fractal-data" type="application/json">
  {"initialData": "value"}
</script>
```

## Dependencies

- `@fractal-mcp/shared-ui` - Shared messaging utilities
- `@modelcontextprotocol/sdk` - MCP protocol types
- `react` - React hooks (peer dependency)

## Requirements

- React 16.8+ (hooks support)
- Modern browser with MessageChannel support
- Must run within iframe context for full functionality