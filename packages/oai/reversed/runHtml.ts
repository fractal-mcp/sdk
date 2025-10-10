import { SandboxMessageType, EnvironmentLifecycleState, SandboxGlobalMap } from "./types";
import { createAsyncIterator } from "./createAsyncIterator";
import { setAdditionalGlobals } from "./additionalGlobals";
import { installNavigationInstrumentation } from "./navigation";
import { applySafeAreaVariables, SafeAreaDescriptor } from "./safeArea";
import { applyTheme, ThemeName } from "./theme";
import { SandboxLoggerLike } from "./sandboxLogger";
import { ensureSandboxIframe, getSandboxIframe, instrumentSandboxInteractions } from "./sandboxFrame";
import { getHostApi } from "./hostMessaging";
import { LruCache } from "./lruCache";

/**
 * Reverse engineered entry point for executing HTML in the sandbox iframe.
 *
 * Minified identifier map from `run-html-Do8mTV6K.js`:
 *   - `dt` → `runHTMLAsync`
 *   - `Q` → `installImageSourceInterceptor`
 *   - `Z` → `instrumentPointerMetrics`
 *   - `z` → `instrumentConsole`
 *   - `P` → `instrumentSecurityPolicyViolations`
 *   - `Y` → `measureDocumentHeight`
 *   - `X` → `discoverBackgroundColor`
 */

export interface PositionTransform {
  line: number | null;
  column: number | null;
  source?: string | null;
  name?: string | null;
}

export type PositionMapper = (position: { line: number | null; column: number | null }) => PositionTransform | null;

export interface RunHtmlOptions {
  sandboxLogger: SandboxLoggerLike;
  html: string;
  theme?: ThemeName;
  safeArea?: SafeAreaDescriptor;
  transformPosition?: PositionMapper | null;
  additionalGlobals?: SandboxGlobalMap;
  expectReadySignal?: boolean;
}

export type HtmlRunEvent =
  | {
      type: SandboxMessageType.ENVIRONMENT_STATUS;
      status: EnvironmentLifecycleState;
    }
  | {
      type: SandboxMessageType.RUN_COMPLETE;
      duration: number | null;
      wasCancelled: boolean;
      wasFatalError: boolean;
    }
  | {
      type: SandboxMessageType.ERROR;
      line: number | null;
      error: {
        line: number | null;
        message: string;
        name: string;
        stack: string[];
      };
    }
  | {
    type: SandboxMessageType.LOG;
    level: "info" | "warn" | "error";
    line: number | null;
    log: unknown[];
  };

const TRANSPARENT_RGBA = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/;
const DOWNLOAD_PROTOCOLS = ["sediment://", "file-service://"];
const DOWNLOAD_PLACEHOLDER = "/blank.svg";
const BASE_STYLES = `
html,body,#root{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
html,body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Helvetica Neue,Arial,sans-serif!important}
button,input,textarea,select{font-family:inherit}
`.trim();

const downloadCache = new LruCache<string, string>({ max: 100, ttl: 60 * 5_000 });

const isFullyTransparent = (color: string): boolean => {
  const match = color.match(TRANSPARENT_RGBA);
  return match ? parseFloat(match[4]) === 0 : false;
};

function findFirstOpaqueBackground(root: Element): string | null {
  const queue: Element[] = [root];

  while (queue.length > 0) {
    const element = queue.shift();
    if (!element) break;

    const { backgroundColor } = getComputedStyle(element);
    if (!isFullyTransparent(backgroundColor) && backgroundColor !== "rgba(0, 0, 0, 0)") {
      return backgroundColor;
    }

    for (const child of Array.from(element.children)) {
      queue.push(child);
    }
  }

  return null;
}

function measureElementHeight(element: Element | null | undefined): number | null {
  if (!element) return null;
  const scrollHeight = (element as HTMLElement).scrollHeight ?? 0;
  const { height } = (element as HTMLElement).getBoundingClientRect();
  const value = Math.max(scrollHeight, height);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function measureCompositeHeight(container: HTMLElement | null | undefined): number | null {
  if (!container) return null;

  const elements = Array.from(container.children).filter((child) => {
    const tag = child.tagName;
    return tag !== "SCRIPT" && tag !== "STYLE";
  }) as HTMLElement[];

  if (elements.length === 0) return null;
  if (elements.length === 1) return measureElementHeight(elements[0]);

  const hostBounds = container.getBoundingClientRect?.();
  let maxHeight = 0;

  for (const element of elements) {
    const bounds = element.getBoundingClientRect?.();
    if (!bounds) continue;
    const baseline = hostBounds ? hostBounds.top : 0;
    const candidate = bounds.bottom - baseline;
    maxHeight = Math.max(maxHeight, candidate);
  }

  return maxHeight > 0 ? maxHeight : null;
}

function measureDocumentHeight(document: Document): number | null {
  const root = document.getElementById("root");
  if (root) {
    const height = measureElementHeight(root) ?? measureCompositeHeight(root as HTMLElement);
    if (height != null) return height;
  }

  const body = document.body;
  if (body) {
    const composite = measureCompositeHeight(body);
    if (composite != null) return composite;

    const bodyHeight = measureElementHeight(body);
    if (bodyHeight != null) return bodyHeight;
  }

  return measureElementHeight(document.documentElement ?? document.scrollingElement);
}

function installImageSourceInterceptor(document: Document): void {
  const contentWindow = document.defaultView;
  if (!contentWindow) return;

  const descriptor = Object.getOwnPropertyDescriptor(
    contentWindow.HTMLImageElement.prototype,
    "src",
  );
  if (!descriptor || !descriptor.set) return;

  Object.defineProperty(contentWindow.HTMLImageElement.prototype, "src", {
    configurable: true,
    enumerable: true,
    get: descriptor.get,
    set(value: string) {
      if (typeof value === "string" && DOWNLOAD_PROTOCOLS.some((prefix) => value.startsWith(prefix))) {
        const cached = downloadCache.get(value);
        if (cached) {
          descriptor.set!.call(this, cached);
          return;
        }

        descriptor.set!.call(this, DOWNLOAD_PLACEHOLDER);
        getHostApi()
          .getDownloadURL?.(value)
          .then((resolved) => {
            if (!resolved) return;
            downloadCache.set(value, resolved);
            descriptor.set!.call(this, resolved);
          })
          .catch(() => {
            descriptor.set!.call(this, "");
          });
      } else {
        descriptor.set!.call(this, value);
      }
    },
  });
}

function instrumentPointerMetrics(document: Document): void {
  const contentWindow = document.defaultView;
  if (!contentWindow) return;

  contentWindow.addEventListener(
    "pointerdown",
    (event) => {
      for (const node of event.composedPath()) {
        if (node instanceof contentWindow.HTMLElement && node.dataset.instrument) {
          getHostApi().sendInstrument({
            type: "count",
            label: `clicked.${node.dataset.instrument}`,
          });
        }
      }
    },
    { capture: true, passive: true },
  );
}

function parseStackLocation(frame: string): { line: number | null; column: number | null } {
  const match = frame.trim().match(/(\d+):(\d+)\)?$/);
  if (!match) {
    return { line: null, column: null };
  }
  return {
    line: Number.parseInt(match[1] ?? "", 10) || null,
    column: Number.parseInt(match[2] ?? "", 10) || null,
  };
}

function formatStack(stack: string | undefined, mapper: PositionMapper | null | undefined): string[] {
  if (!stack) return [];
  const [, ...lines] = stack.split("\n");
  const formatted: string[] = [];

  for (const line of lines) {
    const position = parseStackLocation(line);
    const remapped = mapper?.(position) ?? position;
    if (remapped.line == null || remapped.column == null) break;

    formatted.push(`${line.replace(/\(.*\)/, "").trim()} (module:${remapped.line}:${remapped.column})`);
  }

  return formatted;
}

function instrumentConsole({
  document,
  sandboxLogger,
  emit,
  transformPosition,
}: {
  document: Document;
  sandboxLogger: SandboxLoggerLike;
  emit(event: HtmlRunEvent): void;
  transformPosition?: PositionMapper | null;
}): void {
  const contentWindow = document.defaultView;
  if (!contentWindow || !("console" in contentWindow)) {
    return;
  }

  const remapLine = (line: number | null, column: number | null): number | null => {
    if (!transformPosition) return line;
    const result = transformPosition({ line, column });
    return result?.line ?? line;
  };

  const forwardError = (message: string, error: unknown, line: number | null): void => {
    if (error instanceof Error) {
      emit({
        type: SandboxMessageType.ERROR,
        line,
        error: {
          line,
          message: error.message,
          name: error.name,
          stack: formatStack(error.stack, transformPosition),
        },
      });
    } else {
      emit({
        type: SandboxMessageType.ERROR,
        line,
        error: {
          line,
          message,
          name: "Error",
          stack: [],
        },
      });
    }
  };

  contentWindow.addEventListener(
    "unhandledrejection",
    (event) => {
      const reason = event.reason;
      if (reason instanceof Error) {
        const frames = formatStack(reason.stack, transformPosition);
        const topLine = parseStackLocation(frames[0] ?? "").line;
        emit({
          type: SandboxMessageType.ERROR,
          line: topLine ?? null,
          error: {
            line: topLine ?? null,
            message: String(reason.message ?? ""),
            name: reason.name ?? "Error",
            stack: frames,
          },
        });
      }
    },
    { passive: true, capture: true },
  );

  contentWindow.addEventListener(
    "error",
    (event: ErrorEvent) => {
      const mapped = transformPosition?.({ line: event.lineno ?? null, column: event.colno ?? null });
      const line = mapped?.line ?? event.lineno ?? null;

      if (event.error instanceof Error) {
        emit({
          type: SandboxMessageType.ERROR,
          line,
          error: {
            line,
            message: event.error.message,
            name: event.error.name,
            stack: formatStack(event.error.stack, transformPosition),
          },
        });
      } else {
        emit({
          type: SandboxMessageType.ERROR,
          line,
          error: {
            line,
            message: String(event.message ?? ""),
            name: "Error",
            stack: [],
          },
        });
      }
    },
    { passive: true, capture: true },
  );

  const consoleObject = contentWindow.console;

  const wrap = <T extends keyof Console>(method: T, forward: (payload: { line: number | null; args: unknown[]; error?: Error }) => void) => {
    const original = consoleObject[method];
    if (typeof original !== "function") return;

    consoleObject[method] = ((first: unknown, ...rest: unknown[]) => {
      const args = [first, ...rest];
      let frameLine: string | undefined;

      if (first instanceof Error && typeof first.stack === "string") {
        const lines = first.stack.split("\n");
        frameLine = lines[1] ?? lines[0];
      } else {
        const trace = new Error().stack ?? "";
        frameLine = trace.split("\n")[2] ?? trace.split("\n")[1];
      }

      const location = parseStackLocation(frameLine ?? "");
      const mappedLine = remapLine(location.line, location.column);

      try {
        forward({ line: mappedLine, args, error: first instanceof Error ? first : undefined });
      } catch (error) {
        sandboxLogger.error("Failed to forward console log", error);
      }

      return original.apply(consoleObject, args as []);
    }) as Console[typeof method];
  };

  wrap("error", ({ line, args, error }) => {
    if (error) {
      forwardError(error.message, error, line);
    } else {
      emit({
        type: SandboxMessageType.ERROR,
        line,
        error: {
          line,
          message: String(args[0] ?? ""),
          name: "Error",
          stack: [],
        },
      });
    }

    if (args.length > 0) {
      emit({ type: SandboxMessageType.LOG, level: "info", line, log: args });
    }
  });

  wrap("log", ({ line, args }) => {
    emit({ type: SandboxMessageType.LOG, level: "info", line, log: args });
  });
}

function instrumentSecurityPolicyViolations(document: Document): void {
  const contentWindow = document.defaultView;
  contentWindow?.addEventListener(
    "securitypolicyviolation",
    (event: SecurityPolicyViolationEvent) => {
      getHostApi().notifySecurityPolicyViolation?.({
        effectiveDirective: event.effectiveDirective,
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
      });
    },
  );
}

function injectBaseStyles(document: Document): void {
  try {
    const style = document.createElement("style");
    style.textContent = BASE_STYLES;
    document.head.appendChild(style);
  } catch {
    // Ignored – failing to inject helper styles is non-fatal.
  }
}

function isIgnorableNode(node: Node): boolean {
  if (node.nodeType === Node.COMMENT_NODE) return true;
  if (node.nodeType === Node.TEXT_NODE) {
    return !(node.textContent && node.textContent.trim());
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node.childNodes.length === 0;
  }
  return true;
}

export async function* runHTMLAsync(options: RunHtmlOptions): AsyncIterableIterator<HtmlRunEvent> {
  const {
    sandboxLogger,
    html,
    theme,
    safeArea,
    transformPosition,
    additionalGlobals,
  } = options;

  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;

  const iterator = createAsyncIterator<HtmlRunEvent>(({ push, complete }) => {
    const emit = (event: HtmlRunEvent) => {
      push(event);
      if (event.type === SandboxMessageType.RUN_COMPLETE) {
        complete();
      }
    };

    sandboxLogger.time("html.evaluation");

    const previousIframe = getSandboxIframe();
    const iframe = ensureSandboxIframe();

    const handleLoad = () => {
      const contentDocument = iframe.contentDocument;
      const contentWindow = iframe.contentWindow;
      if (!contentDocument || !contentWindow) {
        return;
      }

      const globals: SandboxGlobalMap = { ...(additionalGlobals ?? {}) };
      if (safeArea) {
        globals.safeArea = safeArea;
      }

      if (Object.keys(globals).length > 0) {
        setAdditionalGlobals({
          iframe,
          additionalGlobals: globals,
          sandboxLogger,
          overwriteExisting: true,
        });
      }

      contentDocument.open();
      instrumentSandboxInteractions(iframe);
      installNavigationInstrumentation({ iframe });
      instrumentSecurityPolicyViolations(contentDocument);
      instrumentPointerMetrics(contentDocument);
      instrumentConsole({
        document: contentDocument,
        sandboxLogger,
        emit,
        transformPosition,
      });
      installImageSourceInterceptor(contentDocument);

      let lastBackground: string | null = null;
      let lastHeight: number | null = null;

      const notifyHeight = () => {
        const height = measureDocumentHeight(contentDocument);
        if (height != null && height !== lastHeight) {
          getHostApi().notifyIntrinsicHeight?.(height);
          lastHeight = height;
        }
      };

      const notifyBackground = () => {
        const color = findFirstOpaqueBackground(contentDocument.documentElement ?? contentDocument.body ?? null);
        if (color && color !== lastBackground) {
          getHostApi().notifyBackgroundColor?.(color);
          lastBackground = color;
        }
      };

      const finishInitialization = () => {
        previousIframe?.remove();
        sandboxLogger.timeEnd("html.evaluation");
        emit({
          type: SandboxMessageType.ENVIRONMENT_STATUS,
          status: EnvironmentLifecycleState.RUNNING_CODE,
        });
      };

      const abortWithFatalError = () => {
        mutationObserver?.disconnect();
        resizeObserver?.disconnect();
        emit({
          type: SandboxMessageType.RUN_COMPLETE,
          duration: null,
          wasCancelled: false,
          wasFatalError: true,
        });
      };

      resizeObserver = new ResizeObserver(() => {
        notifyHeight();
      });
      if (contentDocument.documentElement) {
        resizeObserver.observe(contentDocument.documentElement, { box: "border-box" });
      }

      mutationObserver = new MutationObserver((records) => {
        for (const record of records) {
          if (record.target === contentDocument.documentElement) {
            if (
              record.attributeName === "data-ready" &&
              contentDocument.documentElement?.hasAttribute("data-ready")
            ) {
              finishInitialization();
              break;
            }
            if (
              record.attributeName === "data-fatal" &&
              contentDocument.documentElement?.hasAttribute("data-fatal")
            ) {
              abortWithFatalError();
              break;
            }
          } else if (
            record.addedNodes.length === 0 &&
            record.removedNodes.length > 0 &&
            record.target.parentElement === contentDocument.body &&
            record.target.childNodes.length === 0
          ) {
            const nodes = Array.from(contentDocument.body?.childNodes ?? []);
            if (nodes.every((node) => node === record.target || isIgnorableNode(node))) {
              abortWithFatalError();
              break;
            }
          }
        }

        notifyBackground();
        notifyHeight();
      });

      mutationObserver.observe(contentDocument.documentElement ?? contentDocument.body ?? contentDocument, {
        attributes: true,
        childList: true,
        subtree: true,
      });

      const documentElement = contentDocument.documentElement;
      if (documentElement && theme) {
        applyTheme(iframe, theme);
      }

      if (safeArea) {
        applySafeAreaVariables(iframe, safeArea);
      }

      injectBaseStyles(contentDocument);
      contentDocument.write(html);
      contentDocument.close();

      finishInitialization();
      if (documentElement?.hasAttribute("data-ready")) {
        finishInitialization();
      }

      notifyBackground();
      notifyHeight();
    };

    iframe.addEventListener("load", handleLoad, { once: true });
    iframe.src = "about:blank";

    if (iframe.parentElement) {
      const removalObserver = new MutationObserver(() => {
        if (!iframe.isConnected) {
          removalObserver.disconnect();
          resizeObserver?.disconnect();
          mutationObserver?.disconnect();
          emit({
            type: SandboxMessageType.RUN_COMPLETE,
            duration: null,
            wasCancelled: false,
            wasFatalError: false,
          });
        }
      });
      removalObserver.observe(iframe.parentElement, { childList: true, attributes: true, subtree: true });
    }
  });

  yield* iterator;
}
