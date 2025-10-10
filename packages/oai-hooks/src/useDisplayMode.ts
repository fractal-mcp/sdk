import { useWebplusGlobal } from "./useWebplusGlobal";
import { type DisplayMode } from "./types";

export const useDisplayMode = (): DisplayMode | null => {
  return useWebplusGlobal("displayMode");
};

