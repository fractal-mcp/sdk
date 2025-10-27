import { useOpenAiGlobal } from './useOpenAIGlobal';

/**
 * Hook to access the tool output data.
 * Based on official OpenAI Apps SDK documentation.
 */
export function useToolOutput<T = Record<string, unknown>>(): T | null {
  return useOpenAiGlobal('toolOutput') as T | null;
}
