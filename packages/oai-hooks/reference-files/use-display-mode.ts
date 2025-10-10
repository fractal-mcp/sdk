import { useWebplusGlobal } from "./use-webplus-global";
import { type DisplayMode } from "./types";

export const useDisplayMode = (): DisplayMode | null => {
  return useWebplusGlobal("displayMode");
};
