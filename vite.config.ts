import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          fabric: ['fabric'],
          pdf: ['pdfjs-dist'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['fabric', 'qrcode', 'pdfjs-dist'],
  },
})
