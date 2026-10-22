import { createLogger, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// در ترمینال تیرهٔ ویندوز کد رنگ dim سیاه چاپ می‌شود و «ready in» دیده نمی‌شود.
const logger = createLogger();
const printInfo = logger.info.bind(logger);
logger.info = (msg, options) => {
  if (typeof msg === 'string') {
    msg = msg.replaceAll('\u001b[2m', '\u001b[37m');
  }
  printInfo(msg, options);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});