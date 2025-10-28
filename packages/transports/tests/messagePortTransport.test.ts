import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import {
  createHelloMcpServer,
  testHelloMcpServerBasicOperations
} from "@fractal-mcp/test-utils-mcp";
import { MessagePortRpcTransport } from "../src/messagePortTransport.js";

type MessageHandler = (event: FakeMessageEvent) => void;

type FakeMessageEvent = {
  data: unknown;
};

type MessageEventType = "message" | "messageerror";

class FakeMessagePort {
  #listeners: Record<MessageEventType, Set<MessageHandler>> = {
    message: new Set(),
    messageerror: new Set()
  };
  #peer?: FakeMessagePort;
  #closed = false;
  onmessage: MessageHandler | null = null;
  onmessageerror: MessageHandler | null = null;

  setPeer(peer: FakeMessagePort): void {
    this.#peer = peer;
  }

  start(): void {
    // No-op for compatibility with real MessagePort behavior
  }

  close(): void {
    this.#closed = true;
  }

  addEventListener(type: MessageEventType, listener: MessageHandler): void {
    this.#listeners[type].add(listener);
  }

  removeEventListener(type: MessageEventType, listener: MessageHandler): void {
    this.#listeners[type].delete(listener);
  }

  postMessage(data: unknown): void {
    if (this.#closed) {
      throw new Error("Cannot postMessage on a closed port");
    }
    if (!this.#peer) {
      throw new Error("Cannot postMessage without a peer");
    }
    queueMicrotask(() => {
      const peer = this.#peer;
      if (peer) {
        peer.#dispatch("message", { data });
      }
    });
  }

  #dispatch(type: MessageEventType, event: FakeMessageEvent): void {
    if (this.#closed) {
      return;
    }
    const listeners = this.#listeners[type];
    for (const listener of listeners) {
      listener(event);
    }
    if (type === "message" && this.onmessage) {
      this.onmessage(event);
    }
    if (type === "messageerror" && this.onmessageerror) {
      this.onmessageerror(event);
    }
  }
}

class FakeMessageChannel {
  readonly port1: FakeMessagePort;
  readonly port2: FakeMessagePort;

  constructor() {
    this.port1 = new FakeMessagePort();
    this.port2 = new FakeMessagePort();
    this.port1.setPeer(this.port2);
    this.port2.setPeer(this.port1);
  }
}

describe("MessagePortRpcTransport", () => {
  it("supports basic hello server operations over a MessageChannel", async () => {
    const channel = new FakeMessageChannel();
    const server = createHelloMcpServer();
    const serverTransport = new MessagePortRpcTransport({ port: channel.port1 });
    await server.connect(serverTransport);

    const clientTransport = new MessagePortRpcTransport({ port: channel.port2 });
    const client = new Client({
      name: "MessagePortTransportTestClient",
      version: "0.1.0"
    });
    await client.connect(clientTransport);

    try {
      await testHelloMcpServerBasicOperations(client);
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });
});
