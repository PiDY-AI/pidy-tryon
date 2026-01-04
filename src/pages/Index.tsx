import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ProductCard } from '@/components/ProductCard';
import { TryOnResult } from '@/components/TryOnResult';
import { TryOnLoading } from '@/components/TryOnLoading';
import { useMeasurements } from '@/hooks/useMeasurements';
import { useTryOn } from '@/hooks/useTryOn';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { calculateSize } from '@/utils/sizeCalculator';
import { Product, TryOnResult as TryOnResultType } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Sparkles, User, ShoppingBag, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId');
  const embedMode = searchParams.get('embed') === 'true' || !!productId;
  
  const { measurements, isLoading: isMeasurementsLoading, error: measurementsError } = useMeasurements();
  const { generateTryOn, isLoading: isTryOnLoading } = useTryOn();
  const { signOut, user } = useAuth();
  const { products, isLoading: isProductsLoading, error: productsError } = useProducts();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tryOnResult, setTryOnResult] = useState<TryOnResultType | null>(null);

  // Auto-select product from URL parameter
  useEffect(() => {
    if (productId && products.length > 0 && !selectedProduct) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [productId, products, selectedProduct]);

  const handleTryOn = async (product: Product) => {
    if (!measurements) {
      toast.error('No measurements found. Please complete your body scan first.');
      return;
    }
    
    setSelectedProduct(product);
    setTryOnResult(null);
    
    const backendResult = await generateTryOn(product.id);
    
    if (backendResult) {
      const result: TryOnResultType = {
        recommendedSize: backendResult.recommendedSize || calculateSize(measurements).recommendedSize,
        fitScore: backendResult.fitScore || calculateSize(measurements).fitScore,
        fitNotes: calculateSize(measurements).fitNotes,
        images: backendResult.images,
      };
      setTryOnResult(result);
      toast.success(`Recommended size: ${result.recommendedSize}`);
    } else {
      const localResult = calculateSize(measurements);
      setTryOnResult(localResult);
      toast.error('Backend call failed, using local calculation');
    }
  };

  const handleCloseTryOn = () => {
    setSelectedProduct(null);
    setTryOnResult(null);
  };

  if (isMeasurementsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Virtual Try-On | AI-Powered Size Recommendations</title>
        <meta name="description" content="Experience our virtual try-on widget. Get personalized size recommendations based on your measurements." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {/* Header - hidden in embed mode */}
        {!embedMode && (
          <header className="border-b border-border/50">
            <div className="container py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-semibold text-foreground">Virtual Try-On</h1>
                  <p className="text-xs text-muted-foreground">AI-Powered Fitting</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={async () => {
                      await signOut();
                      toast.success('Signed out successfully');
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </header>
        )}

        <main className={embedMode ? "p-4" : "container py-8"}>
          {/* Show error if no measurements */}
          {measurementsError && (
            <div className="glass-card rounded-xl p-6 mb-6 border-destructive/50">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{measurementsError}</p>
              </div>
            </div>
          )}

          {/* Embed mode - show only selected product */}
          {embedMode && selectedProduct ? (
            <div className="space-y-6">
              {/* Compact header for embed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">{selectedProduct.name}</span>
                </div>
                {user && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={async () => {
                      await signOut();
                      toast.success('Signed out');
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Measurements display */}
              {measurements && (
                <div className="glass-card rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Chest</p>
                      <p className="font-semibold">{measurements.chest}cm</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Waist</p>
                      <p className="font-semibold">{measurements.waist}cm</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Hips</p>
                      <p className="font-semibold">{measurements.hips}cm</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleTryOn(selectedProduct)}
                    disabled={isTryOnLoading || !measurements}
                  >
                    {isTryOnLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Try On
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Try-On Loading */}
              {isTryOnLoading && <TryOnLoading />}

              {/* Try-On Result */}
              {!isTryOnLoading && tryOnResult && measurements && (
                <TryOnResult 
                  result={tryOnResult} 
                  product={selectedProduct}
                  measurements={measurements}
                  onClose={handleCloseTryOn}
                />
              )}
            </div>
          ) : embedMode && !selectedProduct ? (
            <div className="flex items-center justify-center py-12">
              {isProductsLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <p className="text-muted-foreground">Product not found</p>
              )}
            </div>
          ) : (
            /* Regular mode - show full interface */
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left sidebar - Profile & Results */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass-card rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center relative pulse-ring">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">Your Profile</h2>
                      <p className="text-xs text-muted-foreground">Body measurements</p>
                    </div>
                  </div>

                  {measurements ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Height</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.height}cm</p>
                      </div>
                      <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Weight</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.weight}kg</p>
                      </div>
                      <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Chest</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.chest}cm</p>
                      </div>
                      <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Waist</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.waist}cm</p>
                      </div>
                      <div className="glass-card p-3 rounded-lg text-center col-span-2">
                        <p className="text-xs text-muted-foreground">Hips</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.hips}cm</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
                      <p className="text-sm">No measurements found</p>
                      <p className="text-xs mt-1">Complete your body scan to continue</p>
                    </div>
                  )}
                </div>

                {/* Try-On Loading */}
                {isTryOnLoading && <TryOnLoading />}

                {/* Try-On Result */}
                {!isTryOnLoading && selectedProduct && tryOnResult && measurements && (
                  <TryOnResult 
                    result={tryOnResult} 
                    product={selectedProduct}
                    measurements={measurements}
                    onClose={handleCloseTryOn}
                  />
                )}
              </div>

              {/* Main content - Products */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-primary" />
                      <span className="text-gradient">Try On Collection</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select an item to see your personalized fit
                    </p>
                  </div>
                </div>

                {isProductsLoading ? (
                  <div className="col-span-2 flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : productsError ? (
                  <div className="col-span-2 text-center py-12 text-destructive">
                    Failed to load products: {productsError}
                  </div>
                ) : products.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-muted-foreground">
                    No products found
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-6">
                    {products.map((product, index) => (
                      <div 
                        key={product.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <ProductCard 
                          product={product} 
                          onTryOn={handleTryOn}
                          isSelected={selectedProduct?.id === product.id}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Footer - hidden in embed mode */}
        {!embedMode && (
          <footer className="border-t border-border/50 py-6 mt-12">
            <div className="container text-center">
              <p className="text-sm text-muted-foreground">
                Virtual Try-On Widget
              </p>
            </div>
          </footer>
        )}
      </div>
    </>
  );
};

export default Index;
