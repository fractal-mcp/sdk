import { useOpenAiGlobal } from './useOpenAIGlobal';
import { type SafeArea } from './types';

/**
 * Hook to access the safe area insets.
 * Based on official OpenAI Apps SDK documentation.
 */
export function useSafeArea(): SafeArea {
  return useOpenAiGlobal('safeArea');
}
