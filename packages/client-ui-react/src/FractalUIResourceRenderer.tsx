import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { UIActionMessage, UIMetadataKey } from '@fractal-mcp/protocol';
import { processHTMLResource } from './processHTMLResource';
import { getUIResourceMetadata } from './getResourceMetadata';
import { MessagingClient, handshakeForMessageClient, onIntent, onNotify, onPrompt, onLink, onResize, onTool } from '@fractal-mcp/client-ui-shared';

/**
 * Special thanks to the mcp-ui project for their excellent work on UI resource rendering!
 * This component is our take on mcp-ui's UIResourceRenderer.
 * We expose a similar interface but use an enhanced underlying messaging protocol with additional features.
 * 
 * Check them out at:
 * - https://mcpui.dev/
 * - https://github.com/idosal/mcp-ui/tree/main
 * 
 * Fractal additions:
 * - componentId: optional string, used to register the component's messaging client globally
 */

export type FractalUIResourceRendererProps = {
  resource: Partial<Resource>;
  onUIAction?: (result: UIActionMessage) => Promise<unknown>;
  style?: React.CSSProperties;
  proxy?: string;
  iframeRenderData?: Record<string, unknown>;
  autoResizeIframe?: boolean | { width?: boolean; height?: boolean };
  sandboxPermissions?: string;
  iframeProps?: Omit<React.HTMLAttributes<HTMLIFrameElement>, 'src' | 'srcDoc' | 'style'> & {
    ref?: React.RefObject<HTMLIFrameElement>;
  };
  componentId?: string;
};

export const FractalUIResourceRenderer = ({
  resource,
  onUIAction,
  style,
  proxy,
  iframeRenderData,
  autoResizeIframe,
  sandboxPermissions,
  iframeProps,
  componentId,
}: FractalUIResourceRendererProps) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const messagingRef = useRef<MessagingClient | null>(null);
  const handshakePromiseRef = useRef<Promise<MessagingClient> | null>(null);
  
  // Add state for dynamic iframe size
  const [dynamicSize, setDynamicSize] = useState<{ width?: number; height?: number }>({});
  
  useImperativeHandle(iframeProps?.ref, () => iframeRef.current as HTMLIFrameElement);

  const { error, iframeSrc, iframeRenderMode, htmlString } = useMemo(() => {
    return processHTMLResource(resource, proxy);
  }, [resource, proxy]);

  const uiMetadata = useMemo(() => {
    return getUIResourceMetadata(resource);
  }, [resource]);
  const preferredFrameSize = uiMetadata[UIMetadataKey.PREFERRED_FRAME_SIZE] ?? ['100%', '100%'];
  const metadataInitialRenderData = uiMetadata[UIMetadataKey.INITIAL_RENDER_DATA] ?? undefined;
  
  // Use a ref to store stable render data
  const stableRenderDataRef = useRef<Record<string, unknown> | undefined>();
  
  const initialRenderData = useMemo(() => {
    if (!iframeRenderData && !metadataInitialRenderData) {
      const result = undefined;
      stableRenderDataRef.current = result;
      return result;
    }
    const result = {
      ...metadataInitialRenderData,
      ...iframeRenderData,
    };
    
    // Only update if the content actually changed
    if (JSON.stringify(stableRenderDataRef.current) !== JSON.stringify(result)) {
      stableRenderDataRef.current = result;
    }
    
    return stableRenderDataRef.current;
  }, [iframeRenderData, metadataInitialRenderData]);


  // Initialize messaging once when iframe is available
  useEffect(() => {
    
    if (!iframeRef.current) {
      return;
    }
    
    // If we already have a messaging client or handshake in progress, don't start another
    if (messagingRef.current || handshakePromiseRef.current) {
      return;
    }
    
    // Store the promise to prevent multiple concurrent handshakes
    const handshakePromise = handshakeForMessageClient({
      iframe: iframeRef.current,
      renderData: stableRenderDataRef.current,
      componentId: componentId,
    });
    
    handshakePromiseRef.current = handshakePromise;
    
    handshakePromise
      .then((m) => {
        messagingRef.current = m;
        handshakePromiseRef.current = null;

        // Register handlers immediately after init
        onResize(m, ({ width, height }) => {
          if (!autoResizeIframe) return;
          
          const allowH = typeof autoResizeIframe === 'boolean' || autoResizeIframe.height;
          const allowW = typeof autoResizeIframe === 'boolean' || autoResizeIframe.width;
          
          const newSize = {
            ...dynamicSize,
            ...(allowW && typeof width === 'number' ? { width } : {}),
            ...(allowH && typeof height === 'number' ? { height } : {}),
          };
          
          setDynamicSize(newSize);
        });

        if (onUIAction) {
          onIntent(m, (payload) => onUIAction({ type: 'intent', payload }));
          onNotify(m, (payload) => onUIAction({ type: 'notify', payload }));
          onPrompt(m, (payload) => onUIAction({ type: 'prompt', payload }));
          onTool(m, (payload) => {
            console.log("onTool", payload)
            onUIAction({ type: 'tool', payload });
          });
          onLink(m, (payload) => onUIAction({ type: 'link', payload }));
        }
      })
      .catch((error) => {
        handshakePromiseRef.current = null;
      });

    return () => { 
      // Don't clear refs in cleanup - let the component unmount handle that
    };
  }, [onUIAction, autoResizeIframe]); // Remove initialRenderData from deps

  // Separate effect for component unmount cleanup
  useEffect(() => {
    return () => {
      messagingRef.current = null;
      handshakePromiseRef.current = null;
    };
  }, []); // Only run on mount/unmount

  if (error) return <p className="text-red-500">{error}</p>;

  const sandbox = useMemo(() => {
    if (iframeRenderMode === 'srcDoc') {
      // with raw HTML we don't set allow-same-origin for security reasons
      return mergeSandboxPermissions(sandboxPermissions ?? '', 'allow-scripts');
    }
    return mergeSandboxPermissions(sandboxPermissions ?? '', 'allow-scripts allow-same-origin');
  }, [sandboxPermissions, iframeRenderMode]);

  // Calculate the final style including dynamic resize
  const finalStyle = useMemo(() => {
    const baseStyle = { 
      border: 'none',
      outline: 'none',
      overflow: 'hidden',
      width: preferredFrameSize[0], 
      height: preferredFrameSize[1], 
      ...style 
    };
    
    // Override with dynamic size if available
    if (dynamicSize.width !== undefined) {
      baseStyle.width = `${dynamicSize.width}px`;
    }
    if (dynamicSize.height !== undefined) {
      baseStyle.height = `${dynamicSize.height}px`;
    }
    
    return baseStyle;
  }, [preferredFrameSize, style, dynamicSize]);

  if (iframeRenderMode === 'srcDoc') {
    if (htmlString === null || htmlString === undefined) {
      if (!error) {
        return <p className="text-orange-500">No HTML content to display.</p>;
      }
      return null;
    }

    return (
      <iframe
        srcDoc={htmlString}
        sandbox={sandbox}
        style={finalStyle}
        title="MCP HTML Resource (Embedded Content)"
        {...iframeProps}
        ref={iframeRef}
      />
    );
  } else if (iframeRenderMode === 'src') {
    if (iframeSrc === null || iframeSrc === undefined) {
      if (!error) {
        return <p className="text-orange-500">No URL provided for HTML resource.</p>;
      }
      return null;
    }
    return (
      <iframe
        src={iframeSrc}
        sandbox={sandbox}
        style={finalStyle}
        title="MCP HTML Resource (URL)"
        {...iframeProps}
        ref={iframeRef}
      />
    );
  }

  return <p className="text-gray-500">Initializing HTML resource display...</p>;
};

FractalUIResourceRenderer.displayName = 'FractalUIResourceRenderer';

function mergeSandboxPermissions(sandboxPermissions: string, defaultSandboxPermissions: string) {
  return [...new Set([...sandboxPermissions.split(' '), ...defaultSandboxPermissions.split(' ')])]
    .filter(Boolean)
    .map((permission) => permission.trim())
    .join(' ');
}
