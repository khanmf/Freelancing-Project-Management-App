import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  resolve: {
    alias: {
      // FIX: __dirname is not available in an ES module context.
      // path.resolve interprets './src' relative to the current working directory,
      // which is the project root when running Vite.
      '@': path.resolve('./src'),
    },
  },
});