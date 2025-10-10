import { applyContentSecurityPolicy, CspConfiguration } from "./applyCsp";
import { runHTMLAsync, RunHtmlOptions } from "./runHtml";
import { getHostApi, locale } from "./hostMessaging";
import { SandboxLoggerLike } from "./sandboxLogger";
import { SafeAreaDescriptor } from "./safeArea";
import { ThemeName } from "./theme";

/**
 * Re-creates the orchestration logic from `run-widget-code-BQGNBqus.js`.
 */

export interface RunWidgetCodeOptions {
  html: string;
  widgetId: string;
  widgetState: unknown;
  widgetProps?: unknown;
  maxHeight?: number | null;
  toolInput?: unknown;
  toolOutput?: unknown;
  toolResponseMetadata?: unknown;
  displayMode?: string | null;
  theme?: ThemeName;
  userAgent?: string | null;
  safeArea?: SafeAreaDescriptor;
  csp?: CspConfiguration | null;
}

export async function* runWidgetCode(
  logger: SandboxLoggerLike,
  options: RunWidgetCodeOptions,
): AsyncIterableIterator<unknown> {
  try {
    if (options.csp) {
      applyContentSecurityPolicy(options.csp);
    }
  } catch (error) {
    logger.error("Failed to apply CSP", error);
    throw error;
  }

  let globals: Record<string, unknown> | undefined;
  try {
    const hostGlobals = getHostApi() as Record<string, unknown>;
    hostGlobals.displayMode = options.displayMode ?? null;
    hostGlobals.maxHeight = options.maxHeight ?? null;
    hostGlobals.theme = options.theme ?? null;
    hostGlobals.locale = locale;
    hostGlobals.userAgent = options.userAgent ?? null;
    hostGlobals.widget = {
      state: options.widgetState,
      props: options.widgetProps ?? options.toolOutput,
      setState: (next: unknown) => {
        const host = getHostApi();
        return host.updateWidgetState?.(options.widgetId, next);
      },
    };
    hostGlobals.toolInput = options.toolInput ?? null;
    hostGlobals.toolOutput = options.toolOutput ?? null;
    hostGlobals.widgetState = options.widgetState;
    hostGlobals.setWidgetState = (next: unknown) => {
      const host = getHostApi();
      return host.updateWidgetState?.(options.widgetId, next);
    };
    hostGlobals.toolResponseMetadata = options.toolResponseMetadata ?? null;
    globals = hostGlobals;
  } catch (error) {
    logger.error("Failed to prepare widget globals", error);
  }

  const iteratorOptions: RunHtmlOptions = {
    sandboxLogger: logger,
    html: options.html,
    theme: options.theme,
    safeArea: options.safeArea,
    additionalGlobals: globals,
    transformPosition: null,
  };

  yield* runHTMLAsync(iteratorOptions);
}
