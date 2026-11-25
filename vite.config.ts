import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // In development the API runs separately; the browser talks to it through Vite so cookies stay same-origin.
  server: { proxy: { '/api': `http://127.0.0.1:${process.env.PORT ?? 3002}` } },
});
