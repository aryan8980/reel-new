// Preload critical resources for better performance
export const preloadCriticalResources = () => {
  // FFmpeg preloading temporarily disabled while fixing issues
  console.log('🚀 Critical resources preloaded (FFmpeg preload disabled)');
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
