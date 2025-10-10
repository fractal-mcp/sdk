const CALL_MESSAGE = "CALL" as const;
const RESOLVE_MESSAGE = "RESOLVE" as const;
const REJECT_MESSAGE = "REJECT" as const;
const ABORT_MESSAGE = "ABORT" as const;
const GENERATOR_MESSAGE = "GENERATOR_GENERATE" as const;

/**
 * Minified identifier map from `main-xonCUAoo.js`:
 *   - `D` → `createRpcEndpoint`
 *   - `xt` → `createGeneratorRpcEndpoint`
 *   - `Bt`/`bt`/`Dt`/`It` → `CALL_MESSAGE`/`RESOLVE_MESSAGE`/`REJECT_MESSAGE`/`ABORT_MESSAGE`
 *   - `vt` → `GENERATOR_MESSAGE`
 */

export interface RpcCallOptions {
  /** Abort signal forwarded to the remote handler. */
  signal?: AbortSignal;
  /** Additional transferable objects to forward alongside the call. */
  transfer?: Transferable[];
}

export type RpcHandler<Arguments extends unknown[], Result> = (
  this: { signal: AbortSignal },
  ...args: Arguments
) => Result | Promise<Result>;

export interface RpcCaller<Arguments extends unknown[], Result> {
  (...args: Arguments): Promise<Result>;
  withOptions(options: RpcCallOptions): RpcCaller<Arguments, Result>;
}

type RpcEnvelope =
  | [typeof CALL_MESSAGE, ...unknown[]]
  | [typeof RESOLVE_MESSAGE, unknown]
  | [typeof REJECT_MESSAGE, unknown]
  | [typeof ABORT_MESSAGE];

function isCallEnvelope(value: RpcEnvelope): value is [typeof CALL_MESSAGE, ...unknown[]] {
  return Array.isArray(value) && value[0] === CALL_MESSAGE;
}

function isAbortEnvelope(value: RpcEnvelope): value is [typeof ABORT_MESSAGE] {
  return Array.isArray(value) && value[0] === ABORT_MESSAGE;
}

/**
 * Best-effort structured clone used when `postMessage` raises `DataCloneError`.
 * Mirrors the `Ot` helper from the minified bundle.
 */
function cloneForTransport<T>(value: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
  const structuredCloneFn: typeof structuredClone | undefined =
    typeof structuredClone === "function" ? structuredClone : undefined;

  if (structuredCloneFn) {
    try {
      // Browsers that support `structuredClone` will bail out early.
      return structuredCloneFn(value);
    } catch {
      // Fall back to manual cloning below.
    }
  }

  try {
    if (value === null) return value;
    if (typeof value !== "object") {
      if (typeof value === "symbol" || typeof value === "function" || typeof value === "undefined") {
        return String(value) as unknown as T;
      }
      return value;
    }

    if (seen.has(value as object)) {
      return seen.get(value as object) as T;
    }

    if (value instanceof Date) {
      return new Date(value.getTime()) as unknown as T;
    }

    if (value instanceof RegExp) {
      const clone = new RegExp(value.source, value.flags);
      clone.lastIndex = value.lastIndex;
      return clone as unknown as T;
    }

    if (value instanceof ArrayBuffer) {
      return value.slice(0) as unknown as T;
    }

    if (value instanceof DataView) {
      const buffer = cloneForTransport(value.buffer, seen);
      try {
        return new DataView(buffer as ArrayBufferLike, value.byteOffset, value.byteLength) as unknown as T;
      } catch {
        return String(value) as unknown as T;
      }
    }

    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
      try {
        if (typeof (value as typeof value & { slice?: () => unknown }).slice === "function") {
          return (value as typeof value & { slice(): T }).slice();
        }
        const TypedArray = (value as { constructor: new (length: number) => typeof value }).constructor;
        const clone = new TypedArray((value as { length: number }).length);
        clone.set(value as unknown as ArrayLike<number>);
        return clone as unknown as T;
      } catch {
        return String(value) as unknown as T;
      }
    }

    if (value instanceof Map) {
      const clone = new Map();
      seen.set(value, clone);
      for (const [key, entry] of value.entries()) {
        clone.set(cloneForTransport(key, seen), cloneForTransport(entry, seen));
      }
      return clone as unknown as T;
    }

    if (value instanceof Set) {
      const clone = new Set();
      seen.set(value, clone);
      for (const entry of value.values()) {
        clone.add(cloneForTransport(entry, seen));
      }
      return clone as unknown as T;
    }

    if (typeof Blob !== "undefined" && value instanceof Blob) {
      try {
        if (typeof File !== "undefined" && value instanceof File) {
          return new File([value], value.name, {
            type: value.type,
            lastModified: value.lastModified,
          }) as unknown as T;
        }
        return new Blob([value], { type: value.type }) as unknown as T;
      } catch {
        return String(value) as unknown as T;
      }
    }

    if (typeof URL !== "undefined" && value instanceof URL) {
      try {
        return new URL(value.toString()) as unknown as T;
      } catch {
        return String(value) as unknown as T;
      }
    }

    if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
      try {
        return new URLSearchParams(value.toString()) as unknown as T;
      } catch {
        return String(value) as unknown as T;
      }
    }

    if (value instanceof Error) {
      const source = value as Error & Record<string, unknown>;
      let clone: Error;
      try {
        const Ctor = (source as { constructor?: new (message?: string) => Error }).constructor;
        clone = typeof Ctor === "function" ? new Ctor(source.message) : new Error(source.message);
      } catch {
        clone = new Error(source.message);
      }
      clone.name = source.name;
      if (typeof source.stack === "string") {
        clone.stack = source.stack;
      }
      if ("cause" in source) {
        try {
          (clone as { cause?: unknown }).cause = cloneForTransport(source.cause, seen);
        } catch {
          (clone as { cause?: unknown }).cause = String(source.cause);
        }
      }
      for (const key of Object.keys(source)) {
        try {
          (clone as Record<string, unknown>)[key] = cloneForTransport(source[key], seen);
        } catch {
          (clone as Record<string, unknown>)[key] = String(source[key]);
        }
      }
      return clone as unknown as T;
    }

    if (typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer) {
      return String(value) as unknown as T;
    }
    if (typeof WeakMap !== "undefined" && value instanceof WeakMap) {
      return String(value) as unknown as T;
    }
    if (typeof WeakSet !== "undefined" && value instanceof WeakSet) {
      return String(value) as unknown as T;
    }

    if (Array.isArray(value)) {
      const clone: unknown[] = new Array(value.length);
      seen.set(value, clone);
      for (let index = 0; index < value.length; index += 1) {
        if (index in value) {
          clone[index] = cloneForTransport(value[index], seen);
        }
      }
      return clone as unknown as T;
    }

    const clone: Record<string, unknown> = {};
    seen.set(value, clone);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      let property: unknown;
      try {
        property = (value as Record<string, unknown>)[key];
      } catch (error) {
        property = String(error);
      }
      clone[key] = cloneForTransport(property, seen);
    }
    return clone as unknown as T;
  }
}

function makeCaller<Arguments extends unknown[], Result>(
  port: MessagePort,
  options: RpcCallOptions,
): RpcCaller<Arguments, Result> {
  const call: RpcCaller<Arguments, Result> = (...args) =>
    new Promise<Result>((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      port1.start();

      const dispose = () => {
        port1.close();
        options.signal?.removeEventListener("abort", abortListener);
      };

      const abortListener = () => {
        try {
          port1.postMessage([ABORT_MESSAGE]);
        } finally {
          dispose();
        }
        reject(new Error("Aborted."));
      };

      port1.addEventListener("message", (event: MessageEvent<RpcEnvelope>) => {
        const [tag, payload] = event.data;
        if (tag === RESOLVE_MESSAGE) {
          dispose();
          resolve(payload as Result);
        } else if (tag === REJECT_MESSAGE) {
          dispose();
          reject(payload);
        }
      });

      if (options.signal) {
        if (options.signal.aborted) {
          abortListener();
          return;
        }
        options.signal.addEventListener("abort", abortListener, { once: true });
      }

      const transfer = options.transfer ?? [];
      port.postMessage([CALL_MESSAGE, ...args], [port2, ...transfer]);
    });

  call.withOptions = (callOptions) => makeCaller(port, callOptions);
  return call;
}

export function createRpcEndpoint<Arguments extends unknown[], Result>(
  port: MessagePort,
  handler?: RpcHandler<Arguments, Result>,
): RpcCaller<Arguments, Result> {
  const listener = async (event: MessageEvent<RpcEnvelope>) => {
    if (!isCallEnvelope(event.data)) return;
    event.stopImmediatePropagation();

    const [responsePort] = event.ports;
    if (!responsePort) {
      throw new Error("RPCCallMessage must contain a response port.");
    }

    responsePort.start();

    if (!handler) {
      responsePort.postMessage([
        REJECT_MESSAGE,
        new Error("No function registered for this RPC endpoint."),
      ]);
      responsePort.close();
      return;
    }

    const abortController = new AbortController();
    responsePort.addEventListener(
      "message",
      (messageEvent: MessageEvent<RpcEnvelope>) => {
        if (isAbortEnvelope(messageEvent.data)) {
          abortController.abort();
        }
      },
      { once: true },
    );

    try {
      const result = await handler.call({ signal: abortController.signal }, ...(event.data.slice(1) as Arguments));
      try {
        responsePort.postMessage([RESOLVE_MESSAGE, result]);
      } catch (error) {
        if (error instanceof Error && error.name === "DataCloneError") {
          const clonedArgs = cloneForTransport(event.data.slice(1)) as Arguments;
          const clonedResult = await handler.call({ signal: abortController.signal }, ...clonedArgs);
          responsePort.postMessage([RESOLVE_MESSAGE, cloneForTransport(clonedResult)]);
        } else {
          throw error;
        }
      }
    } catch (error) {
      try {
        responsePort.postMessage([REJECT_MESSAGE, cloneForTransport(error)]);
      } catch (cloneError) {
        responsePort.postMessage([
          REJECT_MESSAGE,
          cloneError instanceof Error ? cloneError : new Error(String(cloneError)),
        ]);
      }
    } finally {
      responsePort.close();
    }
  };

  port.addEventListener("message", listener as EventListener);
  port.start();

  return makeCaller<Arguments, Result>(port, {});
}

export function createGeneratorRpcEndpoint<
  Arguments extends unknown[],
  Yield,
  Return,
  Next,
>(
  port: MessagePort,
  handler?: (...args: Arguments) => AsyncGenerator<Yield, Return, Next>,
): ((...args: Arguments) => AsyncGenerator<Yield, Return, Next>) & {
  withOptions(options: RpcCallOptions): (...args: Arguments) => AsyncGenerator<Yield, Return, Next>;
} {
  port.addEventListener(
    "message",
    (event: MessageEvent<unknown>) => {
      const payload = event.data;
      if (!Array.isArray(payload) || payload[0] !== GENERATOR_MESSAGE) return;
      event.stopImmediatePropagation();

      if (!handler) {
        throw new Error("No function registered for generator RPC endpoint.");
      }

      const [, ports, ...args] = payload as [typeof GENERATOR_MESSAGE, Record<string, MessagePort>, ...Arguments];
      const iterator = handler(...(args as Arguments));

      createRpcEndpoint(ports.next, iterator.next.bind(iterator));
      createRpcEndpoint(ports.return, async (value: Next) => {
        const finaliser = iterator.return?.bind(iterator);
        return finaliser ? finaliser(value) : { done: true, value: undefined };
      });
      createRpcEndpoint(ports.throw, async (value: unknown) => {
        const thrower = iterator.throw?.bind(iterator);
        if (!thrower) throw value;
        return thrower(value);
      });

      const asyncDispose = Symbol.asyncDispose ?? Symbol.for("Symbol.asyncDispose");
      const syncDispose = Symbol.dispose ?? Symbol.for("Symbol.dispose");
      createRpcEndpoint(ports.asyncDispose, async () => {
        if (asyncDispose in iterator) {
          await (iterator as Record<PropertyKey, () => Promise<void>>)[asyncDispose]?.();
        } else if (syncDispose in iterator) {
          (iterator as Record<PropertyKey, () => void>)[syncDispose]?.();
        }
      });
    },
  );
  port.start();

  const factory = (options: RpcCallOptions) => {
    const caller = (...args: Arguments): AsyncGenerator<Yield, Return, Next> => {
      const nextChannel = new MessageChannel();
      const returnChannel = new MessageChannel();
      const throwChannel = new MessageChannel();
      const disposeChannel = new MessageChannel();

      let closed = false;
      let aborted = false;

      const close = () => {
        if (closed) return;
        closed = true;
        nextChannel.port1.close();
        nextChannel.port2.close();
        returnChannel.port1.close();
        returnChannel.port2.close();
        throwChannel.port1.close();
        throwChannel.port2.close();
        disposeChannel.port1.close();
        disposeChannel.port2.close();
      };

      const ensureActive = () => {
        if (aborted) {
          throw new Error("This generator has been aborted.");
        }
        if (closed) {
          throw new Error("This generator has been disposed.");
        }
      };

      const baseOptions: RpcCallOptions = { signal: options.signal };
      const next = createRpcEndpoint<[Next], IteratorResult<Yield, Return>>(nextChannel.port1).withOptions(baseOptions);
      const complete = createRpcEndpoint<[Return], IteratorResult<Yield, Return>>(returnChannel.port1).withOptions(baseOptions);
      const raise = createRpcEndpoint<[unknown], IteratorResult<Yield, Return>>(throwChannel.port1).withOptions(baseOptions);
      const dispose = createRpcEndpoint<[], void>(disposeChannel.port1).withOptions(baseOptions);

      const step = async <K extends "next" | "return" | "throw">(
        rpc: RpcCaller<[unknown], IteratorResult<Yield, Return>>,
        value: unknown,
      ) => {
        ensureActive();
        const result = await rpc(value);
        if (result?.done) {
          close();
        }
        return result;
      };

      const iterator: AsyncGenerator<Yield, Return, Next> = {
        next(value?: Next) {
          return step(next as unknown as RpcCaller<[unknown], IteratorResult<Yield, Return>>, value);
        },
        return(value?: Return) {
          return step(complete as unknown as RpcCaller<[unknown], IteratorResult<Yield, Return>>, value);
        },
        throw(value?: unknown) {
          return step(raise as unknown as RpcCaller<[unknown], IteratorResult<Yield, Return>>, value);
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };

      const asyncDispose = Symbol.asyncDispose ?? Symbol.for("Symbol.asyncDispose");
      (iterator as Record<PropertyKey, unknown>)[asyncDispose] = async () => {
        ensureActive();
        await dispose();
        close();
      };

      if (options.signal) {
        const abortListener = () => {
          aborted = true;
          close();
        };
        if (options.signal.aborted) {
          abortListener();
        } else {
          options.signal.addEventListener("abort", abortListener, { once: true });
        }
      }

      port.postMessage(
        [
          GENERATOR_MESSAGE,
          {
            asyncDispose: disposeChannel.port2,
            next: nextChannel.port2,
            return: returnChannel.port2,
            throw: throwChannel.port2,
          },
          ...args,
        ],
        [
          ...(options.transfer ?? []),
          disposeChannel.port2,
          nextChannel.port2,
          returnChannel.port2,
          throwChannel.port2,
        ],
      );

      return iterator;
    };

    (caller as { withOptions: typeof factory }).withOptions = factory;
    return caller;
  };

  const baseCaller = factory({});
  (baseCaller as { withOptions: typeof factory }).withOptions = factory;
  return baseCaller as typeof baseCaller & { withOptions: typeof factory };
}
