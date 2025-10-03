import { useChat } from '@ai-sdk/react';
import { UIResourceRenderer, isUIResource } from '@mcp-ui/client';
import { UIActionMessage, UIResource } from '@fractal-mcp/protocol';
import { useCallback, useEffect } from 'react';


export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, append } = useChat({
    api: 'http://localhost:3001/api/chat'
  });

  // Forward UI action messages to the chat
  const handleUIActionMessage = useCallback(async (event: UIActionMessage) => {
    // console.log("handleUIActionMessage", event)
    switch (event.type) {

      // Sensible default: open link in new tab
      case 'link':
        window.open(event.payload.url, '_blank');
        break;

      // Sensible default: forward to agent backend
      case 'tool':
      case 'intent':
        append({
          role: 'data',
          content: JSON.stringify(event),
        })
        break;
      case 'notify':
      case 'prompt':
        append({
          role: 'data',
          content: JSON.stringify(event),
        })
        break;
      case 'resize':
        // intentionally left unhandled
      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }
  }, [append]);


  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div>
        <h1 className="text-xl font-semibold text-gray-800">Fractal Chat Example</h1>
            <p className="text-sm text-gray-500">Interactive components powered by Fractal</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-16">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🚀</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to Fractal Chat</h2>
              <p className="text-gray-500 mb-4">Experience interactive components that respond to your messages</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-700">
                  <strong>Try asking:</strong> "Create a button" or "Show me a form"
                </p>
              </div>
            </div>
          )}
          
        {messages.filter((message) => !["system", "data"].includes(message.role)).map((m, index)   => (
            <div
              key={index}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-medium mb-2 opacity-75">
                  <div className={`w-2 h-2 rounded-full ${m.role === 'user' ? 'bg-blue-400' : 'bg-green-400'}`}></div>
                  {m.role === 'user' ? 'You' : 'Fractal Assistant'}
                </div>
                <div className="leading-relaxed">
            {m.parts.map((part, i) => {
              if (part.type === 'text') return <span key={i}>{part.text}</span>;
              
              // Handle tool invocations
              if (part.type === 'tool-invocation') {
                const toolInvocation = (part as any).toolInvocation;
                if (toolInvocation.result != null && toolInvocation.result.content != null && toolInvocation.result.content.length && toolInvocation.result.content[0] != null) {
                  const contents = toolInvocation.result.content;
                  return (
                    <div key={i} className="inline-flex flex-row gap-3 mt-3 overflow-x-auto max-w-[90vw] -mx-4">
                      {contents.map((content: any, contentIdx: number) => {
                        if (isUIResource(content)) {
                          const uiResource = content as UIResource;
                          return (
                            <div key={`${i}-${contentIdx}`} className="flex-shrink-0 max-w-[33vw]">
                              <div style={{ display: 'inline-block' }}>
                                <UIResourceRenderer
                                  resource={uiResource.resource}
                                  onUIAction={handleUIActionMessage}
                                  htmlProps={{
                                    autoResizeIframe: true,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        } else {
                          return null;
                        }
                      })}
                    </div>
                  );
                }
                // Handle other tool calls
                // return <div></div>
                return (
                  <div key={i} className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">Tool:</span>
                      <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {toolInvocation.toolName}
                      </code>
                    </div>
                  </div>
                );
                
              }
              
              return null;
            })}
                </div>
              </div>
          </div>
        ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Send
            </button>
      </form>
        </div>
      </div>
    </div>
  );
}