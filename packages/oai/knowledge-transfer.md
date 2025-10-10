# OpenAI Sandbox Runtime (iframe) — Reverse Engineering Summary

This document summarizes everything known about the OpenAI sandbox runtime code (the large Vite-compiled file). It is meant as a technical reference for senior engineers continuing reverse engineering.

---

## 1. Execution Context

| Layer                     | Role                                                                                                 | Runs Where                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Host (parent page)**    | Main ChatGPT / OpenAI app. Creates iframe, injects sandbox.html, and manages MessagePorts.           | Browser top-level window       |
| **Sandbox (this script)** | The runtime loaded in the iframe. Handles RPC, message routing, DOM creation, widget execution, etc. | Inside iframe (`sandbox.html`) |
| **Child iframe (#root)**  | Dynamically created by the sandbox. Runs user HTML / widget code.                                    | Nested iframe inside sandbox   |

**Key rule:** The sandbox script runs inside an iframe; it communicates with its parent (host) only once via `window.parent.postMessage(...)`, then permanently via `MessagePort`s.

---

## 2. Initialization Handshake

**Initiator:** Sandbox iframe  →  **Responder:** Parent host.

### Sequence

1. **Sandbox → Parent**

   ```js
   window.parent.postMessage({
       type: "init",
       ports: { [methodName]: MessagePort },
       replyPort: MessagePort
   }, parentOrigin, [...ports]);
   ```

   Transfers ports for each RPC endpoint (e.g. `runUserCode`, `validate`, etc.).

2. **Parent → Sandbox** (on replyPort)
   Sends back its own API port map (`hostPorts`), which the sandbox wraps in a proxy (`getHostApi()`).

3. **After handshake:** all communication is through MessagePorts, never `window.postMessage`.

---

## 3. RPC Layer (Low-Level Transport)

### Purpose

Implements a generic bidirectional RPC system on top of `MessagePort`.

### Message Types

| Type                 | Direction       | Description                          |
| -------------------- | --------------- | ------------------------------------ |
| `CALL`               | Caller → Callee | Invoke a function remotely with args |
| `RESOLVE`            | Callee → Caller | Function completed successfully      |
| `REJECT`             | Callee → Caller | Function threw / rejected            |
| `ABORT`              | Caller → Callee | Cancel an inflight call              |
| `GENERATOR_GENERATE` | Caller → Callee | Start an async generator stream      |

### Core Implementations

| Function                                  | Description                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `createRpc(port, handler?)`               | Registers handler or builds callable proxy for simple async functions         |
| `createAsyncGeneratorRpc(port, handler?)` | Same idea, but for async generators with subports (`next`, `throw`, `return`) |
| `On()` / `Ot()`                           | Safe structured-clone fallbacks                                               |

### Behavior

* Each RPC call uses its own transient response `MessagePort`.
* Async generators multiplex data streaming via dedicated subports.
* `AbortSignal` causes an `ABORT` message to terminate.

**This layer is entirely protocol-driven; no semantic meaning in payloads.**

---

## 4. Application Messaging Layer (High-Level RPC API)

Built on top of the RPC system.

### Sandbox-exposed RPC Handlers

| Function               | Type            | Purpose                                |
| ---------------------- | --------------- | -------------------------------------- |
| `runUserCode`          | Async generator | Execute JS/TS code, yield logs/results |
| `runWidgetCode`        | Async generator | Render widget HTML/JS in nested iframe |
| `buildUserCode`        | Promise         | Transpile code                         |
| `prepareEnvironment`   | Promise         | Load globals, CSP, setup               |
| `validate`             | Promise         | Run React/JS validation                |
| `stop`                 | One-way         | Destroy nested iframe and cleanup      |
| `setEditMode`          | One-way         | Enable/disable element inspector       |
| `screenshot`           | Promise         | Capture DOM image of nested iframe     |
| `setAdditionalGlobals` | Promise         | Inject new globals                     |
| `setWidgetProps`       | Promise         | Update widget props/state              |
| `setTheme`             | Promise         | Apply theme vars                       |
| `setSafeArea`          | Promise         | Apply safe-area vars                   |
| `navigate`             | Promise         | Perform internal navigation            |
| `getCurrentPath`       | Promise         | Return current path of nested iframe   |

### Host API Methods (reverse direction)

| Method                     | Purpose                        |
| -------------------------- | ------------------------------ |
| `sendInstrument()`         | Telemetry / metrics            |
| `updateWidgetState()`      | Sync widget state back to host |
| `openExternal()`           | Open external links            |
| `drawBoundingBoxes()`      | Dev overlay rendering          |
| `notifyEnvironmentError()` | Propagate errors               |
| `notifyEscapeKey()`        | Keyboard escape signal         |

---

## 5. DOM and Environment Management

### Nested Iframe Lifecycle

| Function | Purpose                                   |
| -------- | ----------------------------------------- |
| `Pn()`   | Create `#root` iframe and append to body  |
| `rt()`   | Return reference to current nested iframe |
| `oe()`   | Remove `#root` iframe                     |

### Interactions

| Action                  | Direction              | Mechanism                                             |
| ----------------------- | ---------------------- | ----------------------------------------------------- |
| Inject HTML             | Sandbox → Child        | `runHTMLAsync()` writes into `iframe.contentDocument` |
| Attach listeners        | Sandbox → Child        | Intercepts `click`, `keydown`, `open()`               |
| Report interactions     | Child → Sandbox        | Calls host API via proxy (e.g., `sendInstrument`)     |
| Hover/select inspection | Child → Sandbox → Host | `ElementInspector` measures bounding boxes            |
| Screenshot              | Sandbox → Child        | Serializes DOM via `domToDataUrl()`                   |
| Theme/Safe Area         | Sandbox → Child        | Updates CSS vars inside iframe                        |
| Teardown                | Sandbox → Child        | Remove iframe & listeners (`stop()`)                  |

The nested frame is same-origin, so communication is direct DOM access, not postMessage.

---

## 6. Vite Runtime and Preload Layer

Generated automatically by Vite.

| Function                         | Description                                                            |
| -------------------------------- | ---------------------------------------------------------------------- |
| `__vite__mapDeps()`              | Maps numeric indices → chunk URLs                                      |
| `vitePreload()` (minified `C()`) | Preloads JS/CSS via `<link rel="modulepreload">` before dynamic import |

These ensure dynamic imports like `import('./run-widget-code.js')` preload dependencies.

---

## 7. Logging & Telemetry

**Class:** `SandboxLogger`

| Method                 | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| `log()`                | Local debug output                              |
| `error()`              | Report sandbox errors to host                   |
| `environmentError()`   | Convert thrown errors into structured telemetry |
| `count()`              | Increment counters                              |
| `time()` / `timeEnd()` | Record timing histograms                        |

Uses the host API proxy (`getHostApi()`) for transport.

---

## 8. Element Inspection / Edit Mode

**Class:** `En` (`ElementInspector`)

| Behavior             | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| Tracks hover & click | Detects hovered/selected elements inside nested iframe     |
| Computes rects       | Uses `getBoundingClientRect()` to calculate bounding boxes |
| Reports to host      | Calls `L().drawBoundingBoxes()` with rect data             |
| Enables/disables     | Controlled by `setEditMode()` RPC                          |

---

## 9. Security & Isolation Model

| Layer Boundary   | Mechanism                                                 |
| ---------------- | --------------------------------------------------------- |
| Parent ↔ Sandbox | `MessagePort` RPC; sandbox cannot access parent DOM       |
| Sandbox ↔ Child  | Same-origin DOM APIs, CSP-enforced user content isolation |
| User Code        | Executed in nested iframe with restricted globals and CSP |

Only the sandbox’s top-level script can reach both parent (via ports) and child (via DOM).

---

## 10. Key Takeaways

* **RPC layer:** precise message protocol using `MessageChannel`.
* **Handshake:** one `window.parent.postMessage()` for setup; ports persist afterward.
* **Application messaging:** defines high-level semantic RPC calls.
* **Nested iframe:** same-origin DOM sandbox for rendering user HTML safely.
* **Host API:** proxy for telemetry, widget state, navigation, etc.
* **Vite-generated code:** handles chunk preloading, dependency mapping.
* **Security:** strict iframe layering, CSP, no direct parent DOM access.

---

**This document captures the entire known architecture as of current reverse-engineering work.**
