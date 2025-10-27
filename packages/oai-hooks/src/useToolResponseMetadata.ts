import { useOpenAiGlobal } from './useOpenAIGlobal';

/**
 * Hook to access the tool response metadata.
 * Based on official OpenAI Apps SDK documentation.
 */
export function useToolResponseMetadata<T = Record<string, unknown>>(): T | null {
  return useOpenAiGlobal('toolResponseMetadata') as T | null;
}
