import React from 'react';
import ReactDOM from 'react-dom/client';
import HelloWidget from './Component';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <HelloWidget />
    </React.StrictMode>
  );
}

