import React from 'react';
import './index.css'
import { useFractal } from '@fractal-mcp/composer';

export default function McpUiExample() {
  const { navigate, data, error } = useFractal<any>();

  // Container classes for consistent styling
  const containerClasses = "max-w-lg mx-auto p-8 bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300";

  if (error) {
    return (
      <div className={containerClasses}>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Error</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-red-600 rounded-full"></div>
        </div>
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
            <span className="text-lg font-medium text-gray-700">Error:</span>
            <span className="text-xl font-bold text-red-600">{error.message}</span>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={containerClasses}>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Number Squared</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
        </div>
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-gray-500">
            <span className="text-lg font-medium text-gray-700">Status:</span>
            <span className="text-xl font-bold text-gray-600">No data available</span>
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
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Number Squared</h2>
        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
          <span className="text-lg font-medium text-gray-700">Input:</span>
          <span className="text-xl font-bold text-blue-600">{num}</span>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-purple-500">
          <span className="text-lg font-medium text-gray-700">Result:</span>
          <span className="text-xl font-bold text-purple-600">{num} × {num} = {result}</span>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
          <p className="text-sm text-gray-600 leading-relaxed">
            This is an example MCP UI component that displays the result of squaring a number. 
            The component demonstrates clean styling and responsive design principles.
          </p>
        </div>
      </div>
    </div>
  );
}