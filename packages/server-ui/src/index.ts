// uiMessenger.ts
import { RpcClient, RpcRequest } from "@fractal-mcp/shared-ui";

type RenderData = Record<string, unknown>;

type RequestPayload = IntentPayload | NotifyPayload | PromptPayload | ToolPayload | LinkPayload | RequestDataPayload;
// ---- Message Payload Types ----
export interface IntentPayload {
	intent: string;
	params?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface NotifyPayload {
	message: string;
	[key: string]: unknown;
}

export interface PromptPayload {
	prompt: string;
	[key: string]: unknown;
}

export interface ToolPayload {
	toolName: string;
	params?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface LinkPayload {
	url: string;
	[key: string]: unknown;
}

export interface RequestDataPayload {
	requestType: string;
	params?: Record<string, unknown>;
	[key: string]: unknown;
}

export class UIMessenger {
	private _rpcClient: RpcClient;
	private _renderData: RenderData | null = null;
	private _stopResize?: () => void;

	/**
	 * Static async initialization method.
	 * Checks for waitForRenderData query parameter and blocks until render data is received if needed.
	 */
	static async init(args: { 
		rootElId?: string, 
		forceWaitForRenderData?: boolean
	}): Promise<UIMessenger> {
		const { rootElId = undefined, forceWaitForRenderData = false } = args;
		console.log(`[UIMessenger] init`);
		const urlParams = new URLSearchParams(window.location.search);
		const shouldWaitForRenderData = (urlParams.get("waitForRenderData") === "true") || forceWaitForRenderData;

		let initialRenderData: RenderData | null = null;

		if (shouldWaitForRenderData) {
			console.log(`[UIMessenger] shouldWaitForRenderData: ${shouldWaitForRenderData}`);
			// Set up listener before sending ready event
			const renderDataPromise = new Promise<RenderData>((resolve) => {
				const handler = (event: MessageEvent) => {
					console.log(`[UIMessenger] handler: ${JSON.stringify(event.data)}`);
					if (event.data?.type === "ui-lifecycle-iframe-render-data") {
						console.log(`[UIMessenger] ui-lifecycle-iframe-render-data: ${JSON.stringify(event.data)}`);
						window.removeEventListener("message", handler);
						resolve(event.data.payload?.renderData ?? {});
					}
				};
				window.addEventListener("message", handler);
			});

			// Send ready event
			window.parent.postMessage({ type: "ui-lifecycle-iframe-ready" }, "*");

			// Wait for render data
			initialRenderData = await renderDataPromise;
		} else {
			// Still send ready event so parent knows to send render data,
			// but don't block waiting for it
			window.parent.postMessage({ type: "ui-lifecycle-iframe-ready" }, "*");
		}

		console.log(`[UIMessenger] initialRenderData: ${JSON.stringify(initialRenderData)}`);
		const messenger = new UIMessenger(rootElId || "root", {
			initialRenderData,
		});

		return messenger;
	}

	constructor(
		rootElId?: string,
		options?: { initialRenderData?: RenderData | null }
	) {

		this._rpcClient = new RpcClient({ dstWindow: window.parent });

		// Set initial render data if provided
		if (options?.initialRenderData) {
			this._renderData = options.initialRenderData;
		}

		// setup resize observer (your pattern)
		this._stopResize = this.setupResizeObserver(rootElId || "root");

		// keep cached render data up to date
		this.onMessage("ui-lifecycle-iframe-render-data", (msg: any) => {
			this._renderData = (msg?.payload?.renderData ?? {}) as RenderData;
		});
	}

	/** Stop observing size changes */
	stopResizeObserver(): void {
		this._stopResize?.();
	}

	/** Dispose listeners/resources this class set up */
	destroy(): void {
		this.stopResizeObserver();
		// (No global listeners retained directly; onMessage handlers use returned disposers inline.)
	}

	/** Sets up a resize observer on provided element (or #root or documentElement) */
	private setupResizeObserver(rootElId?: string): () => void {
	console.log(`[UIMessenger] setupResizeObserver: ${rootElId}`);

		const el = rootElId 
		? (document.getElementById(rootElId) as HTMLElement | null) 
		: document.documentElement;

		if (!el) {
		throw new Error(`Root element with id ${rootElId} not found`);
		}
		console.log(`[UIMessenger] el: ${el}`);

		let lastWidth = 0;
		let lastHeight = 0;

		const emitSize = () => {
			console.log(`[UIMessenger] emitSize ${lastWidth} ${lastHeight} -> ${el.clientWidth} ${el.clientHeight}`);
			const width = el.clientWidth;
			const height = el.clientHeight;
			if (width !== lastWidth || height !== lastHeight) {
				lastWidth = width;
				lastHeight = height;
				console.log(`[UIMessenger] ui-size-change: ${width} ${height}`);
				// this._rpcClient.emit("ui-size-change", { width, height });
				window.parent.postMessage(
					{
					  type: "ui-size-change",
					  payload: {
						height: el.clientHeight,
						width: el.clientWidth,
					  },
					},
					"*"
				  );
			}
		};
		console.log(`[UIMessenger] new ResizeObserver`);
		const ro = new ResizeObserver(() => emitSize());
		ro.observe(el);
		emitSize();

		return () => {
			ro.disconnect();
		};
	}

	/**
	 * Subscribe once to a specific message type and return an unsubscribe.
	 * Uses RpcClient.on if available; falls back to window message filtering.
	 */
	private onMessage(type: string, handler: (msg: any) => void): () => void {
		const clientAny = this._rpcClient as unknown as {
			on?: (type: string, h: (msg: any) => void) => void | (() => void);
			off?: (type: string, h: (msg: any) => void) => void;
		};

		if (typeof clientAny.on === "function") {
			// Prefer RpcClient's event bus
			const wrapped = (msg: any) => {
				if (msg?.type === type) handler(msg);
			};
			clientAny.on(type, wrapped);
			return () => {
				if (typeof clientAny.off === "function") clientAny.off(type, wrapped);
			};
		}

		// Fallback to window listener
		const winHandler = (event: MessageEvent) => {
			const msg = event.data;
			if (msg?.type === type) handler(msg);
		};
		window.addEventListener("message", winHandler);
		return () => window.removeEventListener("message", winHandler);
	}

	// ---------------------------
	// Render Data helpers (iframe)
	// ---------------------------

	/** Wait until renderData is received from host */
	async waitForRenderData(): Promise<RenderData> {
		if (this._renderData) return this._renderData;

		return new Promise<RenderData>((resolve) => {
			const dispose = this.onMessage("ui-lifecycle-iframe-render-data", (msg) => {
				this._renderData = (msg?.payload?.renderData ?? {}) as RenderData;
				dispose();
				resolve(this._renderData!);
			});
		});
	}

	/**
	 * Explicitly request render data from host.
	 * Per spec, the host replies with `ui-lifecycle-iframe-render-data` (not `ui-message-response`),
	 * so we correlate manually via messageId and a one-shot listener (no RpcRequest used).
	 */
	async requestRenderData(): Promise<RenderData> {
		const messageId = crypto.randomUUID();

		const p = new Promise<RenderData>((resolve, reject) => {
			const dispose = this.onMessage("ui-lifecycle-iframe-render-data", (msg) => {
				if (msg?.messageId !== messageId) return; // not our response
				dispose();
				const { renderData, error } = msg?.payload ?? {};
				if (error) {
					reject(new Error(String(error)));
					return;
				}
				this._renderData = (renderData ?? {}) as RenderData;
				resolve(this._renderData);
			});
		});

		// Post request directly with our messageId (avoid RpcClient.request so we don't leak correlationMap)
		window.parent.postMessage({ type: "ui-request-render-data", messageId }, "*");

		return p;
	}

	/** Read cached render data without waiting */
	getRenderData(): RenderData | null {
		return this._renderData;
	}

	// ---------------------------------------
	// Typed wrappers: emit + request variants
	// ---------------------------------------

	// intent
	emitIntent(payload: IntentPayload): void {
		this._rpcClient.emit("intent", payload);
	}
	requestIntent(payload: IntentPayload): RpcRequest {
		return this._rpcClient.request("intent", payload);
	}

	// notify
	emitNotify(payload: NotifyPayload): void {
		this._rpcClient.emit("notify", payload);
	}
	requestNotify(payload: NotifyPayload): RpcRequest {
		return this._rpcClient.request("notify", payload);
	}

	// prompt
	emitPrompt(payload: PromptPayload): void {
		this._rpcClient.emit("prompt", payload);
	}
	requestPrompt(payload: PromptPayload): RpcRequest {
		return this._rpcClient.request("prompt", payload);
	}

	// tool
	emitTool(payload: ToolPayload): void {
		this._rpcClient.emit("tool", payload);
	}
	requestTool(payload: ToolPayload): RpcRequest {
		return this._rpcClient.request("tool", payload);
	}

	// link
	emitLink(payload: LinkPayload): void {
		this._rpcClient.emit("link", payload);
	}
	requestLink(payload: LinkPayload): RpcRequest {
		return this._rpcClient.request("link", payload);
	}

	// ui-request-data (request-only by design)
	requestData(payload: RequestDataPayload): RpcRequest {
		return this._rpcClient.request("ui-request-data", payload);
	}

	request(payload: RequestPayload): RpcRequest {
		return this._rpcClient.request("ui-request", payload);
	}

	get rpcClient(): RpcClient {
		return this._rpcClient;
	}
}


export async function initUIMessenger(args?: { 
	rootElId?: string, 
	forceWaitForRenderData?: boolean
}): Promise<UIMessenger> {
	return UIMessenger.init(args || {});
}