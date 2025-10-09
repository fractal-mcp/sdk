import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { UIActionMessage, UIMetadataKey } from '@fractal-mcp/protocol';
import { processHTMLResource } from './processHTMLResource';
import { getUIResourceMetadata } from './getResourceMetadata';

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

export const InternalMessageType = {
  UI_MESSAGE_RECEIVED: 'ui-message-received',
  UI_MESSAGE_RESPONSE: 'ui-message-response',
  UI_SIZE_CHANGE: 'ui-size-change',
  UI_LIFECYCLE_IFRAME_READY: 'ui-lifecycle-iframe-ready',
  UI_LIFECYCLE_IFRAME_RENDER_DATA: 'ui-lifecycle-iframe-render-data',
  UI_REQUEST_RENDER_DATA: 'ui-request-render-data',
} as const;

export const ReservedUrlParams = {
  WAIT_FOR_RENDER_DATA: 'waitForRenderData',
} as const;

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


  // Handle iframe messaging
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      const { source, origin, data } = event;
      // Only process the message if it came from this specific iframe
      if (iframeRef.current && source === iframeRef.current.contentWindow) {
        // if the iframe is ready, send the render data to the iframe
        if (data?.type === InternalMessageType.UI_LIFECYCLE_IFRAME_READY && initialRenderData) {
          postToFrame(
            InternalMessageType.UI_LIFECYCLE_IFRAME_RENDER_DATA,
            source,
            origin,
            undefined,
            {
              renderData: initialRenderData,
            },
          );
          return;
        }

        // if the iframe requests render data, send it
        if (data?.type === InternalMessageType.UI_REQUEST_RENDER_DATA) {
          postToFrame(
            InternalMessageType.UI_LIFECYCLE_IFRAME_RENDER_DATA,
            source,
            origin,
            data.messageId,
            {
              renderData: initialRenderData,
            },
          );
          return;
        }

        if (data?.type === InternalMessageType.UI_SIZE_CHANGE) {
          const { width, height } = data.payload as { width?: number; height?: number };
          if (autoResizeIframe && iframeRef.current) {
            const shouldAdjustHeight =
              (typeof autoResizeIframe === 'boolean' || autoResizeIframe.height) && height;
            const shouldAdjustWidth =
              (typeof autoResizeIframe === 'boolean' || autoResizeIframe.width) && width;

            if (shouldAdjustHeight) {
              setDynamicSize((prev) => ({ ...prev, height }));
            }
            if (shouldAdjustWidth) {
              setDynamicSize((prev) => ({ ...prev, width }));
            }
          }
          return;
        }

        const uiActionResult = data as UIActionMessage & { messageId?: string };
        if (!uiActionResult) {
          return;
        }

        // return the "ui-message-received" message only if the onUIAction callback is provided
        // otherwise we cannot know that the message was received by the client
        if (onUIAction) {
          const messageId = uiActionResult.messageId;
          postToFrame(InternalMessageType.UI_MESSAGE_RECEIVED, source, origin, messageId);
          try {
            const response = await onUIAction(uiActionResult);
            postToFrame(InternalMessageType.UI_MESSAGE_RESPONSE, source, origin, messageId, {
              response,
            });
          } catch (err) {
            console.error('Error handling UI action result in FractalUIResourceRenderer:', err);
            postToFrame(InternalMessageType.UI_MESSAGE_RESPONSE, source, origin, messageId, {
              error: err,
            });
          }
        }
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onUIAction, autoResizeIframe, initialRenderData]);

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

export function postToFrame(
  type: (typeof InternalMessageType)[keyof typeof InternalMessageType],
  source: Window | null,
  origin: string,
  originalMessageId?: string,
  payload?: unknown,
) {
  // in case the iframe is srcdoc, the origin is null
  const targetOrigin = origin && origin !== 'null' ? origin : '*';
  source?.postMessage(
    {
      type,
      messageId: originalMessageId ?? undefined,
      payload,
    },
    targetOrigin,
  );
}

function mergeSandboxPermissions(sandboxPermissions: string, defaultSandboxPermissions: string) {
  return [...new Set([...sandboxPermissions.split(' '), ...defaultSandboxPermissions.split(' ')])]
    .filter(Boolean)
    .map((permission) => permission.trim())
    .join(' ');
}
