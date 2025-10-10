/**
 * Reverse engineered type declarations extracted from the minified
 * `types-Bm40F6nV.js` bundle.
 *
 * Minified identifier map:
 *   - `A` → `SandboxMessageType`
 *   - `G` → `EnvironmentLifecycleState`
 *   - `r` → `WebPlusGlobalsEvent`
 *   - `c` → `OpenAIGlobalsEvent`
 */

/**
 * Wire protocol messages emitted by the sandbox when executing code.
 */
export enum SandboxMessageType {
  LOG = "log",
  RUN_START = "run_start",
  ENVIRONMENT_STATUS = "environment_status",
  OUTPUT = "output",
  ERROR = "error",
  RUN_COMPLETE = "run_complete",
}

/**
 * High level status values reported while the sandbox prepares or runs code.
 */
export enum EnvironmentLifecycleState {
  INITIALIZING,
  INSTALLING_PACKAGES,
  RUNNING_CODE,
}

const WEBPLUS_GLOBALS_EVENT = "webplus:set_globals" as const;
const OPENAI_GLOBALS_EVENT = "openai:set_globals" as const;

export interface SandboxGlobalMap {
  [globalName: string]: unknown;
}

/**
 * Event dispatched when the sandbox wants to expose globals under the
 * historic `webplus` namespace.
 */
export class WebPlusGlobalsEvent extends CustomEvent<{ globals: SandboxGlobalMap }> {
  constructor(globals: SandboxGlobalMap) {
    super(WEBPLUS_GLOBALS_EVENT, { detail: { globals } });
    // Align the public `type` property with the event name even in older
    // browsers that do not allow overriding it via the constructor.
    (this as { type: string }).type = WEBPLUS_GLOBALS_EVENT;
  }
}

/**
 * Event dispatched when the sandbox wants to expose globals under the
 * `openai` namespace.
 */
export class OpenAIGlobalsEvent extends CustomEvent<{ globals: SandboxGlobalMap }> {
  constructor(globals: SandboxGlobalMap) {
    super(OPENAI_GLOBALS_EVENT, { detail: { globals } });
    (this as { type: string }).type = OPENAI_GLOBALS_EVENT;
  }
}
