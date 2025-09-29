import { useState } from 'react';
import { FractalUIResourceRenderer } from '@fractal-mcp/client-ui-react';
import { getMessageRouter } from '@fractal-mcp/client-ui-shared';
import { createUIResource } from '@mcp-ui/server';
import { UIActionMessage } from '@fractal-mcp/protocol';

// Read iframe URL from query parameters
const getIframeUrlFromQuery = (): string => {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedUrl = urlParams.get('iframeUrl');
  
  if (encodedUrl) {
    try {
      return decodeURIComponent(encodedUrl);
    } catch (error) {
      console.error('Failed to decode iframeUrl parameter:', error);
    }
  }
  
  throw new Error('No iframeUrl parameter found');
};

const resource = createUIResource({
  uri: 'ui://greeting/1',
  content: { type: 'externalUrl', iframeUrl: getIframeUrlFromQuery() },
  encoding: 'text',
  uiMetadata: {
    'initial-render-data': {count: 6}
  }
});

export default function App() {
  const COMPONENT_ID = 'example-renderer';
  const [domResult, setDomResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const onUIAction = async (action: UIActionMessage) => {
    console.log(`called onUIAction: ${action.type}: ${JSON.stringify(action.payload)}`);
    return { success: true };
  }

  const iframeRenderData = resource._meta && resource._meta["mcpui.dev/ui-initial-render-data"] as Record<string, unknown>

  const handleQueryDom = async () => {
    setLoading(true);
    try {
      const res = await getMessageRouter().request({
        componentId: COMPONENT_ID,
        type: 'queryDom',
        payload: {}
      });
      setDomResult(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
    } catch (e: any) {
      setDomResult(`Error: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>FractalUIResourceRenderer example</h1>
      <div style={{ margin: '12px 0', display: 'flex', gap: 8 }}>
        <button onClick={handleQueryDom} disabled={loading}>
          {loading ? 'Querying DOM…' : 'Query DOM'}
        </button>
      </div>
      <div style={{ margin: '12px 0' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>queryDom result</label>
        <textarea
          value={domResult}
          readOnly
          rows={12}
          style={{ width: '100%', fontFamily: 'monospace' }}
          placeholder="Press “Query DOM” to fetch the current iframe HTML"
        />
      </div>
      <FractalUIResourceRenderer
        resource={resource.resource} 
        onUIAction={onUIAction} 
        autoResizeIframe={true}
        iframeRenderData={iframeRenderData}
        componentId={COMPONENT_ID}
      />
    </div>
  );
}



// http://localhost:5173/?iframeUrl=http%3A%2F%2Flocalhost%3A5174%2Fgoodbye