import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false, // Prevent vite from obscuring Rust errors
  server: {
    port: 3000,
    strictPort: true,
    host: host || false,
    hmr: host 
      ? { protocol: 'ws', host, port: 1431 }
      : undefined,
    // Only use proxy when NOT in Tauri mode
    proxy: host ? {} : {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  }
});
