# Reverse engineered sandbox utilities

This directory collects reimplementations of the smaller helper modules that
ship in `packages/oai/minified`. Every file has been rewritten with descriptive
names and inline documentation so that future work on the larger `main` bundle
can build on clear building blocks.

| Original file | Replacement | Notes |
| ------------- | ----------- | ----- |
| `types-Bm40F6nV.js` | `types.ts` | Restores enums for message categories and the custom events used to publish global variables to the iframe window. |
| `create-async-iterator-ggfG9U7o.js` | `createAsyncIterator.ts` | Reconstructs the push-to-async-iterator adapter. |
| `apply-csp-oMEag3sR.js` | `applyCsp.ts` | Documents the CSP normalization pipeline and the strictness comparison logic that prevents regressions. |
| `set-additional-globals-CXY3m52s.js` | `additionalGlobals.ts` | Provides a typed interface for writing sandbox globals and dispatching the companion events. |
| `set-safe-area-vars-Bn-pRjCL.js` | `safeArea.ts` | Applies CSS variables mirroring the runtime helper. |
| `set-theme-Cu8raYyE.js` | `theme.ts` | Updates the sandbox document element to match the desired theme. |
| `navigation-BRdOV7LN.js` | `navigation.ts` | Rebuilds the history instrumentation layer that reports navigation capabilities back to the host. |
| `run-html-Do8mTV6K.js` | `runHtml.ts` | Restores the inner-iframe lifecycle including console forwarding, CSP violation reporting, height/background heuristics, and host RPC integration. |
| `run-widget-code-BQGNBqus.js` | `runWidgetCode.ts` | Wraps HTML execution with widget-specific globals, CSP enforcement, and host state wiring. |
| `main-xonCUAoo.js` (messaging section) | `hostMessaging.ts`, `rpc.ts`, `sandboxFrame.ts`, `sandboxLogger.ts`, `lruCache.ts` | Documents the postMessage RPC protocol, host bridge bootstrap, iframe helpers, and shared utilities used by the sandbox runtime. |

The rewritten modules avoid build-tool artefacts (e.g. synthetic generator
wrappers) and make the implicit contracts explicit via TypeScript interfaces.
Each source file includes contextual comments outlining the subsystem that the
minified helper originally served.
