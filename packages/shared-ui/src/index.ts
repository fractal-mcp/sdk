export type Message = {
    type: string;
    messageId?: string;
    payload?: Record<string, unknown>;
};

type RpcClientOptions = {
    dstWindow: Window;
    targetOrigin?: string; // default "*"
};

export class RpcRequest extends EventTarget {
    private id: string;
    private receivedPromise: Promise<void>;
    private receivedResolve!: () => void;
    private responsePromise: Promise<Record<string, unknown>>;
    private responseResolve!: (value: any) => void;
    private responseReject!: (err: any) => void;

    constructor(id: string) {
        super();
        this.id = id;

        this.receivedPromise = new Promise((resolve) => {
            this.receivedResolve = resolve;
        });

        this.responsePromise = new Promise((resolve, reject) => {
            this.responseResolve = resolve;
            this.responseReject = reject;
        });
    }

    get messageId() {
        return this.id;
    }

    /** wait until host acknowledged request */
    async received(): Promise<void> {
        return this.receivedPromise;
    }

    /** wait until host responded, returns payload or throws */
    async response(): Promise<Record<string, unknown>> {
        return this.responsePromise;
    }

    _onReceived() {
        this.dispatchEvent(new CustomEvent('ui-message-received'));
        this.receivedResolve();
    }

    _onResponse(payload: { response?: Record<string, unknown>; error?: unknown }) {
        if (payload.error) {
            this.dispatchEvent(new CustomEvent('ui-message-response', { detail: { error: payload.error } }));
            this.responseReject(new Error(String(payload.error)));
        } else {
            this.dispatchEvent(new CustomEvent('ui-message-response', { detail: { response: payload.response } }));
            this.responseResolve(payload.response);
        }
    }
}

export class RpcClient {
    private dstWindow: Window;
    private targetOrigin: string;
    private correlationMap: Map<string, RpcRequest>;

    constructor(opts: RpcClientOptions) {
        this.dstWindow = opts.dstWindow;
        this.targetOrigin = opts.targetOrigin ?? '*';
        this.correlationMap = new Map();

        window.addEventListener('message', (event) => {
            const msg: Message = event.data;
            if (!msg?.type || !msg.messageId) return;

            const req = this.correlationMap.get(msg.messageId);
            if (!req) return;

            if (msg.type === 'ui-message-received') {
                req._onReceived();
            } else if (msg.type === 'ui-message-response') {
                req._onResponse(msg.payload ?? {});
                this.correlationMap.delete(msg.messageId);
            }
        });
    }

    /** send fire-and-forget message */
    emit(type: string, payload: Record<string, unknown> = {}): void {
        const msg: Message = { type, payload };
        this.dstWindow.postMessage(msg, this.targetOrigin);
    }

    /** send a request with messageId and return a Request object */
    request(type: string, payload: Record<string, unknown> = {}): RpcRequest {
        const messageId = crypto.randomUUID();
        const req = new RpcRequest(messageId);
        this.correlationMap.set(messageId, req);

        const msg: Message = { type, messageId, payload };
        this.dstWindow.postMessage(msg, this.targetOrigin);

        return req;
    }
}
