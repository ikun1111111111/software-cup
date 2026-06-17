import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const vrmMimeTypePlugin = (): Plugin => ({
  name: 'vrm-mime-type',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.endsWith('.vrm')) {
        res.setHeader('Content-Type', 'model/gltf-binary');
      }
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.endsWith('.vrm')) {
        res.setHeader('Content-Type', 'model/gltf-binary');
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), vrmMimeTypePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // pixi-live2d-display v0.4 imports @pixi/* — map to pixi.js internal sub-modules
      '@pixi/utils': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/utils'),
      '@pixi/math': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/math'),
      '@pixi/core': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/core'),
      '@pixi/display': path.resolve(__dirname, 'node_modules/pixi.js/node_modules/@pixi/display'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
});
