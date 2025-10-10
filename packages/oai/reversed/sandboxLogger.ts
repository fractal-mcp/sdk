import { SandboxMessageType } from "./types";
import { getHostApi } from "./hostMessaging";

/**
 * Minified identifier map from `main-xonCUAoo.js`:
 *   - `N` → `SandboxLogger`
 */

export interface InstrumentationEvent {
  type: "count" | "hist" | "interaction" | "error";
  label?: string;
  value?: number;
  count?: number;
  tags?: Record<string, string | number>;
  message?: string;
  error?: unknown;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export class SandboxLogger {
  private readonly pendingTimers = new Map<string, number>();

  log(...message: unknown[]): void {
    console.log("[sandbox]", ...message);
  }

  error(message: string, error: unknown): void {
    console.error("[sandbox]", message, error);
    try {
      getHostApi().sendInstrument({ type: "error", message, error });
    } catch {
      // The host bridge is not ready yet, fall back to console logging only.
    }
  }

  environmentError(error: unknown): void {
    console.error("[sandbox]", error);

    const host = getHostApi();
    if (error instanceof Error) {
      const { name, message, stack } = error;
      host.notifyEnvironmentError({ name, message, stack: stack ?? null });
      return;
    }

    const fallbackStack = new Error().stack ?? null;
    try {
      host.notifyEnvironmentError({
        name: "Unknown environment error",
        message: JSON.stringify(error),
        stack: fallbackStack,
      });
    } catch {
      host.notifyEnvironmentError({
        name: "Unknown environment error",
        message: "Failed to stringify error",
        stack: fallbackStack,
      });
    }
  }

  count(label: string, count = 1, tags?: Record<string, string | number>): void {
    getHostApi().sendInstrument({ type: "count", label, count, tags });
  }

  time(label: string): void {
    this.pendingTimers.set(label, now());
  }

  timeEnd(label: string): void {
    const started = this.pendingTimers.get(label);
    if (started == null) return;
    this.pendingTimers.delete(label);

    const duration = now() - started;
    getHostApi().sendInstrument({ type: "hist", label, value: duration });
  }

  emitLifecycle(state: SandboxMessageType): void {
    getHostApi().sendInstrument({ type: "count", label: state });
  }
}

export type SandboxLoggerLike = Pick<
  SandboxLogger,
  "log" | "error" | "environmentError" | "count" | "time" | "timeEnd"
>;

