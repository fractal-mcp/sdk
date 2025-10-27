import { useOpenAiGlobal } from './useOpenAIGlobal';

/**
 * Hook to access the tool input data.
 * Based on official OpenAI Apps SDK documentation.
 */
export function useToolInput<T = Record<string, unknown>>(): T {
  return useOpenAiGlobal('toolInput') as T;
}
