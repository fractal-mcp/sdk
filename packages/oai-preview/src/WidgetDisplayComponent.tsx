import { useEffect, useRef, useState } from "react";
import { 
  DisplayMode, 
  Theme, 
  SafeArea, 
  UserAgent 
} from "@fractal-mcp/oai-types";

export interface WidgetPreviewComponentProps {
  htmlSnippet: string;
  toolInput?: Record<string, any>;
  toolOutput?: any;
  toolResponseMetadata?: any;
  toolId?: string;
  onToolCall?: (toolName: string, params: Record<string, any>) => Promise<any>;
  onSendFollowup?: (message: string) => void;
  onSetWidgetState?: (state: any) => void;
  onOpenExternal?: (href: string) => void;
  onRequestDisplayMode?: (mode: DisplayMode) => void;
  className?: string;
  
  // Configurable globals
  displayMode?: DisplayMode;
  maxHeight?: number;
  theme?: Theme;
  locale?: string;
  safeArea?: SafeArea;
  userAgent?: UserAgent;
}

/**
 * Preview component that renders App widgets.
 * In OpenAI Apps, App widgets are fetched via a remote tool call to an MCP server.
 * This component is responsible for rendering the widget's html snippet in an iframe, and for forwarding events to the parent.
 * @param htmlSnippet - The HTML snippet to render. Expected to have a root div, a script tag containing the user's js, and possibly styles. Either way it is expected to fit inside of a <body> tag, and it expects to have access to window.openai and window.webplus APIs.
 * @param toolInput - The input to the tool.
 * @param toolOutput - The output of the tool.
 * @param toolId - The id of the tool.
 * @param onToolCall - The callback to call the tool.
 * @param toolResponseMetadata - The response metadata from the tool.
 * @param onSendFollowup - The callback to send a followup message.
 * @param onSetWidgetState - The callback to set the widget state.
 * @param onRequestDisplayMode - The callback for display mode change requests.
 * @param onOpenExternal - The callback to handle external URL navigation.
 * @param className - The class name to apply to the component.
 * @param displayMode - The display mode (inline, pip, fullscreen). Defaults to "inline".
 * @param maxHeight - The maximum height constraint in pixels. Defaults to 600.
 * @param theme - The theme (light or dark). Defaults to "light".
 * @param locale - The locale string. Defaults to "en-US".
 * @param safeArea - The safe area insets for mobile. Defaults to zero insets.
 * @param userAgent - The user agent info including device and capabilities.
 */
export function WidgetPreviewComponent({
  htmlSnippet,
  toolInput = {},
  toolOutput = null,
  toolResponseMetadata = null,
  toolId = `preview-${Date.now()}`,
  onToolCall,
  onSendFollowup,
  onSetWidgetState,
  onRequestDisplayMode,
  onOpenExternal,
  className = "",
  
  // Configurable globals with sensible defaults
  displayMode = "inline",
  maxHeight = 600,
  theme = "light",
  locale = "en-US",
  safeArea = { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
  userAgent = { 
    device: { type: "desktop" }, 
    capabilities: { hover: true, touch: false }
  },
}: WidgetPreviewComponentProps) {

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const widgetStateKey = `openai-widget-state:${toolId}`;

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEventLog((prev) => [...prev.slice(-19), `[${timestamp}] ${message}`]); // Keep last 20
  };

  // Generate the API script that provides window.openai and window.webplus
  const generateApiScript = () => {
    return `
      <script>
        (function() {
          'use strict';

          const openaiAPI = {
            toolInput: ${JSON.stringify(toolInput)},
            toolOutput: ${JSON.stringify(toolOutput)},
            toolResponseMetadata: ${JSON.stringify(toolResponseMetadata)},
            displayMode: ${JSON.stringify(displayMode)},
            maxHeight: ${maxHeight},
            theme: ${JSON.stringify(theme)},
            locale: ${JSON.stringify(locale)},
            safeArea: ${JSON.stringify(safeArea)},
            userAgent: ${JSON.stringify(userAgent)},
            widgetState: null,

            async setWidgetState(state) {
              this.widgetState = state;
              try {
                localStorage.setItem(${JSON.stringify(
                  widgetStateKey
                )}, JSON.stringify(state));
              } catch (err) {
                console.error('[OpenAI Widget] Failed to save widget state:', err);
              }
              window.parent.postMessage({
                type: 'openai:setWidgetState',
                toolId: ${JSON.stringify(toolId)},
                state
              }, '*');
            },

            async callTool(toolName, params = {}) {
              return new Promise((resolve, reject) => {
                const requestId = \`tool_\${Date.now()}_\${Math.random()}\`;
                const handler = (event) => {
                  if (event.data.type === 'openai:callTool:response' &&
                      event.data.requestId === requestId) {
                    window.removeEventListener('message', handler);
                    if (event.data.error) {
                      reject(new Error(event.data.error));
                    } else {
                      resolve(event.data.result);
                    }
                  }
                };
                window.addEventListener('message', handler);
                window.parent.postMessage({
                  type: 'openai:callTool',
                  requestId,
                  toolName,
                  params
                }, '*');
                setTimeout(() => {
                  window.removeEventListener('message', handler);
                  reject(new Error('Tool call timeout'));
                }, 30000);
              });
            },

            async sendFollowupTurn(message) {
              const payload = typeof message === 'string'
                ? { prompt: message }
                : message;
              window.parent.postMessage({
                type: 'openai:sendFollowup',
                message: payload.prompt || payload
              }, '*');
            },

            async requestDisplayMode(options = {}) {
              const mode = options.mode || 'inline';
              this.displayMode = mode;
              window.parent.postMessage({
                type: 'openai:requestDisplayMode',
                mode
              }, '*');
              return { mode };
            },

            async sendFollowUpMessage(args) {
              const prompt = typeof args === 'string' ? args : (args?.prompt || '');
              return this.sendFollowupTurn(prompt);
            },

            openExternal(payload) {
              if (payload?.href) {
                window.parent.postMessage({
                  type: 'openai:openExternal',
                  href: payload.href
                }, '*');
                // In a real browser environment, this would open the URL
                window.open(payload.href, '_blank');
              }
            }
          };

          // Define window.openai as writable property (to match OpenAI's actual behavior)
          Object.defineProperty(window, 'openai', {
            value: openaiAPI,
            writable: true,
            configurable: true,
            enumerable: true
          });

          // Define window.webplus as writable property
          Object.defineProperty(window, 'webplus', {
            value: openaiAPI,
            writable: true,
            configurable: true,
            enumerable: true
          });

          // Dispatch events for both legacy (webplus) and official (openai) APIs
          setTimeout(() => {
            try {
              // Legacy webplus event
              const webplusGlobalsEvent = new CustomEvent('webplus:set_globals', {
                detail: {
                  globals: {
                    theme: openaiAPI.theme,
                    displayMode: openaiAPI.displayMode,
                    maxHeight: openaiAPI.maxHeight,
                    safeArea: openaiAPI.safeArea,
                    userAgent: openaiAPI.userAgent,
                    toolInput: openaiAPI.toolInput,
                    toolOutput: openaiAPI.toolOutput,
                    widgetState: openaiAPI.widgetState
                  }
                }
              });
              window.dispatchEvent(webplusGlobalsEvent);

              // Official OpenAI Apps SDK event
              const openaiGlobalsEvent = new CustomEvent('openai:set_globals', {
                detail: {
                  globals: {
                    theme: openaiAPI.theme,
                    userAgent: openaiAPI.userAgent,
                    locale: openaiAPI.locale,
                    maxHeight: openaiAPI.maxHeight,
                    displayMode: openaiAPI.displayMode,
                    safeArea: openaiAPI.safeArea,
                    toolInput: openaiAPI.toolInput,
                    toolOutput: openaiAPI.toolOutput,
                    toolResponseMetadata: openaiAPI.toolResponseMetadata,
                    widgetState: openaiAPI.widgetState
                  }
                }
              });
              window.dispatchEvent(openaiGlobalsEvent);
            } catch (err) {
              console.error('[OpenAI Widget] Failed to dispatch globals event:', err);
            }
          }, 0);

          // Dispatch update events when toolInput or toolOutput changes
          setTimeout(() => {
            try {
              // Legacy webplus update event
              const webplusUpdateEvent = new CustomEvent('webplus:set_globals', {
                detail: {
                  globals: {
                    toolInput: openaiAPI.toolInput,
                    toolOutput: openaiAPI.toolOutput,
                    toolResponseMetadata: openaiAPI.toolResponseMetadata,
                  }
                }
              });
              window.dispatchEvent(webplusUpdateEvent);

              // Official OpenAI Apps SDK update event
              const openaiUpdateEvent = new CustomEvent('openai:set_globals', {
                detail: {
                  globals: {
                    toolInput: openaiAPI.toolInput,
                    toolOutput: openaiAPI.toolOutput,
                    toolResponseMetadata: openaiAPI.toolResponseMetadata,
                  }
                }
              });
              window.dispatchEvent(openaiUpdateEvent);
            } catch (err) {
              console.error('[OpenAI Widget] Failed to dispatch update event:', err);
            }
          }, 100); // Slight delay to ensure hooks are set up

          // Restore widget state from localStorage
          setTimeout(() => {
            try {
              const stored = localStorage.getItem(${JSON.stringify(
                widgetStateKey
              )});
              if (stored && window.openai) {
                window.openai.widgetState = JSON.parse(stored);
              }
            } catch (err) {
              console.error('[OpenAI Widget] Failed to restore widget state:', err);
            }
          }, 0);
        })();
      </script>
    `;
  };

  // Generate full HTML document with API script and snippet
  const generateFullHtml = () => {
    const apiScript = generateApiScript();

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="/">
  ${apiScript}
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>
</head>
<body>
  ${htmlSnippet}
</body>
</html>`;
  };

  // Handle postMessage communication with iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (
        !iframeRef.current ||
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }

      // Log ALL incoming events
      console.log("[Preview] Received event from iframe:", event.data);

      switch (event.data.type) {
        case "openai:setWidgetState":
          console.log("[Preview] setWidgetState:", event.data.state);
          addLog(
            `setWidgetState: ${JSON.stringify(event.data.state).substring(
              0,
              60
            )}...`
          );
          try {
            localStorage.setItem(
              widgetStateKey,
              JSON.stringify(event.data.state)
            );
          } catch (err) {
            console.error("[Preview] Failed to save widget state:", err);
          }
          if (onSetWidgetState) {
            onSetWidgetState(event.data.state);
          }
          break;

        case "openai:callTool":
          console.log(
            "[Preview] callTool:",
            event.data.toolName,
            event.data.params
          );
          addLog(`callTool: ${event.data.toolName}`);
          if (onToolCall) {
            try {
              const result = await onToolCall(
                event.data.toolName,
                event.data.params || {}
              );
              console.log("[Preview] callTool result:", result);
              addLog(`↳ tool "${event.data.toolName}" succeeded`);
              iframeRef.current?.contentWindow?.postMessage(
                {
                  type: "openai:callTool:response",
                  requestId: event.data.requestId,
                  result: result,
                },
                "*"
              );
            } catch (err) {
              console.error("[Preview] callTool error:", err);
              addLog(`↳ tool "${event.data.toolName}" failed`);
              iframeRef.current?.contentWindow?.postMessage(
                {
                  type: "openai:callTool:response",
                  requestId: event.data.requestId,
                  error: err instanceof Error ? err.message : "Unknown error",
                },
                "*"
              );
            }
          }
          break;

        case "openai:sendFollowup":
          console.log("[Preview] sendFollowup:", event.data.message);
          addLog(`sendFollowup: ${event.data.message.substring(0, 50)}...`);
          if (onSendFollowup) {
            onSendFollowup(event.data.message);
          }
          break;

        case "openai:requestDisplayMode":
          console.log("[Preview] requestDisplayMode:", event.data.mode);
          addLog(`requestDisplayMode: ${event.data.mode}`);
          if (onRequestDisplayMode) {
            onRequestDisplayMode(event.data.mode);
          }
          // Handle display mode requests if needed
          break;

        case "openai:openExternal":
          console.log("[Preview] openExternal:", event.data.href);
          addLog(`openExternal: ${event.data.href}`);
          if (onOpenExternal) {
            onOpenExternal(event.data.href);
          } else if (event.data.href) {
            // Default behavior: open in new tab
            window.open(event.data.href, '_blank');
          }
          break;

        default:
          console.log("[Preview] Unknown event type:", event.data.type);
          addLog(`unknown event: ${event.data.type}`);
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    const handleLoad = () => {
      setIsReady(true);
      setError(null);
    };

    const handleError = () => {
      setError("Failed to load preview");
    };

    const iframe = iframeRef.current;
    iframe?.addEventListener("load", handleLoad);
    iframe?.addEventListener("error", handleError as any);

    return () => {
      window.removeEventListener("message", handleMessage);
      iframe?.removeEventListener("load", handleLoad);
      iframe?.removeEventListener("error", handleError as any);
    };
  }, [widgetStateKey, onToolCall, onSendFollowup, onSetWidgetState, onOpenExternal, onRequestDisplayMode, displayMode, maxHeight, theme, locale, safeArea, userAgent]);

  return (
    <div className={className}>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2">
          <p className="text-sm text-red-600">Failed to load widget: {error}</p>
        </div>
      )}

      {!isReady && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
          <p className="text-sm text-blue-600">Loading widget...</p>
        </div>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={generateFullHtml()}
        className="w-full border rounded-md bg-white"
        style={{
          height: "400px",
          border: "1px solid rgba(128, 128, 128, 0.3)",
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        title="OpenAI Widget Display"
        allow="web-share"
      />
    </div>
  );
}
