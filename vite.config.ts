import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  base: './',
  server: {
    host: '::',
    port: 8080,
    headers: {
      // Only add these headers when needed for video processing
      // 'Cross-Origin-Opener-Policy': 'same-origin',
      // 'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('react') && !id.includes('router')) {
            return 'vendor-react';
          }
          if (id.includes('react-router')) {
            return 'vendor-router';  
          }
          if (id.includes('@radix-ui') || id.includes('lucide-react')) {
            return 'vendor-ui';
          }
          if (id.includes('@ffmpeg')) {
            return 'vendor-ffmpeg';
          }
          if (id.includes('firebase')) {
            return 'vendor-firebase';
          }
          if (id.includes('openai')) {
            return 'vendor-ai';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          
          // Group components by functionality
          if (id.includes('VideoProcessor') || id.includes('videoProcessor')) {
            return 'video-processing';
          }
          if (id.includes('WaveformVisualizer') || id.includes('BeatTimeline') || id.includes('beatDetection')) {
            return 'audio-visualization';
          }
          if (id.includes('HashtagGenerator') || id.includes('openai')) {
            return 'ai-features';
          }
          
          // Utils and common
          if (id.includes('src/lib') || id.includes('src/hooks')) {
            return 'utils';
          }
        }
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    include: [
      'react', 
      'react-dom',
      'lucide-react'
    ]
  },
  worker: {
    format: 'es'
  }
});
