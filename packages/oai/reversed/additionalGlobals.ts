import { OpenAIGlobalsEvent, WebPlusGlobalsEvent, SandboxGlobalMap } from "./types";

/**
 * Minified identifier map from `set-additional-globals-CXY3m52s.js`:
 *   - `r` → `setAdditionalGlobals`
 *   - `n` → `iframe`
 *   - `e` → `additionalGlobals`
 *   - `s` → `sandboxLogger`
 *   - `W` → `overwriteExisting`
 *   - `u` → `dispatchGlobalEvents`
 */

interface SandboxWindow extends Window {
  oai?: SandboxGlobalMap;
  openai?: SandboxGlobalMap;
  webplus?: SandboxGlobalMap;
}

export interface SandboxLoggerLike {
  environmentError(error: unknown): void;
}

export interface AdditionalGlobalsOptions {
  iframe: HTMLIFrameElement | null | undefined;
  additionalGlobals: SandboxGlobalMap;
  sandboxLogger: SandboxLoggerLike;
  /**
   * When true the namespaces are replaced entirely instead of being merged.
   * This mirrors the `isInit` flag from the original minified implementation.
   */
  overwriteExisting?: boolean;
  replaceExisting?: boolean;
}

export function setAdditionalGlobals({
  iframe,
  additionalGlobals,
  sandboxLogger,
  overwriteExisting,
  replaceExisting,
}: AdditionalGlobalsOptions): void {
  const contentWindow = iframe?.contentWindow as SandboxWindow | null | undefined;
  if (!contentWindow) return;

  const shouldReplace = overwriteExisting ?? replaceExisting ?? false;

  if (shouldReplace) {
    contentWindow.oai = additionalGlobals;
    contentWindow.openai = additionalGlobals;
    contentWindow.webplus = additionalGlobals;
    return;
  }

  contentWindow.oai ??= {};
  contentWindow.openai ??= {};
  contentWindow.webplus ??= {};

  for (const [name, value] of Object.entries(additionalGlobals)) {
    try {
      contentWindow.oai![name] = value;
      contentWindow.openai![name] = value;
      contentWindow.webplus![name] = value;
    } catch (error) {
      sandboxLogger.environmentError(error);
    }
  }

  dispatchGlobalEvents(contentWindow, additionalGlobals);
}

function dispatchGlobalEvents(target: SandboxWindow, globals: SandboxGlobalMap): void {
  target.dispatchEvent(new OpenAIGlobalsEvent(globals));
  target.dispatchEvent(new WebPlusGlobalsEvent(globals));
}
