import { useSyncExternalStore } from 'react';
import {
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
  type WebplusGlobals,
} from './types';

function createFallbackWebplus(): Window['webplus'] {
  const fallback: Partial<Window['webplus']> = {
    theme: 'light',
    userAgent: {
      device: { type: 'desktop' },
      capabilities: { hover: true, touch: false },
    },
    maxHeight: Number.POSITIVE_INFINITY,
    displayMode: 'inline',
    safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    toolInput: {},
    toolOutput: {},
    widgetState: null,
  };

  const dispatchGlobals = (globals: Partial<WebplusGlobals>) => {
    Object.assign(fallback, globals);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new SetGlobalsEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: { globals },
        }),
      );
    }
  };

  Object.assign(fallback, {
    setWidgetState: async (state: WebplusGlobals['widgetState']) => {
      dispatchGlobals({ widgetState: state });
    },
    requestDisplayMode: async ({ mode }: { mode: WebplusGlobals['displayMode'] }) => {
      dispatchGlobals({ displayMode: mode });
      return { mode };
    },
    callTool: async () => ({ result: '' }),
    callCompletion: async () => ({
      content: { type: 'text', text: '' },
      model: 'mock',
      role: 'assistant',
    }),
    streamCompletion: async function* () {
      return;
    },
    sendFollowUpMessage: async () => {
      return;
    },
  });

  return fallback as Window['webplus'];
}

let fallbackInstance: Window['webplus'] | null = null;

function ensureWebplus(): Window['webplus'] {
  if (typeof window === 'undefined') {
    fallbackInstance ??= createFallbackWebplus();
    return fallbackInstance;
  }

  if (!window.webplus) {
    fallbackInstance ??= createFallbackWebplus();
    window.webplus = fallbackInstance;
  }

  // Create a compatible openai object that mirrors the official API
  window.openai = window.openai ?? {
    ...window.webplus,
    locale: 'en-US', // Add missing locale field
  };
  return window.webplus;
}

// Defensive accessor that safely gets a value from webplus
function getWebplusValue<K extends keyof WebplusGlobals>(
  key: K,
): WebplusGlobals[K] | null {
  try {
    const webplus = ensureWebplus();
    if (!webplus) {
      return null;
    }

    const value = webplus[key];
    // Return null for undefined values instead of undefined
    return value === undefined ? null : value;
  } catch (error) {
    console.warn(`[useWebplusGlobal] Failed to get ${String(key)}:`, error);
    return null;
  }
}

export function useWebplusGlobal<K extends keyof WebplusGlobals>(
  key: K,
): WebplusGlobals[K] | null {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') {
        return () => {};
      }

      try {
        const webplus = ensureWebplus();

        const handleSetGlobal = (event: SetGlobalsEvent) => {
          try {
            const value = event.detail.globals[key];
            if (value === undefined) {
              return;
            }

            Object.assign(webplus, event.detail.globals);
            onChange();
          } catch (error) {
            console.warn(`[useWebplusGlobal] Error in handleSetGlobal for ${String(key)}:`, error);
          }
        };

        window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
          passive: true,
        });

        return () => {
          window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
        };
      } catch (error) {
        console.warn(`[useWebplusGlobal] Failed to setup listener for ${String(key)}:`, error);
        return () => {};
      }
    },
    () => getWebplusValue(key),
    () => getWebplusValue(key),
  );
}
