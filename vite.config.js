const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

const api = 'http://127.0.0.1:5088';

module.exports = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/panels/driver'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 4179,
    proxy: {
      '/api': { target: api, changeOrigin: true },
      '/uploads': { target: api, changeOrigin: true },
      '/ws': { target: api.replace('http', 'ws'), ws: true },
    },
  },
});
