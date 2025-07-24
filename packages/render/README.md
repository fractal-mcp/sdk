# @fractal-mcp/render

React component for hosting sandboxed widgets inside iframes. It exposes an imperative API for sending commands and receiving events from the embedded widget.

Exports:

- `FractalComponent` – React component wrapping an iframe
- `useFractalComponent` – hook to create a ref for the widget handle
- `FractalComponentHandle` – TypeScript interface of the exposed methods

The widget uses a private `MessageChannel` for communication so no direct `postMessage` calls are required by consumers.

## FractalComponent Props

- `src` - URL of the iframe content.
- `srcDoc` - HTML content string. Uses the `iframe` `srcdoc` attribute and takes precedence over `src`.
- `data` - Arbitrary data available to the provider widget.
- `onRoutingEvent` - **required** callback invoked when the provider emits a
  navigation request. The callback receives the routing data object.

## FractalFrame

`FractalFrame` allows rendering a JSX snippet containing `<Frac id="..." />` elements. Each `Frac` ID is resolved against a provided map to create a `FractalComponent`. Parsing of the JSX string is handled by [`react-jsx-parser`](https://www.npmjs.com/package/react-jsx-parser).

Example:

```tsx
const jsx = `<div><Frac id="widget1" /></div>`;
const map = {
  widget1: { srcDoc: '<h1>Hi</h1>', data: { name: 'Jane' } }
};

<FractalFrame jsx={jsx} map={map} />;
```
