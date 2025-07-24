import { useEffect, useState } from 'react';
import { Messaging } from '@fractal-mcp/shared-ui';
import type {
  FractalEventType,
  FractalEventByType,
  FractalEventData,
} from '@fractal-mcp/shared-ui';


type UseDataErrorResult = {
  data: null;
  isLoading: false;
  error: Error;
};

type UseDataLoadingResult = {
  data: null;
  isLoading: true;
  error: null;
};

type UseDataSuccessResult = {
  data: any;
  isLoading: false;
  error: null;
};

type UseDataResult<TData> = UseDataErrorResult | UseDataLoadingResult | UseDataSuccessResult;

// shared connection state so multiple hooks use the same message port
const messaging: { current?: Messaging } = {};

// Browser utilities
// Retrieve an element using either an id or an XPath expression
function getElementByIdOrXPath(args: { id?: string; xpath?: string }) {
  let el: Element | null = null;
  if (args.id) {
    el = document.getElementById(args.id);
  } else if (args.xpath) {
    el = document.evaluate(
      args.xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue as Element | null;
  }
  return el;
}

let initialized = false;
const initialData = (window as any).__FRACTAL_DATA__;
let messagingReadyResolve: (() => void) | null = null;
const messagingReady = new Promise<void>((resolve) => {
  messagingReadyResolve = resolve;
});

function initConnector() {
  if (initialized) return;
  // Wait for the consumer to send an INIT_PORT message which provides
  // a MessagePort for bidirectional communication.
  const listener = (e: MessageEvent) => {
    if (e.data?.type === 'INIT_PORT' && e.ports[0]) {
      messaging.current = new Messaging({ port: e.ports[0] });

      // Observe size changes and notify the consumer so the iframe can
      // be resized accordingly.
      const rootEl =
        (document.getElementById('root') as HTMLElement | null) ||
        document.documentElement;
      let lastWidth = 0;
      let lastHeight = 0;
      const emitSize = () => {
        const width = rootEl.clientWidth;
        const height = rootEl.clientHeight;
        if (width !== lastWidth || height !== lastHeight) {
          lastWidth = width;
          lastHeight = height;
          messaging.current?.emit('resize', {
            name: '',
            params: { width, height },
          });
        }
      };
      const ro = new ResizeObserver(() => emitSize());
      ro.observe(rootEl);
      emitSize();

      messaging.current.on('click', async (event: FractalEventByType<'click'>) => {
        const { id, xpath } = event.data.params as { id?: string; xpath?: string };
        const el = getElementByIdOrXPath({ id, xpath });
        if (el instanceof HTMLElement) {
          el.click();
          return 'ok';
        } else {
          return 'not found';
        }
      });

      messaging.current.on('enterText', async (event: FractalEventByType<'enterText'>) => {
        const { id, xpath, text } = event.data.params as { id?: string; xpath?: string; text: string };
        const el = getElementByIdOrXPath({ id, xpath });
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          (el as HTMLInputElement).value = text;
          return 'ok';
        } else {
          return 'not found';
        }
      });

      messaging.current.on('queryDom', async (event: FractalEventByType<'queryDom'>) => {
        return document.documentElement.outerHTML;
      });

      // Ready when you are!
      messagingReadyResolve?.();
    }
  };
  window.addEventListener('message', listener);
  initialized = true;

  // Signal to parent that we're ready to receive INIT_PORT
  window.parent.postMessage({ type: 'READY' }, '*');
}

// Internal hook to manage the low level messaging channel.
function useFractalConnector() {
  useEffect(() => {
    initConnector();
  }, []);

  const emit = <T extends FractalEventType>(
    type: T,
    data: FractalEventData<T>
  ) => {
    messagingReady.then(() => {
      messaging.current?.emit(type, data);
    });
  };

  // Send a request to the consumer and wait for a reply
  async function request<TResponse = unknown>(
    cmd: FractalEventType,
    data?: { name: string; params: Record<string, unknown> }
  ): Promise<TResponse> {
    await messagingReady;
    if (!messaging.current) {
      throw new Error('Messaging not initialized');
    }

    const eventData = data as { name: string; params: Record<string, unknown> };
    return messaging.current.request(cmd, eventData) as Promise<TResponse>;
  }

  return { emit, request };
}



/**
 * Cleaner interface for accessing everything that fractal has to offer.
 * With this approach, you only need to call one hook: 
 * 
 * ```tsx
 * const { executeAction, navigate, data, error } = useFractal();
 * ```
 * 
 * However, data is of type unknown since we no longer have a clean place to put the type parameter in useFractal().
 * 
 * @returns 
 */
export function useFractal<
  TM extends { [K in keyof TM]: { input: any; output: any } }
>() {
  type ToolName<K = keyof TM> = K & string;

  const [dataResult] = useState<UseDataResult<unknown>>({
    data: initialData,
    isLoading: false,
    error: null,
  });
  const { request } = useFractalConnector();

  // Formerly useFractalAction(...):
  async function executeAction<K extends ToolName>(
    name: K, 
    params: TM[K]['input']
  ): Promise<TM[K]['output']> {
    return await request<TM[K]['output']>('action', { name, params });
  }

  // Formerly useFractalRouter(...)
  async function navigate<K extends ToolName>(
    name: K,
    params: TM[K]['input']
  ): Promise<void> {
    await request<TM[K]['output']>('navigate', { name, params });
  }

  return {
    executeAction,
    navigate,
    ...dataResult
  }

}
