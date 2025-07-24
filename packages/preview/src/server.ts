#!/usr/bin/env node
import { startServer } from './index.js';

const port = parseInt(process.env.PORT || '3000');

console.log('Starting Fractal Vite development server...');

startServer(port)
  .then((server) => {
    console.log(`✅ Vite dev server started successfully!`);
    
    // Handle graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down server...');
      server.close().then(() => {
        console.log('Server stopped');
        process.exit(0);
      });
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }); 