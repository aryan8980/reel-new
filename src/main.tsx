import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { preloadCriticalResources, preloadLazyComponents } from '@/lib/preload'

// Start preloading critical resources immediately
preloadCriticalResources();

createRoot(document.getElementById("root")!).render(<App />);

// Preload heavy components after app starts
preloadLazyComponents();
