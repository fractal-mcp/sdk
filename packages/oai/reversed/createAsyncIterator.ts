/**
 * Restores the semantics of `create-async-iterator-ggfG9U7o.js`.
 *
 * The original helper converted push-based callbacks into an async iterator
 * interface that can be consumed with `for await (...)`. The implementation
 * below keeps the same control flow without the minified variable names.
 *
 * Minified identifier map:
 *   - `c` → `createAsyncIterator`
 *   - `s` → `producer`
 *   - `t` → `isCompleted`
 *   - `n` → `pendingResolvers`
 *   - `o` → `queuedResults`
 *   - `r` → `deliver`
 *   - `f` → controller `push`
 *   - `u` → controller `complete`
 *   - `i` → controller `error`
 */

export interface AsyncIteratorController<T> {
  push(value: T): void;
  complete(): void;
  error(reason: unknown): void;
}

export type AsyncIteratorProducer<T> = (controller: AsyncIteratorController<T>) => void;

export function createAsyncIterator<T>(producer: AsyncIteratorProducer<T>): AsyncIterableIterator<T> {
  let isCompleted = false;
  const pendingResolvers: Array<(result: IteratorResult<T>) => void> = [];
  const queuedResults: IteratorResult<T>[] = [];

  const doneResult: IteratorResult<T> = { value: undefined as unknown as T, done: true };

  const deliver = (result: IteratorResult<T>): void => {
    if (pendingResolvers.length > 0) {
      const resolve = pendingResolvers.shift()!;
      resolve(result);
    } else {
      queuedResults.push(result);
    }
  };

  const controller: AsyncIteratorController<T> = {
    push(value) {
      if (isCompleted) return;
      deliver({ value, done: false });
    },
    complete() {
      if (isCompleted) return;
      isCompleted = true;
      while (pendingResolvers.length > 0) {
        const resolve = pendingResolvers.shift()!;
        resolve(doneResult);
      }
    },
    error(reason) {
      if (isCompleted) return;
      deliver(Promise.reject(reason) as unknown as IteratorResult<T>);
      controller.complete();
    },
  };

  try {
    producer(controller);
  } catch (error) {
    controller.error(error);
  }

  return {
    next(): Promise<IteratorResult<T>> {
      return new Promise((resolve) => {
        if (queuedResults.length > 0) {
          resolve(queuedResults.shift()!);
          return;
        }

        if (isCompleted) {
          resolve(doneResult);
          return;
        }

        pendingResolvers.push(resolve);
      });
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
