import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Function to start the Vite development server programmatically
export async function startServer(port = 3000) {
    try {
        // Create Vite dev server with existing config
        const server = await createViteServer({
            // Use the existing vite.config.ts file
            configFile: path.resolve(__dirname, '../vite.config.ts'),
            root: path.resolve(__dirname, '..'),
            server: {
                port,
                host: true
            }
        });
        // Start the server
        await server.listen();
        // Print URLs like the CLI does
        server.printUrls();
        return server;
    }
    catch (error) {
        console.error('Failed to start Vite dev server:', error);
        throw error;
    }
}
// Default export for backward compatibility
export default { startServer };
