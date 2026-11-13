import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'client',
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000' }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:       resolve(__dirname, 'client/index.html'),
        signup:     resolve(__dirname, 'client/pages/signup/signup.html'), // NEW
        dashboard:  resolve(__dirname, 'client/pages/admin/dashboard.html'),
        customers:  resolve(__dirname, 'client/pages/customers/index.html'),
        accounting: resolve(__dirname, 'client/pages/accounting/index.html'),
        marketing:  resolve(__dirname, 'client/pages/marketing/index.html'), // NEW
        attendance: resolve(__dirname, 'client/pages/attendance/index.html'),
        leave: resolve(__dirname, 'client/pages/leave/index.html'),
        tasks: resolve(__dirname, 'client/pages/tasks/index.html'),
      }
    }
  }
});