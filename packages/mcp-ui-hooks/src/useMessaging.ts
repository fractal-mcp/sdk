import { useEffect, useRef, useState } from 'react';
import { IntentPayload, LinkPayload, NotifyPayload, PromptPayload, RequestDataPayload, ToolPayload, UIMessenger, initUIMessenger } from '@fractal-mcp/mcp-ui-messenger';
import { RpcRequest } from '@fractal-mcp/shared-ui';

export type UseUIMessengerResult = {
  renderData?: Record<string, unknown>
  ready: boolean;
  requestLink: (args: LinkPayload) => Promise<RpcRequest>;
  requestIntent: (args: IntentPayload) => Promise<RpcRequest>;
  requestNotify: (args: NotifyPayload) => Promise<RpcRequest>;
  requestPrompt: (args: PromptPayload) => Promise<RpcRequest>;
  requestTool: (args: ToolPayload) => Promise<RpcRequest>;
  requestData: (args: RequestDataPayload) => Promise<RpcRequest>;
  emitLink: (args: LinkPayload) => void;
  emitIntent: (args: IntentPayload) => void;
  emitNotify: (args: NotifyPayload) => void;
  emitPrompt: (args: PromptPayload) => void;
  emitTool: (args: ToolPayload) => void;
};

export function useUIMessenger(args?: { forceWaitForRenderData?: boolean }): UseUIMessengerResult {
  const [messaging, setMessaging] = useState<UIMessenger | null>(null);
  const [ready, setReady] = useState<boolean>(false);

  const clientPromiseRef = useRef<Promise<UIMessenger> | null>(null);
  const clientRef = useRef<UIMessenger | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!messaging && !clientPromiseRef.current) {
      clientPromiseRef.current = initUIMessenger(args)
        .then((client: UIMessenger) => {
          if (cancelled) return client;
          clientRef.current = client;
          setMessaging(client);
          setReady(true);
          return client;
        })
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[mcp-ui-hooks] Failed to init client', err);
          throw err;
        });
    } else if (messaging) {
      setReady(true);
    }

    return () => {
      cancelled = true;
    };
    // We intentionally run once on mount; the singleton is global
  }, []);

  // Helper function to get the client promise
  const getClientPromise = (): Promise<UIMessenger> => {
    if (clientRef.current) {
      return Promise.resolve(clientRef.current);
    }
    return clientPromiseRef.current || initUIMessenger();
  };

  return {
    requestLink: async (args: LinkPayload): Promise<RpcRequest> => {
      const client = await getClientPromise();
      return await client.requestLink(args);
    },
    requestIntent: async (args: IntentPayload): Promise<RpcRequest> => {
      const client = await getClientPromise();
      return client.requestIntent(args);
    },
    requestNotify: async (args: NotifyPayload): Promise<RpcRequest> => {
      const client = await getClientPromise();
      return client.requestNotify(args);
    },
    requestPrompt: async (args: PromptPayload): Promise<RpcRequest> => {
      const client = await getClientPromise();
      return client.requestPrompt(args);
    },
    requestTool: async (args: ToolPayload): Promise<RpcRequest> => {
      const client = await getClientPromise();
      return client.requestTool(args);
    },
    requestData: async (args: RequestDataPayload): Promise<RpcRequest> => {
      const client = await getClientPromise();
      return client.requestData(args);
    },
    emitLink: async (args: LinkPayload) => {
      const client = await getClientPromise();
      client.emitLink(args);
    },
    emitIntent: async (args: IntentPayload) => {
      const client = await getClientPromise();
      client.emitIntent(args);
    },
    emitNotify: async (args: NotifyPayload) => {
      const client = await getClientPromise();
      client.emitNotify(args);
    },
    emitPrompt: async (args: PromptPayload) => {
      const client = await getClientPromise();
      client.emitPrompt(args);
    },
    emitTool: async (args: ToolPayload) => {
      const client = await getClientPromise();
      client.emitTool(args);
    },
    ready,
    renderData: clientRef.current?.getRenderData() || undefined,
  };
}

export const useFractal = useUIMessenger;
