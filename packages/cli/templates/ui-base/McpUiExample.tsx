import React from 'react';
import './index.css';

interface McpUiExampleProps {
  num: number;
  result: number;
}

export default function McpUiExample({ num, result }: McpUiExampleProps) {
  return (
    <div className="mcp-container">
      <div className="mcp-header">
        <h2 className="mcp-title">Number Squared</h2>
        <div className="mcp-title-underline"></div>
      </div>
      
      <div className="mcp-content">
        <div className="mcp-input-row">
          <span className="mcp-label">Input:</span>
          <span className="mcp-value mcp-input-value">{num}</span>
        </div>
        
        <div className="mcp-result-row">
          <span className="mcp-label">Result:</span>
          <span className="mcp-value mcp-result-value">{num} × {num} = {result}</span>
        </div>
      </div>
      
      <div className="mcp-info-box">
        <div className="mcp-info-dot"></div>
        <p className="mcp-info-text">
          This is an example MCP UI component that displays the result of squaring a number. 
          The component demonstrates clean styling and responsive design principles.
        </p>
      </div>
    </div>
  );
}