import { getHostApi, userActivationIsActive } from "./hostMessaging";

/**
 * Minified identifier map from `main-xonCUAoo.js`:
 *   - `Ft` → `ROOT_IFRAME_ID`
 *   - `rt` → `getSandboxIframe`
 *   - `oe` → `removeSandboxIframe`
 *   - `Pn` → `ensureSandboxIframe`
 *   - `Mn` → `instrumentSandboxInteractions`
 */

export const ROOT_IFRAME_ID = "root";

export function getSandboxIframe(): HTMLIFrameElement | null {
  return document.getElementById(ROOT_IFRAME_ID) as HTMLIFrameElement | null;
}

export function removeSandboxIframe(): void {
  getSandboxIframe()?.remove();
}

export function ensureSandboxIframe(): HTMLIFrameElement {
  const existing = getSandboxIframe();
  if (existing) return existing;

  const iframe = document.createElement("iframe");
  iframe.id = ROOT_IFRAME_ID;
  document.body.appendChild(iframe);
  return iframe;
}

function urlsMatch(origin: Location, href: string): boolean {
  try {
    const target = new URL(href, origin.href);
    return target.hostname === origin.hostname && target.protocol === origin.protocol;
  } catch {
    return false;
  }
}

export function instrumentSandboxInteractions(iframe: HTMLIFrameElement): void {
  const contentWindow = iframe.contentWindow;
  if (!contentWindow) return;

  const host = getHostApi();

  const openExternalIfNeeded = (targetHref: string) => {
    if (!contentWindow.location) return;
    if (!urlsMatch(contentWindow.location, targetHref)) {
      host.openExternal?.({ href: targetHref });
    }
  };

  const clickListener = (event: MouseEvent) => {
    if (!event.isTrusted) return;
    host.sendInstrument({ type: "interaction", label: "click" });

    if (event.type !== "click") return;
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const anchor = target.closest<HTMLAnchorElement>("a");
    if (!anchor || !anchor.getAttribute("href")) return;

    const href = anchor.getAttribute("href")!;
    if (!urlsMatch(contentWindow.location, href)) {
      openExternalIfNeeded(href);
      event.preventDefault();
    }
  };

  const keydownListener = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      host.notifyEscapeKey?.();
    }
  };

  contentWindow.addEventListener("click", clickListener, { capture: true });
  contentWindow.addEventListener("keydown", keydownListener, { passive: true });

  contentWindow.open = (href?: string | URL, target?: string, features?: string) => {
    if (!href) return null;
    openExternalIfNeeded(String(href));
    return null;
  };
}

export function guardUserGesture<T extends (...args: unknown[]) => unknown>(
  callback: T,
): T {
  return (((...args: unknown[]) => {
    if (!userActivationIsActive()) {
      console.warn("Host API method invoked without a synchronous user gesture.");
      return undefined;
    }
    return callback(...(args as Parameters<T>));
  }) as unknown) as T;
}
