import { useWebplusGlobal } from "./useWebplusGlobal";

export const useMaxHeight = (): number | null => {
  return useWebplusGlobal("maxHeight");
};

