# Sandbox messaging protocol

This document captures the semantics of the `window.postMessage` and
MessageChannel traffic that glues the sandbox iframe to its parent application.
It ties the reimplemented helpers in this directory back to the original
`main-xonCUAoo.js` bundle.

## Bootstrap handshake

1. The sandbox dynamically provisions one `MessageChannel` per handler that the
   parent may call (see the catalogue below). Each `port1` endpoint is bound to
   either `createRpcEndpoint` or `createGeneratorRpcEndpoint`, while `port2` is
   prepared for transfer to the parent.【F:packages/oai/reversed/hostMessaging.ts†L115-L156】【F:packages/oai/reversed/rpc.ts†L228-L356】
2. A second `MessageChannel` carries the reply descriptor. The sandbox posts a
   single `init` message to `window.parent`, including the handler map and the
   reply port. All message ports are transferred with the post so ownership is
   moved to the parent.【F:packages/oai/reversed/hostMessaging.ts†L158-L178】
3. The parent responds on `replyPort` with a map of host-side RPC entry points.
   Once received, the sandbox wraps each host function with an RPC caller,
   respecting the generator list supplied by the parent.【F:packages/oai/reversed/hostMessaging.ts†L180-L200】
4. The resulting object is published via `getHostApi()` so that every runtime
   helper (navigation, HTML runner, widget orchestrator, etc.) can reach the
   host without touching the transport primitives.【F:packages/oai/reversed/hostMessaging.ts†L69-L112】

The `messageProtocol.ts` module enumerates both sides of this bridge so the
parent UI knows exactly which endpoints to expose and how to decode requests
coming from the sandbox.【F:packages/oai/reversed/messageProtocol.ts†L1-L210】

## RPC catalogue

### Parent → sandbox

| Method | Kind | Payload | Result | Purpose |
| ------ | ---- | ------- | ------ | ------- |
| `runUserCode` | generator | `{ bundle, args? }` | stream of sandbox events | Evaluate arbitrary JS bundles and forward lifecycle updates |
| `buildUserCode` | request | `{ files, entrypoint }` | build artifact or `null` | Transpile uploaded source before execution |
| `prepareEnvironment` | request | `{ packages, registryBaseUrl? }` | `void` | Pre-install npm packages inside the sandbox |
| `runWidgetCode` | generator | `RunWidgetCodeOptions` | stream of `HtmlRunEvent` | Render widgets inside the inner iframe |
| `validate` | request | `{ code, props }` | `boolean` | Pre-validate SSR output |
| `stop` | request | `void` | `void` | Tear down the current iframe and instrumentation |
| `setEditMode` | request | `boolean` | `void` | Toggle inline editing helpers |
| `screenshot` | request | `void` | `{ imageBase64, scrollX, scrollY }` or `null` | Capture a DOM snapshot |
| `setAdditionalGlobals` | request | `{ additionalGlobals }` | `void` | Publish ad-hoc globals into the sandbox window |
| `setWidgetProps` | request | `{ widgetId, widgetState, toolInput?, toolOutput?, toolResponseMetadata? }` | `void` | Refresh widget-specific globals |
| `setTheme` | request | `{ theme }` | `void` | Apply theming and mirror it to globals |
| `setSafeArea` | request | `{ safeArea }` | `void` | Update safe-area CSS variables and globals |
| `navigate` | request | `{ delta? }` or `{ popToRoot: true }` | `void` | Drive the instrumented history API |
| `getCurrentPath` | request | `void` | `string` or `null` | Report the iframe’s current pathname |

The table mirrors `SANDBOX_RPC_METHODS`; generator invocations stream sandbox
messages until completion.【F:packages/oai/reversed/messageProtocol.ts†L15-L118】 The `runWidgetCode`
implementation wires host-provided globals, enforces CSP, and yields HTML events
as it executes within the nested iframe.【F:packages/oai/reversed/runWidgetCode.ts†L1-L80】【F:packages/oai/reversed/runHtml.ts†L432-L624】

### Sandbox → parent

| Method | Kind | Payload | Result | Purpose |
| ------ | ---- | ------- | ------ | ------- |
| `sendInstrument` | request | `InstrumentPayload` | `void` | Forward counters, histograms, and interaction markers |
| `notifyEnvironmentError` | request | `EnvironmentErrorPayload` | `void` | Escalate fatal runtime errors |
| `notifySecurityPolicyViolation` | request | `SecurityViolation` | `void` | Surface CSP violations |
| `notifyIntrinsicHeight` | request | `number` | `void` | Push measured iframe height changes |
| `notifyBackgroundColor` | request | `string` | `void` | Report the first opaque background color |
| `notifyEscapeKey` | request | `void` | `void` | Bubble Escape presses to the host |
| `openExternal` | request | `{ href }` | `void` | Ask the host to open external links |
| `getDownloadURL` | request | `string` | `string` | Resolve custom download protocols |
| `updateWidgetState` | request | `{ widgetId, value }` | `void` | Write widget state back to the host store |
| `requestDisplayMode` | request | `unknown` | `unknown` | Negotiate layout changes that require a user gesture |
| `callCompletion` | request | `unknown` | `unknown` | Trigger a one-shot completion |
| `streamCompletion` | generator | `unknown` | stream of tokens | Stream multi-turn completions |
| `sendFollowUpMessage` | request | `unknown` | `void` | Inject an additional chat turn |

These methods map to `HOST_RPC_METHODS`. User gesture sensitive calls are
wrapped in a proxy that checks `navigator.userActivation` so widgets cannot call
these helpers outside a trusted click path.【F:packages/oai/reversed/messageProtocol.ts†L122-L210】【F:packages/oai/reversed/hostMessaging.ts†L89-L112】

## Nested iframe architecture

The sandbox iframe (`packages/oai/reversed` code) never runs untrusted HTML
within its own document. Instead it provisions an inner iframe on demand via
`ensureSandboxIframe()`, replaces any previous instance, and tears it down once
the new content signals readiness.【F:packages/oai/reversed/runHtml.ts†L452-L548】【F:packages/oai/reversed/sandboxFrame.ts†L13-L42】

During each run the sandbox:

- Installs navigation instrumentation on the inner iframe’s `history` object so
  the host receives `canGoBack`/`canGoForward` updates while still owning the
  containing UI.【F:packages/oai/reversed/navigation.ts†L25-L196】
- Injects safe-area CSS variables and theme tokens into the inner document to
  match the host shell.【F:packages/oai/reversed/runHtml.ts†L514-L542】
- Forwards console output, runtime errors, and CSP violations back to the host
  via the RPC helpers described above.【F:packages/oai/reversed/runHtml.ts†L222-L410】
- Measures background color and intrinsic height so the host can resize the
  outer iframe without guesswork.【F:packages/oai/reversed/runHtml.ts†L480-L520】

This two-iframe structure isolates ephemeral widget execution from the bridge
logic. The outer iframe keeps the long-lived message channels and logging state,
while the inner iframe can be discarded whenever new HTML is written, ensuring a
clean DOM, deterministic CSP enforcement, and reliable measurement callbacks
without renegotiating the host connection.【F:packages/oai/reversed/runHtml.ts†L500-L624】【F:packages/oai/reversed/sandboxLogger.ts†L33-L85】
