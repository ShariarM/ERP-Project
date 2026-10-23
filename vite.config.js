import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const here = (p) => resolve(process.cwd(), p);

// Vite root is /client. Every HTML page is listed so "npm run build" bundles them all.
export default defineConfig({
  root: 'client',
  css: {
    postcss: { plugins: [tailwindcss(here('tailwind.config.js')), autoprefixer()] },
  },
  server: { port: 5173, open: true },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        login: here('client/index.html'),
        admin: here('client/pages/admin/dashboard.html'),
        customers: here('client/pages/customers/index.html'),
        accounting: here('client/pages/accounting/index.html'),
      },
    },
  },
});
