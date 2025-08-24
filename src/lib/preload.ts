// Preload critical resources for better performance
export const preloadCriticalResources = () => {
  // Preload FFmpeg core files
  const ffmpegCoreURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js';
  const ffmpegWasmURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm';
  
  // Create link elements for preloading
  const preloadScript = document.createElement('link');
  preloadScript.rel = 'preload';
  preloadScript.href = ffmpegCoreURL;
  preloadScript.as = 'script';
  document.head.appendChild(preloadScript);
  
  const preloadWasm = document.createElement('link');
  preloadWasm.rel = 'preload';
  preloadWasm.href = ffmpegWasmURL;
  preloadWasm.as = 'fetch';
  preloadWasm.crossOrigin = 'anonymous';
  document.head.appendChild(preloadWasm);
  
  console.log('🚀 Critical resources preloaded');
};

// Preload lazy components when user is likely to need them
export const preloadLazyComponents = () => {
  // Preload heavy components after initial load
  setTimeout(() => {
    import('@/components/VideoProcessor');
    import('@/components/WaveformVisualizer'); 
    import('@/components/BeatTimeline');
    console.log('📦 Heavy components preloaded');
  }, 2000);
};
