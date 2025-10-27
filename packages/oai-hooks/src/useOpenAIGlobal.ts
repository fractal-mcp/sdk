import { useSyncExternalStore } from 'react';
import {
  OPENAI_SET_GLOBALS_EVENT_TYPE,
  OpenAiSetGlobalsEvent,
  type OpenAiGlobals,
} from '@fractal-mcp/oai-types';

/**
 * Hook to access individual OpenAI global values with reactive updates.
 * This is the official pattern from the OpenAI Apps SDK documentation.
 *
 * @param key - The global property to subscribe to
 * @returns The current value of the specified global
 */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K,
): OpenAiGlobals[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: OpenAiSetGlobalsEvent) => {
        const value = event.detail.globals[key];
        if (value === undefined) {
          return;
        }

        onChange();
      };

      window.addEventListener(OPENAI_SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });

      return () => {
        window.removeEventListener(OPENAI_SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => window.openai?.[key],
  );
}

// Alias for backward compatibility
export const useOpenAIGlobal = useOpenAiGlobal;
