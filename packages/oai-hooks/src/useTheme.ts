import { useOpenAiGlobal } from './useOpenAIGlobal';
import { type Theme } from './types';

/**
 * Hook to access the current theme.
 * Based on official OpenAI Apps SDK documentation.
 */
export function useTheme(): Theme {
  return useOpenAiGlobal('theme');
}
