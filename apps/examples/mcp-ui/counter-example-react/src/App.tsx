import { useEffect, useState } from 'react';
import { useUIMessenger } from '@fractal-mcp/server-ui-react';

export default function App() {
  const [defaultValue, setDefaultValue] = useState(0);
  const [count, setCount] = useState(0);
  const {renderData} = useUIMessenger();

  const initialCount = (renderData && renderData.count) ? renderData.count as number : 0

  useEffect(() => {
    setCount(initialCount)
    setDefaultValue(initialCount)
  }, [initialCount])

  if (!renderData) {
    return <div></div>
  }
  
  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '20px',
      width: '240px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      border: '1px solid #e5e7eb'
    }}>
      <div> {JSON.stringify(renderData)} </div>
      <div style={{
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '18px', 
          color: '#1f2937',
          fontWeight: '600'
        }}>
          Counter Widget
        </h2>
        <div style={{
          background: '#3b82f6',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '24px',
          fontWeight: 'bold',
          display: 'inline-block',
          minWidth: '50px'
        }}>
          {count}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
        <button
          onClick={() => setCount(c => Math.max(0, c - 1))}
          disabled={count === 0}
          style={{
            background: count === 0 ? '#9ca3af' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '18px',
            cursor: count === 0 ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          −
        </button>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '18px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          +
        </button>
      </div>
      
      {count > 0 && (
        <button
          onClick={() => setCount(defaultValue)}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            width: '100%',
            fontWeight: '500'
          }}
        >
          Reset
        </button>
      )}
    </div>
  );
}


