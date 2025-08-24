import { lazy } from 'react';

// Lazy load heavy components
export const VideoProcessor = lazy(() => import('@/components/VideoProcessor'));
export const WaveformVisualizer = lazy(() => import('@/components/WaveformVisualizer'));
export const BeatTimeline = lazy(() => import('@/components/BeatTimeline'));
export const HashtagGenerator = lazy(() => import('@/components/HashtagGenerator'));

// Lazy load pages
export const Editor = lazy(() => import('@/pages/Editor'));
export const Auth = lazy(() => import('@/pages/Auth'));
