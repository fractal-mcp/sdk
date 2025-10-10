import React from 'react';
import ReactDOM from 'react-dom/client';
import HelloWidget from './Component';

console.log("Rendering HelloWidget");
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HelloWidget />
  </React.StrictMode>
)

