import { createGeneratorRpcEndpoint, createRpcEndpoint } from "./rpc";

/**
 * Minified identifier map from `main-xonCUAoo.js`:
 *   - `Sn` → `initializeHostMessaging`
 *   - `ie` → `publishHostApi`
 *   - `L` → `getHostApi`
 *   - `zn` → `sessionId`
 *   - `_t` → `appName`
 *   - `In` → `locale`
 */

export interface InstrumentPayload {
  type: "count" | "hist" | "interaction" | "error";
  label?: string;
  value?: number;
  count?: number;
  tags?: Record<string, string | number>;
  message?: string;
  error?: unknown;
}

export interface SecurityViolation {
  effectiveDirective: string;
  violatedDirective: string;
  blockedURI: string;
  sourceFile: string | null;
}

export interface EnvironmentErrorPayload {
  name: string;
  message: string;
  stack: string | null;
}

export interface HostApi {
  sendInstrument(payload: InstrumentPayload): void;
  notifyEnvironmentError(error: EnvironmentErrorPayload): void;
  notifySecurityPolicyViolation?(violation: SecurityViolation): void;
  notifyIntrinsicHeight?(height: number): void;
  notifyBackgroundColor?(cssColor: string): void;
  notifyEscapeKey?(): void;
  openExternal?(options: { href: string }): void;
  getDownloadURL?(assetId: string): Promise<string>;
  updateWidgetState?(widgetId: string, value: unknown): void;
  requestDisplayMode?(mode: unknown): Promise<unknown>;
  callCompletion?(payload: unknown): Promise<unknown>;
  streamCompletion?(
    payload: unknown,
  ): AsyncGenerator<unknown, unknown, unknown> | Promise<AsyncGenerator<unknown, unknown, unknown>>;
  sendFollowUpMessage?(payload: unknown): Promise<void>;
  [key: string]: unknown;
}

type HostHandlers = Record<
  string,
  ((...args: unknown[]) => unknown) | ((...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>) | undefined
>;

const query = new URLSearchParams(window.location.search);

export const sessionId = query.get("sessionId") ?? "";
export const locale = query.get("locale") ?? "";
export const appName = query.get("app") ?? "";

const APP_ORIGINS: Record<string, string> = {
  chatgpt: "https://chatgpt.com",
  feather: "https://feather.openai.com",
  skybridge: "https://skybridge.oaistatic.com",
};

const userGestureMethods = new Set([
  "requestDisplayMode",
  "callCompletion",
  "streamCompletion",
  "sendFollowUpMessage",
  "openExternal",
]);

let hostApi: HostApi | null = null;

export function publishHostApi(api: HostApi): void {
  hostApi = api;
}

export function getHostApi(): HostApi {
  if (!hostApi) {
    throw new Error("Host API not published");
  }

  return new Proxy(hostApi, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof property === "string" && typeof value === "function" && userGestureMethods.has(property)) {
        return (...args: unknown[]) => {
          if (!userActivationIsActive()) {
            console.warn(`Method ${property} requires a synchronous user gesture.`);
            return undefined;
          }
          return (value as (...args: unknown[]) => unknown).apply(target, args);
        };
      }
      if (value == null) {
        return () => {
          console.warn(`Host API method ${String(property)} not found`);
        };
      }
      return value;
    },
  });
}

export function userActivationIsActive(): boolean {
  const activation = navigator.userActivation;
  return activation ? activation.isActive : true;
}

function resolveTargetOrigin(): string {
  return APP_ORIGINS[appName] ?? "*";
}

async function unregisterServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  await registration.unregister();
  window.location.reload();
  return true;
}

function isAsyncGeneratorFunction(value: unknown): value is (...args: unknown[]) => AsyncGenerator {
  if (typeof value !== "function") return false;
  return value.constructor?.name === "AsyncGeneratorFunction";
}

export async function initializeHostMessaging(
  handlers: HostHandlers,
  generatorMethods: string[] = [],
): Promise<HostApi | null> {
  if (await unregisterServiceWorker()) {
    return null;
  }

  const ports = Object.fromEntries(
    Object.entries(handlers).map(([name, handler]) => {
      const channel = new MessageChannel();
      if (handler) {
        if (isAsyncGeneratorFunction(handler)) {
          createGeneratorRpcEndpoint(channel.port1, handler as (...args: unknown[]) => AsyncGenerator);
        } else {
          createRpcEndpoint(channel.port1, handler as (...args: unknown[]) => unknown);
        }
      }
      return [name, channel.port2];
    }),
  );

  const replyChannel = new MessageChannel();

  window.parent.postMessage(
    {
      type: "init",
      ports,
      replyPort: replyChannel.port2,
    },
    resolveTargetOrigin(),
    [...Object.values(ports), replyChannel.port2],
  );

  const remoteDescriptor = await new Promise<Record<string, MessagePort>>((resolve) => {
    replyChannel.port1.onmessage = (event) => resolve(event.data as Record<string, MessagePort>);
    replyChannel.port1.start();
  });

  const generatorSet = new Set(generatorMethods);

  const api = Object.fromEntries(
    Object.entries(remoteDescriptor).map(([name, port]) => {
      const caller = generatorSet.has(name)
        ? createGeneratorRpcEndpoint(port)
        : createRpcEndpoint(port);
      return [name, caller];
    }),
  ) as HostApi;

  publishHostApi(api);
  return api;
}
