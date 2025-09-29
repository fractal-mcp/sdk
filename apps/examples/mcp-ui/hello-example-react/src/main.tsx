import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Router from './Router';
import { initServerUIMessenger } from '@fractal-mcp/server-ui-react';

const bootstrap = async (Component: React.ComponentType) => {
  await initServerUIMessenger();
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Component />);
};

bootstrap(Router);


