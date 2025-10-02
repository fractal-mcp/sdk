import { useState } from 'react';
import { UIResourceRenderer, isUIResource } from '@mcp-ui/client';
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
  return (
    <div className="card">
      <h1>UIResourceRenderer example</h1>

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
      <UIResourceRenderer
        resource={resource.resource} 
        onUIAction={onUIAction} 
        htmlProps={{
          autoResizeIframe: true
        }}
      />
    </div>
  );
}



// http://localhost:5173/?iframeUrl=http%3A%2F%2Flocalhost%3A5174%2Fgoodbye