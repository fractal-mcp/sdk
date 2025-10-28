import type { JSONRPCMessage, MessageExtraInfo } from "@modelcontextprotocol/sdk/types.js";
import type { Transport, TransportSendOptions } from "@modelcontextprotocol/sdk/shared/transport.js";

type MessageEventType = "message" | "messageerror";

type MessagePortEvent = {
  data: unknown;
};

type MessagePortListener = (event: MessagePortEvent) => void;

export interface MessagePortLike {
  start?: () => void;
  close: () => void;
  postMessage: (message: unknown, transfer?: unknown[]) => void;
  addEventListener: (type: MessageEventType, listener: MessagePortListener) => void;
  removeEventListener: (type: MessageEventType, listener: MessagePortListener) => void;
}

export interface MessagePortRpcTransportOptions {
  port: MessagePortLike;
  /**
   * Controls whether the transport should automatically call `start()` on the
   * provided port during initialization. This mirrors the behavior of real
   * MessagePorts in the browser, where `start()` begins message dispatch.
   *
   * Defaults to `true`.
   */
  autoStart?: boolean;
}

/**
 * A Transport implementation that bridges JSON-RPC messages across a
 * {@link MessagePort} pair. This is primarily intended for browser use where
 * clients and servers may communicate across different execution contexts such
 * as iframes, Web Workers, or other MessageChannel endpoints.
 */
export class MessagePortRpcTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  sessionId?: string;
  setProtocolVersion?: (version: string) => void;

  readonly #port: MessagePortLike;
  readonly #autoStart: boolean;
  #started = false;
  #closed = false;

  constructor(options: MessagePortRpcTransportOptions) {
    this.#port = options.port;
    this.#autoStart = options.autoStart ?? true;
  }

  async start(): Promise<void> {
    if (this.#closed) {
      throw new Error("Cannot start a transport that has been closed");
    }
    if (this.#started) {
      return;
    }
    this.#started = true;
    this.#port.addEventListener("message", this.#handleMessage);
    this.#port.addEventListener("messageerror", this.#handleMessageError);
    if (this.#autoStart && typeof this.#port.start === "function") {
      this.#port.start();
    }
  }

  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    if (this.#closed) {
      throw new Error("Cannot send over a closed transport");
    }
    if (!this.#started) {
      await this.start();
    }
    this.#port.postMessage(message);
  }

  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    if (this.#started) {
      this.#port.removeEventListener("message", this.#handleMessage);
      this.#port.removeEventListener("messageerror", this.#handleMessageError);
    }
    this.#port.close();
    if (this.onclose) {
      this.onclose();
    }
  }

  readonly #handleMessage: MessagePortListener = (event) => {
    if (this.#closed) {
      return;
    }
    try {
      this.onmessage?.(event.data as JSONRPCMessage);
    } catch (error) {
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  readonly #handleMessageError: MessagePortListener = (event) => {
    if (this.#closed) {
      return;
    }
    const detail = event?.data;
    const error =
      detail instanceof Error
        ? detail
        : new Error(typeof detail === "string" ? detail : "MessagePort transport encountered an error event");
    this.onerror?.(error);
  };
}
