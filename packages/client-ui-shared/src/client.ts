import { IMessagingClient, MessagingClient } from '@fractal-mcp/shared-ui';
import { IframeHandshakeMessageTypes, AgentActionCallTool, AgentActionListTools, AgentActionQueryDOM, AgentActionClick, AgentActionEnterText } from '@fractal-mcp/protocol';
import { getMessageRouter } from './router';
import { rename } from 'fs';

export type { MessagingClient };

export type HostInitArgs = {
  iframe: HTMLIFrameElement;
  renderData?: Record<string, unknown>;
  componentId?: string;
};

// Borrowed from MCP UI since we need to be aware of these types, and eventually compatible with them.
export const McpUIInternalMessageType = {
  UI_MESSAGE_RECEIVED: 'ui-message-received',
  UI_MESSAGE_RESPONSE: 'ui-message-response',

  UI_SIZE_CHANGE: 'ui-size-change',

  UI_LIFECYCLE_IFRAME_READY: 'ui-lifecycle-iframe-ready',
  UI_LIFECYCLE_IFRAME_RENDER_DATA: 'ui-lifecycle-iframe-render-data',
} as const;

const LOG_ENABLE = true;
function log(...args: unknown[]) {
  if (LOG_ENABLE) {
    console.log(`[Fractal UI Host Messaging]`, ...args);
  }
}

async function waitForMessageFromIframe(iframe: HTMLIFrameElement): Promise<MessageEvent> {
  log('Waiting for IFRAME_INIT_HANDSHAKE from iframe');
  return new Promise<MessageEvent>((resolve) => {
    const handleMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      const type = (e as MessageEvent).data?.type;
      if (type === IframeHandshakeMessageTypes.IFRAME_INIT_HANDSHAKE) {
        log('Received IFRAME_INIT_HANDSHAKE from iframe, resolving');
        window.removeEventListener('message', handleMessage as EventListener);
        resolve(e);
      }
    };
    window.addEventListener('message', handleMessage as EventListener);
  });
}

// Coalesce duplicate handshakes per componentId to a single MessagingClient
type HostHandshakeState = {
  client?: MessagingClient;
  promise?: Promise<MessagingClient>;
};

const iframeHandshakeMap: WeakMap<HTMLIFrameElement, HostHandshakeState> = new WeakMap();

export async function handshakeForMessageClient(args: HostInitArgs): Promise<MessagingClient> {
  log("FUNCTION handshakeForMessageClient() called")
  const { iframe, componentId } = args;
  if (!iframe.contentWindow) throw new Error('Iframe has no contentWindow');

  const channel = new MessageChannel();
  // Coalesce by iframe element
  const state = iframeHandshakeMap.get(iframe) ?? {} as HostHandshakeState;
  if (state.client) {
    log('Reusing existing MessagingClient for iframe');
    return state.client;
  }
  if (state.promise) {
    log('Awaiting in-flight handshake for iframe');
    return state.promise;
  }
  const promise = (async () => {
    const msg = await waitForMessageFromIframe(iframe);
    if (msg.data?.type == IframeHandshakeMessageTypes.IFRAME_INIT_HANDSHAKE) {
      log('Sending HOST_REPLY_HANDSHAKE (iframe-coalesced)');
      iframe.contentWindow!.postMessage({ type: IframeHandshakeMessageTypes.HOST_REPLY_HANDSHAKE, renderData: args.renderData }, '*', [channel.port2]);
      const mc = new MessagingClient({ port: channel.port1 });
      if (componentId) {
        getMessageRouter().registerClient(componentId, mc);
      }
      return mc;
    }
    throw new Error('Unknown handshake message type');
  })();
  (state as HostHandshakeState).promise = promise;
  iframeHandshakeMap.set(iframe, state as HostHandshakeState);
  const mc = await promise;
  (state as HostHandshakeState).client = mc;
  iframeHandshakeMap.set(iframe, state as HostHandshakeState);
  return mc;
}

export function listTools(mc: IMessagingClient): Promise<unknown> {
  return mc.request({ type: 'listTools', payload: {} });
}

export function callTool(mc: IMessagingClient, args: AgentActionCallTool['payload']): Promise<unknown> {
  return mc.request({ type: 'callTool', payload: args });
}

export function queryDom(mc: IMessagingClient, args: AgentActionQueryDOM['payload']): Promise<unknown> {
  return mc.request({ type: 'queryDom', payload: args });
}

export function click(mc: IMessagingClient, args: AgentActionClick['payload']): Promise<unknown> {
  return mc.request({ type: 'click', payload: args });
}

export function enterText(mc: IMessagingClient, args: AgentActionEnterText['payload']): Promise<unknown> {
  return mc.request({ type: 'enterText', payload: args });
}

// Event subscriptions
export function onNotify(mc: IMessagingClient, handler: (payload: { message: string }) => void) {
  mc.on('notify', (payload: unknown) => handler(payload as { message: string }));
}

export function onLink(mc: IMessagingClient, handler: (payload: { url: string }) => void) {
  mc.on('link', (payload: unknown) => handler(payload as { url: string }));
}

export function onIntent(mc: IMessagingClient, handler: (payload: { intent: string; params: Record<string, unknown> }) => void) {
  mc.on('intent', (payload: unknown) => handler(payload as { intent: string; params: Record<string, unknown> }));
}

export function onPrompt(mc: IMessagingClient, handler: (payload: { prompt: string }) => void) {
  mc.on('prompt', (payload: unknown) => handler(payload as { prompt: string }));
}

export function onResize(mc: IMessagingClient, handler: (payload: { width: number; height: number }) => void) {
  mc.on('resize', (payload: unknown) => handler(payload as { width: number; height: number }));
}

export function onTool(mc: IMessagingClient, handler: (payload: { toolName: string; params: Record<string, unknown> }) => void) {
  mc.on('tool', (payload: unknown) => {
    console.log("onTool", payload)
    handler(payload as { toolName: string; params: Record<string, unknown> });
  });
}



