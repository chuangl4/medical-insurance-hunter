import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // In development the API runs separately; the browser talks to it through Vite so cookies stay same-origin.
  server: { proxy: { '/api': `http://localhost:${process.env.PORT ?? 3001}` } },
});
