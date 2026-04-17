import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        submit: resolve(__dirname, 'submit.html'),
        admin: resolve(__dirname, 'admin.html'),
        graph: resolve(__dirname, 'graph.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  plugins: [
    {
      name: 'rewrite-routes',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (/^\/submit\/[^/]+\/?$/.test(req.url ?? '')) req.url = '/submit.html';
          if (/^\/graph\/[^/]+\/?$/.test(req.url ?? '')) req.url = '/graph.html';
          next();
        });
      },
    },
  ],
});
