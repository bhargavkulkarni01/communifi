import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

const api = 'http://127.0.0.1:8000';
// Every backend route prefix the React app calls. Add new ones here.
const routes = ['/auth', '/me', '/issues', '/config', '/uploads', '/summary', '/stats', '/notifications',
  '/ai', '/alerts', '/score', '/predictions', '/admin'];

export default defineConfig({
  base: '/app/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(routes.map(p => [p, api])),
  },
});
