import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Router from './Router';
import { initUIMessenger } from '@fractal-mcp/server-ui-react';

const bootstrap = async (Component: React.ComponentType) => {
  await initUIMessenger();
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Component />);
};

bootstrap(Router);


