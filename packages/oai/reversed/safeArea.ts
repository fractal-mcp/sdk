/**
 * Reverse engineered helper from `set-safe-area-vars-Bn-pRjCL.js`.
 *
 * Minified identifier map:
 *   - `m` → `applySafeAreaVariables`
 *   - `e` → `iframe`
 *   - `r` → `safeArea`
 *   - `t` → `documentElement`
 *   - `o` → `safeArea.insets`
 */

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SafeAreaDescriptor {
  insets: SafeAreaInsets;
}

export function applySafeAreaVariables(
  iframe: HTMLIFrameElement | null | undefined,
  safeArea: SafeAreaDescriptor,
): void {
  const documentElement = iframe?.contentDocument?.documentElement;
  if (!documentElement) {
    return;
  }

  const { top, bottom, left, right } = safeArea.insets;
  documentElement.style.setProperty("--safe-area-inset-top", `${top}px`);
  documentElement.style.setProperty("--safe-area-inset-bottom", `${bottom}px`);
  documentElement.style.setProperty("--safe-area-inset-left", `${left}px`);
  documentElement.style.setProperty("--safe-area-inset-right", `${right}px`);
}
