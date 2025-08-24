import "./lib/firebase"; // This initializes Firebase
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Account from "./pages/Account";
import StorageSetup from "./components/StorageSetup";

// Lazy load heavy components
import { Editor, Auth } from "@/components/LazyComponents";

const queryClient = new QueryClient();

// Loading fallback component
const LoadingFallback = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex items-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-lg">{message}</span>
    </div>
  </div>
);

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ConnectionStatus />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route 
              path="/auth" 
              element={
                <Suspense fallback={<LoadingFallback message="Loading Authentication..." />}>
                  <Auth />
                </Suspense>
              } 
            />
            <Route 
              path="/editor" 
              element={
                <Suspense fallback={<LoadingFallback message="Loading Video Editor..." />}>
                  <Editor />
                </Suspense>
              } 
            />
            <Route path="/account" element={<Account />} />
            <Route path="/storage-setup" element={<StorageSetup />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
