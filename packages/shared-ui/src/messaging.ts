// Fractal UI Event Payloads (outbound from component)
export type FractalNavigationEvent = {
  type: "navigate";
  data: { 
    name: string; 
    params: Record<string, unknown>
  };
};

export type FractalActionEvent = {
  type: "action";
  data: { 
    name: string; 
    params: Record<string, unknown>
  };
};
export type FractalDataEvent = {
  type: "data";
  data: {
    name: string;
    params: Record<string, unknown>
  };
};

export type FractalResizeEvent = {
  type: "resize";
  data: {
    name: string;
    params: {
      width: number;
      height: number;
    };
  };
};

// Fractal Control Event Payloads (inbound to component)
export type FractalQueryDomEvent = {
  type: "queryDom";
  data: { 
    name: string; 
    params: Record<string, unknown>
  };
};

export type FractalClickEvent = {
  type: "click";
  data: { 
    name: string; 
    params: Record<string, unknown>
  };
};

export type FractalEnterTextEvent = {
  type: "enterText";
  data: { 
    name: string; 
    params: Record<string, unknown>
  };
};

// Union types
export type FractalUIEvent =
  | FractalNavigationEvent
  | FractalActionEvent
  | FractalDataEvent
  | FractalResizeEvent;
export type FractalControlEvent = FractalQueryDomEvent | FractalClickEvent | FractalEnterTextEvent;
export type FractalAnyEvent = FractalUIEvent | FractalControlEvent

// Type helpers for type-safe messaging
export type FractalEventType = FractalAnyEvent['type'];

export type FractalEventData<T extends FractalEventType> =
  T extends 'navigate' ? FractalNavigationEvent['data'] :
  T extends 'action' ? FractalActionEvent['data'] :
  T extends 'data' ? FractalDataEvent['data'] :
  T extends 'resize' ? FractalResizeEvent['data'] :
  T extends 'queryDom' ? FractalQueryDomEvent['data'] :
  T extends 'click' ? FractalClickEvent['data'] :
  T extends 'enterText' ? FractalEnterTextEvent['data'] :
  never;

export type FractalEventByType<T extends FractalEventType> = Extract<FractalAnyEvent, { type: T }>;

/************************************
 * Connector Message Types
 ************************************/
interface FractalConnectorReplySuccessMessage<TResponse = unknown> {
  kind: 'success';
  id: string;
  payload: TResponse
}

interface FractalConnectorReplyErrorMessage {
  kind: 'error';
  id: string;
  error: string;
}

interface FractalConnectorEventMessage<TRequest = unknown> {
  kind: 'event';
  id: string;
  // cmd: string;
  payload: TRequest
}

interface FractalConnectorRequestMessage<TRequest = unknown> {
  kind: 'request';
  id: string;
  // cmd: string;
  payload: TRequest;
}

type FractalConnectorMessage<TRequest = FractalAnyEvent, TResponse = unknown> = 
  FractalConnectorRequestMessage<TRequest> | 
  FractalConnectorReplySuccessMessage<TResponse> | 
  FractalConnectorReplyErrorMessage | 
  FractalConnectorEventMessage<TRequest>;


export class Messaging {
    private port: MessagePort;
    private handlers: Map<FractalEventType, (event: FractalAnyEvent) => Promise<unknown> | void> = new Map();
    private pendingRequests: Map<string, {resolve: (value: unknown) => void, reject: (error: Error) => void, timeout?: NodeJS.Timeout}> = new Map();
    private anyRequestHandler?: (type: string, payload: unknown) => Promise<unknown> | unknown;
    constructor(args: {
        port: MessagePort,
    }) {
      this.port = args.port;
      this.setupListeners();
    }

    setupListeners() {
        this.port.onmessage = async ({ data }) => {
            const msg = data as FractalConnectorMessage || {};
            if (msg.kind === 'request') {
                const payload = msg.payload as FractalAnyEvent;
                const handler = this.handlers.get(payload.type);
                if (handler) {
                    try {
                        const resp = await handler(payload);
                        this.port.postMessage({ id: msg.id, kind: 'success', payload: resp });
                    } catch (error) {
                        const err = error as Error;
                        this.port.postMessage({ id: msg.id, kind: 'error', error: err.message });
                    }
                } else {
                    console.error('[messaging] Command not found', payload.type);
                    this.port.postMessage({ id: msg.id, kind: 'error', error: 'Command not found' });
                }
            } else if (msg.kind == "event") {
                const payload = msg.payload as FractalAnyEvent;
                const handler = this.handlers.get(payload.type);
                if (handler) {
                    handler(payload);
                } else {
                    console.warn('[messaging] Event not handled', payload.type);
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
    request<T extends FractalEventType>(messageType: T, data: FractalEventData<T>): Promise<unknown> {
        const id = crypto.randomUUID();
        console.log("messaging is sending request", id)
        this.port.postMessage({ 
          kind: 'request', 
          id,
          payload: {type : messageType, data} 
        });
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
        });
    }

    // Sends an event to the consumer, does not expect a response back
    emit<T extends FractalEventType>(messageType: T, data: FractalEventData<T>): void {
      this.port.postMessage({ 
        kind: 'event', 
        id: crypto.randomUUID(), 
        payload: {type: messageType, data}
      });
    }

    on<T extends FractalEventType>(messageType: T, handler: (event: FractalEventByType<T>) => Promise<unknown> | void): void {
      this.handlers.set(messageType, handler as (event: FractalAnyEvent) => Promise<unknown> | void);
    }

  }