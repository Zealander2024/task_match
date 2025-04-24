import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    '__WS_TOKEN__': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY)
  },
  resolve: {
    alias: {
      './runtimeConfig': './runtimeConfig.browser',
    }
  },
  optimizeDeps: {
    include: [
      '@supabase/supabase-js',
      '@supabase/postgrest-js',
      '@supabase/realtime-js',
      'emoji-mart',
      '@emoji-mart/react',
      '@emoji-mart/data'
    ],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      external: ['emoji-mart'],
      output: {
        manualChunks: {
          'supabase': ['@supabase/supabase-js'],
          'emoji-mart': ['@emoji-mart/react', '@emoji-mart/data', 'emoji-mart'],
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom'
          ]
        }
      }
    }
  }
})











