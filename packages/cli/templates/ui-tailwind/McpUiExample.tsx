import React from 'react';

interface McpUiExampleProps {
  num: number;
  result: number;
}

export default function McpUiExample({ num, result }: McpUiExampleProps) {
  return (
    <div className="max-w-lg mx-auto p-8 bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
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