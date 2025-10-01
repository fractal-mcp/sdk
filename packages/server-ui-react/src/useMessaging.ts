import { useEffect, useRef, useState } from 'react';
import { UIMessenger, initUIMessenger, RegisteredTool } from '@fractal-mcp/server-ui';

export type UseUIMessengerResult = {
  data?: Record<string, unknown>
  ready: boolean;
  link: (url: string) => Promise<unknown>;
  intent: (intent: string, params?: Record<string, unknown>) => Promise<void>;
  notify: (message: string) => Promise<void>;
  prompt: (prompt: string) => Promise<void>;
  tool: (toolName: string, params: Record<string, unknown>) => Promise<void>;
  registerTool: (tool: RegisteredTool) => Promise<void>;
};

export function useUIMessenger(): UseUIMessengerResult {
  const [messaging, setMessaging] = useState<UIMessenger | null>(null);
  const [ready, setReady] = useState<boolean>(false);

  const clientPromiseRef = useRef<Promise<UIMessenger> | null>(null);
  const clientRef = useRef<UIMessenger | null>(null);
  
  useEffect(() => {
    let cancelled = false;

    if (!messaging && !clientPromiseRef.current) {
      clientPromiseRef.current = initUIMessenger()
        .then((client: UIMessenger) => {
          if (cancelled) return client;
          clientRef.current = client;
          setMessaging(client);
          setReady(true);
          return client;
        })
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('[server-ui-react] Failed to init client', err);
          throw err;
        });
    } else if (messaging) {
      setReady(true);
    }

    return () => {
      cancelled = true;
    };
    // We intentionally run once on mount; the singleton is global
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to get the client promise
  const getClientPromise = (): Promise<UIMessenger> => {
    if (clientRef.current) {
      return Promise.resolve(clientRef.current);
    }
    return clientPromiseRef.current || initUIMessenger();
  };

  return {
    link: async (url: string) => {
      const client = await getClientPromise();
      return await client.link(url);
    },
    intent: async (intent: string, params?: Record<string, unknown>) => {
      const client = await getClientPromise();
      return client.intent(intent, params);
    },
    notify: async (message: string) => {
      const client = await getClientPromise();
      return client.notify(message);
    },
    prompt: async (prompt: string) => {
      const client = await getClientPromise();
      return client.prompt(prompt);
    },
    tool: async (toolName: string, params: Record<string, unknown>) => {
      const client = await getClientPromise();
      return client.tool(toolName, params);
    },
    registerTool: async (tool: RegisteredTool) => {
      const client = await getClientPromise();
      client.registerTool(tool);
    },
    ready, 
    data: clientRef.current?.getRenderData() || undefined
  };
}

export const useFractal = useUIMessenger;