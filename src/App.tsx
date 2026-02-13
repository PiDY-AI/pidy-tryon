import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { AuthGuard } from "./components/AuthGuard";
import { useHideBrokenImages } from "./hooks/useHideBrokenImages";
import DemoIndex from "./demo/pages/DemoIndex";
import ProductDetail from "./demo/pages/ProductDetail";

const TestRunnerPage = lazy(() => import("./testing/pages/TestRunnerPage"));
const PredictionsPage = lazy(() => import("./testing/pages/PredictionsPage"));
const PredictionDetailPage = lazy(() => import("./testing/pages/PredictionDetailPage"));
const GenerationDetailPage = lazy(() => import("./testing/pages/GenerationDetailPage"));
const ComparePredictionsPage = lazy(() => import("./testing/pages/ComparePredictionsPage"));

const queryClient = new QueryClient();

const App = () => {
  useHideBrokenImages();

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <AuthGuard>
                    <Index />
                  </AuthGuard>
                }
              />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Demo Routes - No Auth Required */}
              <Route path="/demo" element={<DemoIndex />} />
              <Route path="/demo/product/:id" element={<ProductDetail />} />
              {/* Testing Routes - Auth Required, Lazy Loaded */}
              <Route path="/testing" element={<AuthGuard><Suspense fallback={null}><TestRunnerPage /></Suspense></AuthGuard>} />
              <Route path="/testing/predictions" element={<AuthGuard><Suspense fallback={null}><PredictionsPage /></Suspense></AuthGuard>} />
              <Route path="/testing/predictions/compare" element={<AuthGuard><Suspense fallback={null}><ComparePredictionsPage /></Suspense></AuthGuard>} />
              <Route path="/testing/predictions/:id" element={<AuthGuard><Suspense fallback={null}><PredictionDetailPage /></Suspense></AuthGuard>} />
              <Route path="/testing/predictions/:predictionId/generations/:generationId" element={<AuthGuard><Suspense fallback={null}><GenerationDetailPage /></Suspense></AuthGuard>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
