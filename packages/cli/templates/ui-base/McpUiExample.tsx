import React from 'react';
import './index.css';
import { useFractal } from '@fractal-mcp/composer';

export default function McpUiExample() {
  const { navigate, data, error } = useFractal<any>();

  // Container classes for consistent styling
  const containerClasses = "mcp-container";

  if (error) {
    return (
      <div className={containerClasses}>
        <div className="mcp-header">
          <h2 className="mcp-title">Error</h2>
          <div className="mcp-title-underline"></div>
        </div>
        <div className="mcp-content">
          <div className="mcp-result-row">
            <span className="mcp-label">Error:</span>
            <span className="mcp-value" style={{ color: 'red' }}>{error.message}</span>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={containerClasses}>
        <div className="mcp-header">
          <h2 className="mcp-title">Number Squared</h2>
          <div className="mcp-title-underline"></div>
        </div>
        <div className="mcp-content">
          <div className="mcp-result-row">
            <span className="mcp-label">Status:</span>
            <span className="mcp-value">No data available</span>
          </div>
        </div>
      </div>
    );
  }

  // Extract data - assuming the MCP tool returns an object with num and result
  const num = data.num || data.input || 0;
  const result = data.result || data.output || num * num;

  return (
    <div className={containerClasses}>
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