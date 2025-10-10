import type { RunWidgetCodeOptions } from "./runWidgetCode";
import type { HtmlRunEvent } from "./runHtml";
import type { SafeAreaDescriptor } from "./safeArea";
import type { ThemeName } from "./theme";

/**
 * Canonical catalogue of RPC calls exchanged between the sandbox iframe and
 * its parent host. This mirrors the descriptors embedded in the minified
 * `main-xonCUAoo.js` bundle while attaching semantically meaningful
 * descriptions.
 */

export type SandboxRpcMethodName =
  | "runUserCode"
  | "buildUserCode"
  | "prepareEnvironment"
  | "runWidgetCode"
  | "validate"
  | "stop"
  | "setEditMode"
  | "screenshot"
  | "setAdditionalGlobals"
  | "setWidgetProps"
  | "setTheme"
  | "setSafeArea"
  | "navigate"
  | "getCurrentPath";

export interface SandboxRpcDescription {
  readonly name: SandboxRpcMethodName;
  readonly invocation: "generator" | "request";
  readonly summary: string;
  /**
   * Human readable contract for the call arguments forwarded by the parent.
   */
  readonly request: string;
  /**
   * Human readable contract for the resolved value (or streamed payloads in
   * case of generators) produced by the sandbox.
   */
  readonly response: string;
}

export const SANDBOX_RPC_METHODS: readonly SandboxRpcDescription[] = [
  {
    name: "runUserCode",
    invocation: "generator",
    summary: "Executes arbitrary user-authored JavaScript inside the sandbox runtime.",
    request:
      "{ bundle: Blob | string, args?: unknown } — dynamic import payload emitted by the build step.",
    response:
      "Async generator of SandboxMessage events mirroring console output, logs, and lifecycle markers.",
  },
  {
    name: "buildUserCode",
    invocation: "request",
    summary: "Runs the on-the-fly bundler to transpile an uploaded script before execution.",
    request: "{ files: Record<string, string>, entrypoint: string }",
    response: "Promise resolving to a build artifact descriptor or null when compilation fails.",
  },
  {
    name: "prepareEnvironment",
    invocation: "request",
    summary: "Installs npm-style dependencies into the sandbox prior to execution.",
    request: "{ packages: string[], registryBaseUrl?: string }",
    response: "Promise<void> signalling completion of the installation phase.",
  },
  {
    name: "runWidgetCode",
    invocation: "generator",
    summary: "Streams lifecycle events while rendering a widget's HTML payload inside the inner iframe.",
    request: "RunWidgetCodeOptions",
    response: "AsyncGenerator<HtmlRunEvent>",
  },
  {
    name: "validate",
    invocation: "request",
    summary: "Validates a React tree for server rendering prior to hydration inside the sandbox.",
    request: "{ code: string, props: unknown }",
    response: "Promise<boolean> indicating whether validation passed.",
  },
  {
    name: "stop",
    invocation: "request",
    summary: "Destroys the current sandbox iframe and resets instrumentation hooks.",
    request: "void",
    response: "Promise<void>",
  },
  {
    name: "setEditMode",
    invocation: "request",
    summary: "Enables or disables the inline code editor helpers that wrap the sandbox.",
    request: "boolean",
    response: "Promise<void>",
  },
  {
    name: "screenshot",
    invocation: "request",
    summary: "Captures a data URL snapshot of the current sandbox DOM.",
    request: "void",
    response:
      "Promise<{ imageBase64: string, scrollX: number, scrollY: number } | null> for further processing.",
  },
  {
    name: "setAdditionalGlobals",
    invocation: "request",
    summary: "Injects ad-hoc globals (tool input/output, widget helpers, etc.) into the inner iframe.",
    request: "{ additionalGlobals: Record<string, unknown> }",
    response: "Promise<void>",
  },
  {
    name: "setWidgetProps",
    invocation: "request",
    summary: "Refreshes widget-scoped globals such as state, props, and follow-up metadata.",
    request:
      "{ widgetId: string, widgetState: unknown, toolInput?: unknown, toolOutput?: unknown, toolResponseMetadata?: unknown }",
    response: "Promise<void>",
  },
  {
    name: "setTheme",
    invocation: "request",
    summary: "Applies the current theme token to the inner iframe and republishes it as a global.",
    request: "{ theme: ThemeName | null }",
    response: "Promise<void>",
  },
  {
    name: "setSafeArea",
    invocation: "request",
    summary: "Updates safe-area padding CSS variables in the inner iframe and mirrors them to globals.",
    request: "{ safeArea: SafeAreaDescriptor | null }",
    response: "Promise<void>",
  },
  {
    name: "navigate",
    invocation: "request",
    summary: "Invokes history navigation helpers instrumented inside the sandbox iframe.",
    request: "{ delta?: number } | { popToRoot: true }",
    response: "Promise<void>",
  },
  {
    name: "getCurrentPath",
    invocation: "request",
    summary: "Returns the sandbox iframe's current pathname for analytics or routing integration.",
    request: "void",
    response: "Promise<string | null>",
  },
] as const;

export const SANDBOX_GENERATOR_METHODS = new Set<SandboxRpcMethodName>(
  SANDBOX_RPC_METHODS.filter((method) => method.invocation === "generator").map((method) => method.name),
);

export type HostRpcMethodName =
  | "sendInstrument"
  | "notifyEnvironmentError"
  | "notifySecurityPolicyViolation"
  | "notifyIntrinsicHeight"
  | "notifyBackgroundColor"
  | "notifyEscapeKey"
  | "openExternal"
  | "getDownloadURL"
  | "updateWidgetState"
  | "requestDisplayMode"
  | "callCompletion"
  | "streamCompletion"
  | "sendFollowUpMessage";

export interface HostRpcDescription {
  readonly name: HostRpcMethodName;
  readonly invocation: "generator" | "request";
  readonly summary: string;
  readonly request: string;
  readonly response: string;
}

export const HOST_RPC_METHODS: readonly HostRpcDescription[] = [
  {
    name: "sendInstrument",
    invocation: "request",
    summary: "Records telemetry counters, histograms, or interaction markers on the host side.",
    request: "InstrumentPayload",
    response: "Promise<void>",
  },
  {
    name: "notifyEnvironmentError",
    invocation: "request",
    summary: "Reports a fatal sandbox error to the host UI.",
    request: "EnvironmentErrorPayload",
    response: "Promise<void>",
  },
  {
    name: "notifySecurityPolicyViolation",
    invocation: "request",
    summary: "Surfaces CSP violations triggered within the sandbox iframe.",
    request: "SecurityViolation",
    response: "Promise<void>",
  },
  {
    name: "notifyIntrinsicHeight",
    invocation: "request",
    summary: "Sends measured inner iframe height updates so the host can resize the container.",
    request: "number",
    response: "Promise<void>",
  },
  {
    name: "notifyBackgroundColor",
    invocation: "request",
    summary: "Informs the host about the first opaque background color rendered inside the sandbox.",
    request: "string",
    response: "Promise<void>",
  },
  {
    name: "notifyEscapeKey",
    invocation: "request",
    summary: "Alerts the host that the sandbox captured an Escape key press.",
    request: "void",
    response: "Promise<void>",
  },
  {
    name: "openExternal",
    invocation: "request",
    summary: "Requests the host to open an external URL (instead of allowing the sandbox to navigate).",
    request: "{ href: string }",
    response: "Promise<void>",
  },
  {
    name: "getDownloadURL",
    invocation: "request",
    summary: "Resolves custom asset URLs (e.g. sediment://) to downloadable HTTPS endpoints.",
    request: "string",
    response: "Promise<string>",
  },
  {
    name: "updateWidgetState",
    invocation: "request",
    summary: "Writes widget state changes back into the host application store.",
    request: "{ widgetId: string, value: unknown }",
    response: "Promise<void>",
  },
  {
    name: "requestDisplayMode",
    invocation: "request",
    summary: "Asks the host to change how the widget is rendered (e.g. compact vs. expanded).",
    request: "unknown",
    response: "Promise<unknown>",
  },
  {
    name: "callCompletion",
    invocation: "request",
    summary: "Invokes a single-shot completion on behalf of the widget.",
    request: "unknown",
    response: "Promise<unknown>",
  },
  {
    name: "streamCompletion",
    invocation: "generator",
    summary: "Streams tokens from a long-running completion request over the RPC bridge.",
    request: "unknown",
    response: "AsyncGenerator<unknown>",
  },
  {
    name: "sendFollowUpMessage",
    invocation: "request",
    summary: "Pushes a follow-up chat turn back into the host conversation.",
    request: "unknown",
    response: "Promise<void>",
  },
] as const;

export const HOST_GENERATOR_METHODS = new Set<HostRpcMethodName>(
  HOST_RPC_METHODS.filter((method) => method.invocation === "generator").map((method) => method.name),
);

export interface SandboxInitMessage {
  type: "init";
  ports: Record<SandboxRpcMethodName | string, MessagePort>;
  replyPort: MessagePort;
}

export interface RunWidgetInvocation {
  options: RunWidgetCodeOptions;
  iterator: AsyncGenerator<HtmlRunEvent>;
}

export interface ParentSandboxState {
  iframe: HTMLIFrameElement | null;
  lastRun?: RunWidgetInvocation;
  theme?: ThemeName | null;
  safeArea?: SafeAreaDescriptor | null;
}
