import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://vdahbmqcowrinmvguurh.supabase.co'),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkYWhibXFjb3dyaW5tdmd1dXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjUyMzcsImV4cCI6MjA5MDQ0MTIzN30.XsYfHIWSqgrhF4AWY-NKqrTMqkLb8qv3UtYU6KamZ5A'),
  }
})
