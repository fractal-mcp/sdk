/**
 * Reverse engineered helper from `set-theme-Cu8raYyE.js`.
 *
 * Minified identifier map:
 *   - `o` → `applyTheme`
 *   - `s` → `theme`
 *   - `e` → `iframe`
 *   - `t` → `documentElement`
 */

export type ThemeName = "light" | "dark" | (string & {});

export function applyTheme(
  iframe: HTMLIFrameElement | null | undefined,
  theme: ThemeName,
): void {
  const documentElement = iframe?.contentDocument?.documentElement;
  if (!documentElement) return;

  documentElement.dataset.theme = theme;
  documentElement.classList.remove("light", "dark");
  documentElement.classList.add(theme);
}
