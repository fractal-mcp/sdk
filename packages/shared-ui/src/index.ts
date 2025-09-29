import { MessageEnvelope, GenericMessageData } from '@fractal-mcp/protocol';

const LOG_ENABLE = false;
function log(...args: unknown[]) {
  if (LOG_ENABLE) {
    console.log(`[Fractal UI Shared]`, ...args);
  }
}

export interface IMessagingClient {
  request(msg: GenericMessageData): Promise<unknown>;
  emit(msg: GenericMessageData): void;
  on(messageType: string, handler: (payload: unknown) => Promise<unknown> | void): void;
}

  export class MessagingClient implements IMessagingClient {
      private port: MessagePort;
      private handlers: Map<string, (event: unknown) => Promise<unknown> | void> = new Map();
      private pendingRequests: Map<string, {resolve: (value: unknown) => void, reject: (error: Error) => void, timeout?: NodeJS.Timeout}> = new Map();
      
      constructor(args: {
          port: MessagePort,
      }) {
        this.port = args.port;
        this.setupListeners();
      }
  
      postMessage(msg: MessageEnvelope<GenericMessageData>) {
        this.port.postMessage(msg);
      }

      setupListeners() {
          this.port.onmessage = async ({ data }) => {
              const msg = data as MessageEnvelope<GenericMessageData> || {}
              if (msg.kind === 'request') {
                  const handler = this.handlers.get(msg.type);
                  if (handler) {
                      try {
                          const resp = await handler(msg.payload);
                          this.postMessage({ id: msg.id, kind: 'success', type: "", payload: resp });
                      } catch (error) {
                          const err = error as Error;
                          this.postMessage({ id: msg.id, kind: 'error', error: err.message });
                      }
                  } else {
                      console.error('[messaging] Command not found', msg.type);
                      this.postMessage({ id: msg.id, kind: 'error', error: 'Command not found' });
                  }
              } else if (msg.kind == "event") {
                  const handler = this.handlers.get(msg.type);
                  if (handler) {
                      handler(msg.payload);
                  } else {
                      console.warn('[messaging] Event not handled', msg.type);
                  }
              } else if (msg.kind == "success") {
                const pending = this.pendingRequests.get(msg.id);
                if (pending) {
                  if (pending.timeout) clearTimeout(pending.timeout);
                  this.pendingRequests.delete(msg.id);
                  pending.resolve(msg.payload);
                }
              } else if (msg.kind == "error") {
                const pending = this.pendingRequests.get(msg.id);
                if (pending) {
                  if (pending.timeout) clearTimeout(pending.timeout);
                  this.pendingRequests.delete(msg.id);
                  pending.reject(new Error(msg.error));
                }
              }
          };
      }
  
      // Sends a request and expects a response back
      request(msg: GenericMessageData): Promise<unknown> {
          const { type: messageType, payload } = msg;
          const id = crypto.randomUUID();
          this.postMessage({
            kind: 'request', 
            id,
            type: messageType,
            payload,
          });
          return new Promise((resolve, reject) => {
              this.pendingRequests.set(id, { resolve, reject });
          }).then((res) => {
            log('request() resolved', res);
            return res;
          }).catch((err) => {
            log('request() rejected', err);
            throw err;
          });
      }
  
      // Sends an event to the consumer, does not expect a response back
      emit(msg: GenericMessageData): void {
        const { type: messageType, payload } = msg;
        this.postMessage({ 
          kind: 'event', 
          id: crypto.randomUUID(), 
          type: messageType,
          payload,
        });
      }
  
      on(messageType: string, handler: (payload: unknown) => Promise<unknown> | void): void {
        log('called on()', messageType);
        this.handlers.set(messageType, handler);
      }
  
  }