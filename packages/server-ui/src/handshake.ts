import { IframeHandshakeMessageTypes } from '@fractal-mcp/protocol';

const LOG_ENABLE = false;
function log(...args: unknown[]) {
  if (LOG_ENABLE) {
    console.log(`[Fractal UI Guest Messaging]`, ...args);
  }
}

/**
 * Initializes a messaging port with the parent window
 * - Posting IFRAME_INIT_HANDSHAKE to the parent window
 * - Waiting for HOST_REPLY_HANDSHAKE with a MessagePort and data (renderData)
 * - Returning the MessagePort
 *
 */
export function handshakeForMessagePort(): Promise<{ port: MessagePort, renderData: Record<string, unknown> }> {
  log("handshakeForMessagePort() called")
  return new Promise<{ port: MessagePort, renderData: Record<string, unknown> }>((resolve) => {
    const onMessage = (e: MessageEvent) => {
      log("onMessage() called", e)
      const data = (e as MessageEvent).data as { type: string, renderData: Record<string, unknown> };
      const ports = (e as MessageEvent).ports;
      if (data.type === IframeHandshakeMessageTypes.HOST_REPLY_HANDSHAKE && ports && ports[0]) {
        log("Received HOST_REPLY_HANDSHAKE")
        window.removeEventListener('message', onMessage as EventListener);
        const renderData = data.renderData;
        resolve({ port: ports[0], renderData });
      }
    };

    window.addEventListener('message', onMessage as EventListener);

    // Signal readiness to parent so it can respond with the MessagePort.
    try {
      if (window.parent) {
        log("Sending IFRAME_INIT_HANDSHAKE")
        window.parent.postMessage({ type: IframeHandshakeMessageTypes.IFRAME_INIT_HANDSHAKE }, '*');
      } else {
        log("No parent window found")
      }
    } catch {
      // Ignore cross-origin parent access errors; consumer must host in iframe.
    }
  });
}