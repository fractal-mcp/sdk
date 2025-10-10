import React, {
  CSSProperties,
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createGeneratorRpcEndpoint,
  createRpcEndpoint,
} from "../reversed/rpc";
import type {
  InstrumentPayload,
  EnvironmentErrorPayload,
  SecurityViolation,
  HostApi,
} from "../reversed/hostMessaging";
import type { RunWidgetCodeOptions } from "../reversed/runWidgetCode";
import type { HtmlRunEvent } from "../reversed/runHtml";
import type { CspConfiguration } from "../reversed/applyCsp";
import type { SafeAreaDescriptor } from "../reversed/safeArea";
import type { ThemeName } from "../reversed/theme";
import {
  HostRpcMethodName,
  SANDBOX_GENERATOR_METHODS,
  SandboxInitMessage,
  SandboxRpcMethodName,
} from "../reversed/messageProtocol";

type RpcFunction<Arguments extends unknown[], Result> = ((
  ...args: Arguments
) => Promise<Result>) & {
  withOptions?: (options: { signal?: AbortSignal }) => (
    ...args: Arguments
  ) => Promise<Result>;
};

type GeneratorRpcFunction<Arguments extends unknown[], Yield, Return, Next> = ((
  ...args: Arguments
) => AsyncGenerator<Yield, Return, Next>) & {
  withOptions?: (options: { signal?: AbortSignal }) => (
    ...args: Arguments
  ) => AsyncGenerator<Yield, Return, Next>;
};

export interface SandboxRemoteApi {
  runWidgetCode?: GeneratorRpcFunction<[RunWidgetCodeOptions], HtmlRunEvent, unknown, void>;
  setWidgetProps?: RpcFunction<
    [
      {
        widgetId: string;
        widgetState: unknown;
        toolInput?: unknown;
        toolOutput?: unknown;
        toolResponseMetadata?: unknown;
      },
    ],
    void
  >;
  setTheme?: RpcFunction<[{ theme: ThemeName | null }], void>;
  setSafeArea?: RpcFunction<[{ safeArea: SafeAreaDescriptor | null }], void>;
  navigate?: RpcFunction<[{ delta?: number; popToRoot?: true }], void>;
  stop?: RpcFunction<[], void>;
  getCurrentPath?: RpcFunction<[], string | null>;
  [key: string]: unknown;
}

export interface SandboxParentBridgeProps {
  sandboxUrl: string;
  sessionId: string;
  appName: string;
  locale?: string;
  html: string;
  widgetId: string;
  widgetState: unknown;
  widgetProps?: unknown;
  toolInput?: unknown;
  toolOutput?: unknown;
  toolResponseMetadata?: unknown;
  displayMode?: string | null;
  theme?: ThemeName;
  safeArea?: SafeAreaDescriptor;
  maxHeight?: number | null;
  userAgent?: string | null;
  csp?: CspConfiguration | null;
  autoRun?: boolean;
  className?: string;
  style?: CSSProperties;
  iframeRef?: MutableRefObject<HTMLIFrameElement | null>;
  onEvent?: (event: HtmlRunEvent) => void;
  onReady?: (api: SandboxRemoteApi) => void;
  onInstrument?: (payload: InstrumentPayload) => void;
  onEnvironmentError?: (payload: EnvironmentErrorPayload) => void;
  onSecurityViolation?: (violation: SecurityViolation) => void;
  onIntrinsicHeight?: (height: number) => void;
  onBackgroundColor?: (color: string) => void;
  onEscapeKey?: () => void;
  onOpenExternal?: HostApi["openExternal"];
  onDownloadAsset?: HostApi["getDownloadURL"];
  onUpdateWidgetState?: HostApi["updateWidgetState"];
  requestDisplayMode?: HostApi["requestDisplayMode"];
  callCompletion?: HostApi["callCompletion"];
  streamCompletion?: (
    payload: unknown,
    context: { signal: AbortSignal },
  ) => AsyncGenerator<unknown, unknown, unknown>;
  sendFollowUpMessage?: HostApi["sendFollowUpMessage"];
}

interface HostCallbackRegistry {
  onInstrument?: (payload: InstrumentPayload) => void;
  onEnvironmentError?: (payload: EnvironmentErrorPayload) => void;
  onSecurityViolation?: (violation: SecurityViolation) => void;
  onIntrinsicHeight?: (height: number) => void;
  onBackgroundColor?: (color: string) => void;
  onEscapeKey?: () => void;
  onOpenExternal?: HostApi["openExternal"];
  onDownloadAsset?: HostApi["getDownloadURL"];
  onUpdateWidgetState?: HostApi["updateWidgetState"];
  requestDisplayMode?: HostApi["requestDisplayMode"];
  callCompletion?: HostApi["callCompletion"];
  streamCompletion?: (
    payload: unknown,
    context: { signal: AbortSignal },
  ) => AsyncGenerator<unknown, unknown, unknown>;
  sendFollowUpMessage?: HostApi["sendFollowUpMessage"];
}

const EMPTY_GENERATOR = async function* emptyGenerator(): AsyncGenerator<unknown, void, unknown> {};

function buildIframeSrc(baseUrl: string, query: Record<string, string>): string {
  const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.href : "http://localhost");
  for (const [key, value] of Object.entries(query)) {
    if (value.length > 0) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function toRunOptions(props: SandboxParentBridgeProps): RunWidgetCodeOptions {
  return {
    html: props.html,
    widgetId: props.widgetId,
    widgetState: props.widgetState,
    widgetProps: props.widgetProps,
    toolInput: props.toolInput,
    toolOutput: props.toolOutput,
    toolResponseMetadata: props.toolResponseMetadata,
    displayMode: props.displayMode ?? null,
    theme: props.theme,
    userAgent: props.userAgent ?? null,
    safeArea: props.safeArea,
    maxHeight: props.maxHeight ?? null,
    csp: props.csp ?? null,
  };
}

export const SandboxParentBridge: React.FC<SandboxParentBridgeProps> = (
  props,
) => {
  const [remoteApi, setRemoteApi] = useState<SandboxRemoteApi | null>(null);
  const iframeElementRef = props.iframeRef ?? useRef<HTMLIFrameElement | null>(null);
  const callbacksRef = useRef<HostCallbackRegistry>({});
  const handshakeCompleteRef = useRef(false);
  const onReadyRef = useRef(props.onReady);

  useEffect(() => {
    callbacksRef.current = {
      onInstrument: props.onInstrument,
      onEnvironmentError: props.onEnvironmentError,
      onSecurityViolation: props.onSecurityViolation,
      onIntrinsicHeight: props.onIntrinsicHeight,
      onBackgroundColor: props.onBackgroundColor,
      onEscapeKey: props.onEscapeKey,
      onOpenExternal: props.onOpenExternal,
      onDownloadAsset: props.onDownloadAsset,
      onUpdateWidgetState: props.onUpdateWidgetState,
      requestDisplayMode: props.requestDisplayMode,
      callCompletion: props.callCompletion,
      streamCompletion: props.streamCompletion,
      sendFollowUpMessage: props.sendFollowUpMessage,
    };
  }, [
    props.onInstrument,
    props.onEnvironmentError,
    props.onSecurityViolation,
    props.onIntrinsicHeight,
    props.onBackgroundColor,
    props.onEscapeKey,
    props.onOpenExternal,
    props.onDownloadAsset,
    props.onUpdateWidgetState,
    props.requestDisplayMode,
    props.callCompletion,
    props.streamCompletion,
    props.sendFollowUpMessage,
  ]);

  useEffect(() => {
    onReadyRef.current = props.onReady;
  }, [props.onReady]);

  const src = useMemo(
    () =>
      buildIframeSrc(props.sandboxUrl, {
        sessionId: props.sessionId,
        app: props.appName,
        locale: props.locale ?? "",
      }),
    [props.sandboxUrl, props.sessionId, props.appName, props.locale],
  );

  useEffect(() => {
    handshakeCompleteRef.current = false;
    setRemoteApi(null);
  }, [src]);

  useEffect(() => {
    const iframe = iframeElementRef.current;
    if (!iframe) return;

    const handleMessage = (event: MessageEvent) => {
      if (handshakeCompleteRef.current) return;
      if (event.source !== iframe.contentWindow) return;
      const data = event.data as SandboxInitMessage | undefined;
      if (!data || data.type !== "init") return;

      handshakeCompleteRef.current = true;

      const entries = Object.entries(data.ports ?? {});
      const sandboxRemote: SandboxRemoteApi = {};

      for (const [name, port] of entries) {
        if (!(port instanceof MessagePort)) continue;
        if (SANDBOX_GENERATOR_METHODS.has(name as SandboxRpcMethodName)) {
          sandboxRemote[name] = createGeneratorRpcEndpoint(port);
        } else {
          sandboxRemote[name] = createRpcEndpoint(port);
        }
      }

      const hostDescriptor: Record<string, MessagePort> = {};
      const transfer: MessagePort[] = [];
      const registerRequest = (
        name: HostRpcMethodName,
        handler?: (...args: unknown[]) => unknown | Promise<unknown>,
      ) => {
        if (!handler) return;
        const channel = new MessageChannel();
        createRpcEndpoint(channel.port1, handler as (...args: unknown[]) => unknown);
        hostDescriptor[name] = channel.port2;
        transfer.push(channel.port2);
      };

      const registerGenerator = (
        name: HostRpcMethodName,
        factory?: (
          payload: unknown,
          context: { signal: AbortSignal },
        ) => AsyncGenerator<unknown, unknown, unknown>,
      ) => {
        if (!factory) return;
        const channel = new MessageChannel();
        createGeneratorRpcEndpoint(channel.port1, (payload: unknown) => {
          const controller = new AbortController();
          const iterator = factory(payload, { signal: controller.signal }) ?? EMPTY_GENERATOR();
          const wrapped = (async function* wrappedGenerator() {
            for await (const chunk of iterator) {
              yield chunk;
            }
          })();
          const asyncDispose = Symbol.asyncDispose ?? Symbol.for("Symbol.asyncDispose");
          const syncDispose = Symbol.dispose ?? Symbol.for("Symbol.dispose");
          (wrapped as Record<PropertyKey, unknown>)[asyncDispose] = async () => {
            controller.abort();
            if (typeof (iterator as { return?: () => Promise<unknown> }).return === "function") {
              await (iterator as { return?: () => Promise<unknown> }).return?.();
            }
          };
          (wrapped as Record<PropertyKey, unknown>)[syncDispose] = () => {
            controller.abort();
            (iterator as { return?: () => unknown }).return?.();
          };
          return wrapped;
        });
        hostDescriptor[name] = channel.port2;
        transfer.push(channel.port2);
      };

      const callbacks = callbacksRef.current;

      registerRequest("sendInstrument", (payload: unknown) => {
        callbacks.onInstrument?.(payload as InstrumentPayload);
      });
      registerRequest("notifyEnvironmentError", (payload: unknown) => {
        callbacks.onEnvironmentError?.(payload as EnvironmentErrorPayload);
      });
      registerRequest("notifySecurityPolicyViolation", (payload: unknown) => {
        callbacks.onSecurityViolation?.(payload as SecurityViolation);
      });
      registerRequest("notifyIntrinsicHeight", (height: unknown) => {
        if (typeof height === "number") {
          callbacks.onIntrinsicHeight?.(height);
        }
      });
      registerRequest("notifyBackgroundColor", (color: unknown) => {
        if (typeof color === "string") {
          callbacks.onBackgroundColor?.(color);
        }
      });
      registerRequest("notifyEscapeKey", () => {
        callbacks.onEscapeKey?.();
      });
      registerRequest("openExternal", (options: unknown) => {
        callbacks.onOpenExternal?.(options as { href: string });
      });
      registerRequest("getDownloadURL", (assetId: unknown) => {
        return callbacks.onDownloadAsset?.(assetId as string);
      });
      registerRequest("updateWidgetState", (widgetId: unknown, value: unknown) => {
        callbacks.onUpdateWidgetState?.(widgetId as string, value);
      });
      registerRequest("requestDisplayMode", (mode: unknown) => {
        return callbacks.requestDisplayMode?.(mode);
      });
      registerRequest("callCompletion", (payload: unknown) => {
        return callbacks.callCompletion?.(payload);
      });
      registerGenerator("streamCompletion", callbacks.streamCompletion);
      registerRequest("sendFollowUpMessage", (payload: unknown) => {
        return callbacks.sendFollowUpMessage?.(payload);
      });

      data.replyPort.start?.();
      data.replyPort.postMessage(hostDescriptor, transfer);
      setRemoteApi(sandboxRemote);
      onReadyRef.current?.(sandboxRemote);
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [iframeElementRef, src]);

  useEffect(() => {
    if (!remoteApi?.setTheme || props.theme === undefined) return;
    remoteApi.setTheme({ theme: props.theme ?? null }).catch(() => {});
  }, [remoteApi, props.theme]);

  useEffect(() => {
    if (!remoteApi?.setSafeArea || props.safeArea === undefined) return;
    remoteApi.setSafeArea({ safeArea: props.safeArea ?? null }).catch(() => {});
  }, [remoteApi, props.safeArea]);

  useEffect(() => {
    if (!remoteApi?.setWidgetProps) return;
    remoteApi
      .setWidgetProps({
        widgetId: props.widgetId,
        widgetState: props.widgetState,
        toolInput: props.toolInput,
        toolOutput: props.toolOutput,
        toolResponseMetadata: props.toolResponseMetadata,
      })
      .catch(() => {});
  }, [
    remoteApi,
    props.widgetId,
    props.widgetState,
    props.toolInput,
    props.toolOutput,
    props.toolResponseMetadata,
  ]);

  useEffect(() => {
    if (!remoteApi?.runWidgetCode || props.autoRun === false) {
      return;
    }
    const runOptions = toRunOptions(props);
    let cancelled = false;
    const abortController = new AbortController();
    const call = "withOptions" in remoteApi.runWidgetCode
      ? remoteApi.runWidgetCode.withOptions({ signal: abortController.signal })
      : remoteApi.runWidgetCode;

    let iterator: AsyncGenerator<HtmlRunEvent> | null = null;

    (async () => {
      try {
        iterator = await call(runOptions);
        for await (const event of iterator) {
          if (cancelled) break;
          props.onEvent?.(event);
        }
      } catch (error) {
        if (cancelled) return;
        const callbacks = callbacksRef.current;
        if (!callbacks.onEnvironmentError) return;
        if (error instanceof Error) {
          callbacks.onEnvironmentError({
            name: error.name,
            message: error.message,
            stack: error.stack ?? null,
          });
        } else {
          callbacks.onEnvironmentError({
            name: "Error",
            message: String(error),
            stack: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      abortController.abort();
      iterator?.return?.(undefined).catch(() => {});
    };
  }, [
    remoteApi,
    props.autoRun,
    props.html,
    props.widgetId,
    props.widgetState,
    props.widgetProps,
    props.toolInput,
    props.toolOutput,
    props.toolResponseMetadata,
    props.displayMode,
    props.theme,
    props.userAgent,
    props.safeArea,
    props.maxHeight,
    props.csp,
    props.onEvent,
  ]);

  return (
    <iframe
      ref={iframeElementRef}
      src={src}
      title="sandbox"
      className={props.className}
      style={props.style}
      allow="cross-origin-isolated"
    />
  );
};

export default SandboxParentBridge;
