/**
 * Reconstructed from `navigation-BRdOV7LN.js`.
 *
 * Minified identifier map:
 *   - `r` → `stack`
 *   - `s` → `hashes`
 *   - `o` → `currentIndex`
 *   - `y` → `counter`
 *   - `a` → `pendingDelta`
 *   - `h` → `currentHash()` helper
 *   - `I` → `extractHash()` helper
 *   - `g` → `nextId()`
 *   - `l` → `ensureInitialized()`
 *   - `p` → `emit()`
 *   - `b` → `recordPush()`
 *   - `m` → `recordReplace()`
 *   - `f` → `applyDelta()`
 *   - `S` → `handlePopState()`
 *   - `E` → `handleHashChange()`
 *   - `k` → `classifyDelta()`
 */

export type NavigationEventType = "push" | "replace" | "pop" | "update";

export interface NavigationNotification {
  type: NavigationEventType;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface NavigationInstrumentationOptions {
  iframe: HTMLIFrameElement;
  notify?(change: NavigationNotification): void;
}

interface InstrumentedHistory extends History {
  popToRoot?: (this: History) => unknown;
}

export function installNavigationInstrumentation({
  iframe,
  notify,
}: NavigationInstrumentationOptions): () => void {
  const iframeWindow = iframe.contentWindow;
  if (!iframeWindow) {
    return () => {};
  }

  const history = iframeWindow.history as InstrumentedHistory;
  const notifyChange = notify ?? (() => {});
  const stack: number[] = [];
  const hashes: string[] = [];
  let currentIndex = -1;
  let counter = 0;
  let pendingDelta: number | null = null;

  const currentHash = (): string => iframeWindow.location.hash ?? "";

  const extractHash = (url: string | null | undefined): string => {
    if (!url) return "";
    try {
      return new URL(url, iframeWindow.location.href).hash ?? "";
    } catch {
      return "";
    }
  };

  const nextId = (): number => {
    counter += 1;
    return counter;
  };

  const ensureInitialized = (): void => {
    if (stack.length === 0) {
      stack.push(nextId());
      hashes.push(currentHash());
      currentIndex = 0;
      return;
    }

    if (hashes.length === 0) {
      hashes.push(currentHash());
    }
  };

  const emit = (type: NavigationEventType): void => {
    if (stack.length === 0 || currentIndex < 0) return;
    notifyChange({
      type,
      canGoBack: currentIndex > 0,
      canGoForward: currentIndex < stack.length - 1,
    });
  };

  const recordPush = (type: NavigationEventType, hashValue: string = currentHash()): void => {
    ensureInitialized();
    if (currentIndex < stack.length - 1) {
      stack.splice(currentIndex + 1);
      hashes.splice(currentIndex + 1);
    }

    stack.push(nextId());
    hashes.push(hashValue);
    currentIndex = stack.length - 1;
    pendingDelta = null;
    emit(type);
  };

  const recordReplace = (hashValue: string = currentHash()): void => {
    ensureInitialized();
    if (currentIndex >= 0) {
      stack[currentIndex] = nextId();
      hashes[currentIndex] = hashValue;
    }
    pendingDelta = null;
    emit("replace");
  };

  const classifyDelta = (delta: number): NavigationEventType => {
    if (delta < 0) return "pop";
    if (delta > 0) return "push";
    return "update";
  };

  const applyDelta = (delta: number): void => {
    ensureInitialized();
    const normalized = Number.isFinite(delta) ? Math.trunc(delta) : 0;
    if (normalized !== 0) {
      currentIndex = Math.min(stack.length - 1, Math.max(0, currentIndex + normalized));
    }

    pendingDelta = null;
    emit(classifyDelta(normalized));
  };

  const handlePopState = (): void => {
    applyDelta(pendingDelta ?? -1);
  };

  const handleHashChange = (event: HashChangeEvent): void => {
    const current = currentHash();

    if (pendingDelta != null) {
      applyDelta(pendingDelta);
      return;
    }

    ensureInitialized();

    const previousHash = extractHash(event.oldURL);
    const previousIndex = hashes.lastIndexOf(current);

    if (previousIndex !== -1 && previousIndex !== currentIndex) {
      applyDelta(previousIndex - currentIndex);
      return;
    }

    if (previousIndex === currentIndex) {
      emit("update");
      return;
    }

    if (previousHash && hashes[currentIndex] === previousHash) {
      recordReplace(current);
      return;
    }

    recordPush("push", current);
  };

  const originalPushState = history.pushState;
  history.pushState = function pushState(
    ...args: Parameters<History["pushState"]>
  ): ReturnType<History["pushState"]> {
    const result = originalPushState.apply(this, args);
    recordPush("push");
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function replaceState(
    ...args: Parameters<History["replaceState"]>
  ): ReturnType<History["replaceState"]> {
    const result = originalReplaceState.apply(this, args);
    recordReplace();
    return result;
  };

  const originalBack = history.back;
  history.back = function back(
    ...args: Parameters<History["back"]>
  ): ReturnType<History["back"]> {
    pendingDelta = -1;
    return originalBack.apply(this, args);
  };

  const originalForward = history.forward;
  history.forward = function forward(
    ...args: Parameters<History["forward"]>
  ): ReturnType<History["forward"]> {
    pendingDelta = 1;
    return originalForward.apply(this, args);
  };

  const originalGo = history.go;
  history.go = function go(
    ...args: Parameters<History["go"]>
  ): ReturnType<History["go"]> {
    const [value = 0] = args;
    const parsed =
      typeof value === "number" && Number.isFinite(value)
        ? Math.trunc(value)
        : Number.parseInt(String(value), 10);
    pendingDelta = Number.isFinite(parsed) ? parsed : null;
    return originalGo.apply(this, args);
  };

  const originalPopToRoot = history.popToRoot;
  history.popToRoot = function popToRoot(): ReturnType<History["go"]> | void {
    ensureInitialized();
    const delta = -currentIndex;
    if (delta === 0) {
      pendingDelta = null;
      return;
    }
    pendingDelta = delta;
    return originalGo.call(this, delta);
  };

  iframeWindow.addEventListener("popstate", handlePopState);
  iframeWindow.addEventListener("hashchange", handleHashChange);

  ensureInitialized();
  emit("replace");

  return () => {
    iframeWindow.removeEventListener("popstate", handlePopState);
    iframeWindow.removeEventListener("hashchange", handleHashChange);
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    history.back = originalBack;
    history.forward = originalForward;
    history.go = originalGo;
    if (originalPopToRoot) {
      history.popToRoot = originalPopToRoot;
    } else {
      delete history.popToRoot;
    }
  };
}

export function go(iframe: HTMLIFrameElement | null | undefined, delta?: number): void {
  const targetWindow = iframe?.contentWindow;
  targetWindow?.history.go(delta);
}

export function popToRoot(iframe: HTMLIFrameElement | null | undefined): void {
  const targetWindow = iframe?.contentWindow;
  const history = targetWindow?.history as InstrumentedHistory | undefined;
  history?.popToRoot?.call(history);
}

export const navigation = { go, popToRoot };
