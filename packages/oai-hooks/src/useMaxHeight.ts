import { useOpenAiGlobal } from './useOpenAIGlobal';

export const useMaxHeight = (): number => {
  return useOpenAiGlobal('maxHeight');
};

