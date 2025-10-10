import { useWebplusGlobal } from "./use-webplus-global";

export const useMaxHeight = (): number | null => {
  return useWebplusGlobal("maxHeight");
};
