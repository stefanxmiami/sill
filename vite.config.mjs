import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so file:// loading works in the packaged app (loadFile in main.js)
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    // bind IPv4 explicitly: default vite binds [::1] only, which the
    // `wait-on tcp:127.0.0.1:5173` gate in `npm run dev` can never reach
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
