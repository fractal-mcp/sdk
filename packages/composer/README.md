# @fractal-mcp/composer

Utilities for building Fractal provider widgets. These widgets run inside a sandboxed iframe and communicate with a consumer application using a `MessageChannel`.

## Installation

```bash
npm install @fractal-mcp/composer
```

## Why use this package?

`provider-ui` hides the low level messaging logic required to talk to a Fractal consumer. It exposes a single React hook that gives your widget access to:

- **data** – the initial payload supplied by the consumer
- **executeAction** – call back end actions
- **navigate** – request navigation events

When bundled with `@fractal-mcp/bundle`, your widget's HTML may include a `<script id="fractal-data">` tag containing a JSON payload. `useFractal` reads `window.__FRACTAL_DATA__` from this script so there is no loading delay when the widget mounts.

## Usage

```tsx
import { useFractal } from '@fractal-mcp/composer';

interface Tools {
  greet: { input: { name: string }; output: string };
}

export default function MyWidget() {
  const { data, error, executeAction, navigate } = useFractal<Tools>();

  // Data is available immediately from the bundled HTML
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={() => executeAction('greet', { name: 'John' })}>
        Say hi
      </button>
      <button onClick={() => navigate('next', {})}>Next page</button>
    </div>
  );
}
```

The generic parameter describes the actions and navigation routes available from the consumer. The hook automatically establishes the messaging channel and reads the initial `data` payload from the bundled HTML.
