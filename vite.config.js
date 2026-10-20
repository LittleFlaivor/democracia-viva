import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/** Reescribe /admin → /admin.html en el servidor de desarrollo y en `vite preview`. */
const adminRoute = () => {
  const mw = (req, _res, next) => {
    if (req.url && /^\/admin\/?(\?.*)?$/.test(req.url)) req.url = '/admin.html';
    next();
  };
  return {
    name: 'dv-admin-route',
    configureServer: (s) => s.middlewares.use(mw),
    configurePreviewServer: (s) => s.middlewares.use(mw),
  };
};

export default defineConfig({
  plugins: [adminRoute()],
  build: {
    target: 'es2022', // BigInt + top-level await usados por el núcleo criptográfico
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), admin: resolve(import.meta.dirname, 'admin.html') },
    },
  },
});
