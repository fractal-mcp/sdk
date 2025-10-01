import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { initUIMessenger } from '@fractal-mcp/server-ui-react';

const bootstrap = async (Component: React.ComponentType) => {

  // Calling this during bootstrap ensures that the client is ready before the app mounts.
  await initUIMessenger();

  // Render the app as usual.
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Component />);

};

bootstrap(App);
