import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  Ref,
  useState,
  useMemo,
} from 'react';
import { Messaging } from '@fractal-mcp/shared-ui';
import type { FractalEventType, FractalEventByType, FractalUIEvent } from '@fractal-mcp/shared-ui';
import { callMcpTool } from './shared';

const FRACTAL_REGISTRY_URL = "http://localhost:3000/api/proxy"

export interface FractalComponentHandle {
  queryDom: (selector: string) => Promise<unknown>;
  click: (params: {id: string, xpath: string}) => Promise<unknown>;
  enterText: (params: {id: string, xpath: string, text: string}) => Promise<unknown>;
  send: (cmd: FractalEventType, data?: { name: string; params: Record<string, unknown> }) => Promise<unknown>;
}

export type CommandHandlers = Record<
  string,
  (data: unknown, reply: (resp: unknown) => void) => void
>;

interface Props {
  src?: string;
  srcDoc?: string;
  data?: unknown;
  onEvent?: (e: FractalUIEvent) => void;
  /**
   * Callback for routing events emitted from the provider.
   * This is required to properly handle navigation actions.
   */
  // onRoutingEvent?: (name: string, params: unknown) => void;
  sandbox?: string;
  handlers?: CommandHandlers;
  registryUrl?: string;
}

export const FractalComponent = forwardRef(function FractalComponent(
  { src: initialSrc, srcDoc, onEvent, sandbox = 'allow-scripts allow-same-origin' }: Props,
  ref: Ref<FractalComponentHandle>,
) {
  // Convert src and data to useState for routing updates
  const [src, setSrc] = useState(initialSrc);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messagingRef = useRef<Messaging | null>(null);
  const onEventRef = useRef<typeof onEvent | undefined>(undefined);
  const lastSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // keep the latest onEvent handler without reinitializing the message channel
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const ch = new MessageChannel();
    messagingRef.current = new Messaging({ port: ch.port1 });

    // Handle actions emitted from the provider
    messagingRef.current.on('action', async (event: FractalEventByType<'action'>) => {  
      if (onEvent) onEvent(event)
    })

    messagingRef.current.on('navigate', async (event: FractalEventByType<'navigate'>) => {
      if (onEvent) onEvent(event)
    })

    messagingRef.current.on('resize', async (event: FractalEventByType<'resize'>) => {
      const { width, height } = event.data.params as { width: number; height: number }
      if (width !== lastSizeRef.current.width || height !== lastSizeRef.current.height) {
        lastSizeRef.current = { width, height }
        if (iframeRef.current) {
          iframeRef.current.style.width = `${width}px`
          iframeRef.current.style.height = `${height}px`
        }
      }
    })

    // Listen for READY signal from iframe before sending INIT_PORT
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'READY' && e.source === iframeRef.current?.contentWindow) {
      iframeRef.current!.contentWindow!.postMessage({ type: 'INIT_PORT' }, '*', [ch.port2]);
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    const el = iframeRef.current;
    return () => {
      el?.removeEventListener('load', () => {});
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const call = (cmd: FractalEventType, data: { name: string; params: Record<string, unknown> }) => {
    return messagingRef.current!.request(cmd, data);
  };

  useImperativeHandle(
    ref,
    () => ({
      queryDom: () => call('queryDom', { name: '', params: {} }),
      click: (params: {id: string, xpath: string}) => call('click', { name: '', params }),
      enterText: (params: {id: string, xpath: string, text: string}) => call('enterText', { name: '', params }),
      send: (cmd: FractalEventType, data?: { name: string; params: Record<string, unknown> }) => 
        call(cmd, data || { name: '', params: {} }),
    }),
    [],
  );

  // Memoize iframe props to prevent unnecessary iframe re-renders
  const memoizedSrc = useMemo(() => src, [src]);
  const memoizedSrcDoc = useMemo(() => srcDoc, [srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      src={memoizedSrc}
      srcDoc={memoizedSrcDoc}
      sandbox={sandbox}
      style={{ 
        border: 'none',
        outline: 'none',
        width: '100%', 
        height: '100%' 
      }}
      title="sandboxed-widget"
    />
  );
});

// TODO delete this.
// Its only used in consumer example 
export function useFractalComponent() {
  return useRef<FractalComponentHandle>(null);
}