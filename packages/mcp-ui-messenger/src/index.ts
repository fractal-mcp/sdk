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
	private _log: boolean = false;

	/**
	 * Static async initialization method.
	 * Checks for waitForRenderData query parameter and blocks until render data is received if needed.
	 */
	static async init(args: { 
		rootElId?: string, 
		forceWaitForRenderData?: boolean,
		log?: boolean
	}): Promise<UIMessenger> {
		const { rootElId = undefined, forceWaitForRenderData = false, log = false } = args;
		
		// Temporary log function for static method
		const logFn = (message: string, ...args: any[]) => {
			if (log) console.log(message, ...args);
		};

		try {
			logFn(`[UIMessenger] init`);
			const urlParams = new URLSearchParams(window.location.search);
			const shouldWaitForRenderData = (urlParams.get("waitForRenderData") === "true") || forceWaitForRenderData;

			let initialRenderData: RenderData | null = null;

			if (shouldWaitForRenderData) {
				logFn(`[UIMessenger] shouldWaitForRenderData: ${shouldWaitForRenderData}`);
				// Set up listener before sending ready event
				const renderDataPromise = new Promise<RenderData>((resolve, reject) => {
					const timeoutId = setTimeout(() => {
						window.removeEventListener("message", handler);
						reject(new Error("Timeout waiting for render data"));
					}, 10000); // 10 second timeout

					const handler = (event: MessageEvent) => {
						try {
							logFn(`[UIMessenger] handler: ${JSON.stringify(event.data)}`);
							if (event.data?.type === "ui-lifecycle-iframe-render-data") {
								logFn(`[UIMessenger] ui-lifecycle-iframe-render-data: ${JSON.stringify(event.data)}`);
								clearTimeout(timeoutId);
								window.removeEventListener("message", handler);
								resolve(event.data.payload?.renderData ?? {});
							}
						} catch (error) {
							clearTimeout(timeoutId);
							window.removeEventListener("message", handler);
							reject(error);
						}
					};
					window.addEventListener("message", handler);
				});

				// Send ready event
				try {
					window.parent.postMessage({ type: "ui-lifecycle-iframe-ready" }, "*");
				} catch (error) {
					logFn(`[UIMessenger] Error sending ready event:`, error);
					throw new Error(`Failed to send ready event: ${error}`);
				}

				// Wait for render data
				initialRenderData = await renderDataPromise;
			} else {
				// Still send ready event so parent knows to send render data,
				// but don't block waiting for it
				try {
					window.parent.postMessage({ type: "ui-lifecycle-iframe-ready" }, "*");
				} catch (error) {
					logFn(`[UIMessenger] Error sending ready event:`, error);
					// Non-blocking, so just log but don't throw
				}
			}

			logFn(`[UIMessenger] initialRenderData: ${JSON.stringify(initialRenderData)}`);
			const messenger = new UIMessenger(rootElId || "root", {
				initialRenderData,
				log
			});

			return messenger;
		} catch (error) {
			logFn(`[UIMessenger] Error during init:`, error);
			throw error;
		}
	}

	constructor(
		rootElId?: string,
		options?: { initialRenderData?: RenderData | null, log?: boolean }
	) {
		try {
			this._log = options?.log ?? false;
			this.log(`[UIMessenger] constructor with rootElId: ${rootElId}`);

			this._rpcClient = new RpcClient({ dstWindow: window.parent });

			// Set initial render data if provided
			if (options?.initialRenderData) {
				this._renderData = options.initialRenderData;
			}

			// setup resize observer (your pattern)
			this._stopResize = this.setupResizeObserver(rootElId || "root");

			// keep cached render data up to date
			this.onMessage("ui-lifecycle-iframe-render-data", (msg: any) => {
				try {
					this._renderData = (msg?.payload?.renderData ?? {}) as RenderData;
					this.log(`[UIMessenger] Updated render data:`, this._renderData);
				} catch (error) {
					this.log(`[UIMessenger] Error updating render data:`, error);
				}
			});
		} catch (error) {
			console.error(`[UIMessenger] Fatal error in constructor:`, error);
			throw error;
		}
	}

	/** Internal logging method that respects the log flag */
	private log(message: string, ...args: any[]): void {
		if (this._log) {
			console.log(message, ...args);
		}
	}

	/** Stop observing size changes */
	stopResizeObserver(): void {
		try {
			this._stopResize?.();
		} catch (error) {
			this.log(`[UIMessenger] Error stopping resize observer:`, error);
		}
	}

	/** Dispose listeners/resources this class set up */
	destroy(): void {
		try {
			this.stopResizeObserver();
			// (No global listeners retained directly; onMessage handlers use returned disposers inline.)
		} catch (error) {
			this.log(`[UIMessenger] Error during destroy:`, error);
		}
	}

	/** Sets up a resize observer on provided element (or #root or documentElement) */
	private setupResizeObserver(rootElId?: string): () => void {
		try {
			this.log(`[UIMessenger] setupResizeObserver: ${rootElId}`);

			const el = rootElId 
				? (document.getElementById(rootElId) as HTMLElement | null) 
				: document.documentElement;

			if (!el) {
				throw new Error(`Root element with id ${rootElId} not found`);
			}
			this.log(`[UIMessenger] el: ${el}`);

			let lastWidth = 0;
			let lastHeight = 0;

			const emitSize = () => {
				try {
					this.log(`[UIMessenger] emitSize ${lastWidth} ${lastHeight} -> ${el.clientWidth} ${el.clientHeight}`);
					const width = el.clientWidth;
					const height = el.clientHeight;
					if (width !== lastWidth || height !== lastHeight) {
						lastWidth = width;
						lastHeight = height;
						this.log(`[UIMessenger] ui-size-change: ${width} ${height}`);
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
				} catch (error) {
					this.log(`[UIMessenger] Error emitting size:`, error);
				}
			};
			
			this.log(`[UIMessenger] new ResizeObserver`);
			const ro = new ResizeObserver(() => emitSize());
			ro.observe(el);
			emitSize();

			return () => {
				try {
					ro.disconnect();
				} catch (error) {
					this.log(`[UIMessenger] Error disconnecting resize observer:`, error);
				}
			};
		} catch (error) {
			this.log(`[UIMessenger] Error setting up resize observer:`, error);
			throw error;
		}
	}

	/**
	 * Subscribe once to a specific message type and return an unsubscribe.
	 * Uses RpcClient.on if available; falls back to window message filtering.
	 */
	private onMessage(type: string, handler: (msg: any) => void): () => void {
		try {
			const clientAny = this._rpcClient as unknown as {
				on?: (type: string, h: (msg: any) => void) => void | (() => void);
				off?: (type: string, h: (msg: any) => void) => void;
			};

			if (typeof clientAny.on === "function") {
				// Prefer RpcClient's event bus
				const wrapped = (msg: any) => {
					try {
						if (msg?.type === type) handler(msg);
					} catch (error) {
						this.log(`[UIMessenger] Error in message handler for type ${type}:`, error);
					}
				};
				clientAny.on(type, wrapped);
				return () => {
					try {
						if (typeof clientAny.off === "function") clientAny.off(type, wrapped);
					} catch (error) {
						this.log(`[UIMessenger] Error unsubscribing from type ${type}:`, error);
					}
				};
			}

			// Fallback to window listener
			const winHandler = (event: MessageEvent) => {
				try {
					const msg = event.data;
					if (msg?.type === type) handler(msg);
				} catch (error) {
					this.log(`[UIMessenger] Error in window message handler for type ${type}:`, error);
				}
			};
			window.addEventListener("message", winHandler);
			return () => {
				try {
					window.removeEventListener("message", winHandler);
				} catch (error) {
					this.log(`[UIMessenger] Error removing window message listener:`, error);
				}
			};
		} catch (error) {
			this.log(`[UIMessenger] Error setting up message listener:`, error);
			// Return a no-op unsubscribe function
			return () => {};
		}
	}

	// ---------------------------
	// Render Data helpers (iframe)
	// ---------------------------

	/** Wait until renderData is received from host */
	async waitForRenderData(): Promise<RenderData> {
		try {
			if (this._renderData) return this._renderData;

			return new Promise<RenderData>((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					dispose();
					reject(new Error("Timeout waiting for render data"));
				}, 10000); // 10 second timeout

				const dispose = this.onMessage("ui-lifecycle-iframe-render-data", (msg) => {
					try {
						this._renderData = (msg?.payload?.renderData ?? {}) as RenderData;
						clearTimeout(timeoutId);
						dispose();
						resolve(this._renderData!);
					} catch (error) {
						clearTimeout(timeoutId);
						dispose();
						reject(error);
					}
				});
			});
		} catch (error) {
			this.log(`[UIMessenger] Error waiting for render data:`, error);
			throw error;
		}
	}

	/**
	 * Explicitly request render data from host.
	 * Per spec, the host replies with `ui-lifecycle-iframe-render-data` (not `ui-message-response`),
	 * so we correlate manually via messageId and a one-shot listener (no RpcRequest used).
	 */
	async requestRenderData(): Promise<RenderData> {
		try {
			const messageId = crypto.randomUUID();

			const p = new Promise<RenderData>((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					dispose();
					reject(new Error("Timeout requesting render data"));
				}, 10000); // 10 second timeout

				const dispose = this.onMessage("ui-lifecycle-iframe-render-data", (msg) => {
					try {
						if (msg?.messageId !== messageId) return; // not our response
						clearTimeout(timeoutId);
						dispose();
						const { renderData, error } = msg?.payload ?? {};
						if (error) {
							reject(new Error(String(error)));
							return;
						}
						this._renderData = (renderData ?? {}) as RenderData;
						resolve(this._renderData);
					} catch (error) {
						clearTimeout(timeoutId);
						dispose();
						reject(error);
					}
				});
			});

			// Post request directly with our messageId (avoid RpcClient.request so we don't leak correlationMap)
			window.parent.postMessage({ type: "ui-request-render-data", messageId }, "*");

			return p;
		} catch (error) {
			this.log(`[UIMessenger] Error requesting render data:`, error);
			throw error;
		}
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
		try {
			this._rpcClient.emit("intent", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error emitting intent:`, error);
			throw error;
		}
	}
	requestIntent(payload: IntentPayload): RpcRequest {
		try {
			return this._rpcClient.request("intent", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error requesting intent:`, error);
			throw error;
		}
	}

	// notify
	emitNotify(payload: NotifyPayload): void {
		try {
			this._rpcClient.emit("notify", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error emitting notify:`, error);
			throw error;
		}
	}
	requestNotify(payload: NotifyPayload): RpcRequest {
		try {
			return this._rpcClient.request("notify", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error requesting notify:`, error);
			throw error;
		}
	}

	// prompt
	emitPrompt(payload: PromptPayload): void {
		try {
			this._rpcClient.emit("prompt", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error emitting prompt:`, error);
			throw error;
		}
	}
	requestPrompt(payload: PromptPayload): RpcRequest {
		try {
			return this._rpcClient.request("prompt", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error requesting prompt:`, error);
			throw error;
		}
	}

	// tool
	emitTool(payload: ToolPayload): void {
		try {
			this._rpcClient.emit("tool", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error emitting tool:`, error);
			throw error;
		}
	}
	requestTool(payload: ToolPayload): RpcRequest {
		try {
			return this._rpcClient.request("tool", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error requesting tool:`, error);
			throw error;
		}
	}

	// link
	emitLink(payload: LinkPayload): void {
		try {
			this._rpcClient.emit("link", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error emitting link:`, error);
			throw error;
		}
	}
	requestLink(payload: LinkPayload): RpcRequest {
		try {
			return this._rpcClient.request("link", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error requesting link:`, error);
			throw error;
		}
	}

	// ui-request-data (request-only by design)
	requestData(payload: RequestDataPayload): RpcRequest {
		try {
			return this._rpcClient.request("ui-request-data", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error requesting data:`, error);
			throw error;
		}
	}

	request(payload: RequestPayload): RpcRequest {
		try {
			return this._rpcClient.request("ui-request", payload);
		} catch (error) {
			this.log(`[UIMessenger] Error making request:`, error);
			throw error;
		}
	}

	get rpcClient(): RpcClient {
		return this._rpcClient;
	}
}


export async function initUIMessenger(args?: { 
	rootElId?: string, 
	forceWaitForRenderData?: boolean,
	log?: boolean
}): Promise<UIMessenger> {
	return UIMessenger.init(args || {});
}