import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    commonjsOptions: {
      include: [/pdfjs-dist/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'pdf-vendor': ['pdfjs-dist']
        }
      }
    }
  },
  worker: {
    format: 'es'
  }
})





