import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function practiceRoutePlugin() {
  return {
    name: 'practice-route',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/practice' || req.url === '/practice/') {
          const file = path.resolve(__dirname, 'public/practice/index.html');
          res.setHeader('Content-Type', 'text/html');
          res.end(fs.readFileSync(file));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), practiceRoutePlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
