import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ProductCard } from '@/components/ProductCard';
import { TryOnResult } from '@/components/TryOnResult';
import { TryOnLoading } from '@/components/TryOnLoading';
import { useTryOn } from '@/hooks/useTryOn';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { Product, TryOnResult as TryOnResultType } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Sparkles, ShoppingBag, LogOut, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('productId');
  const embedMode = !!productId;
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { generateTryOn, isLoading: isTryOnLoading } = useTryOn();
  const { signOut, user, loading: authLoading } = useAuth();
  const { products, isLoading: isProductsLoading } = useProducts();
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

  // Listen for auth success from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'tryon-auth-success') {
        // Reload to get fresh auth state, then auto-expand
        window.location.reload();
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTryOn = async (product: Product) => {
    setSelectedProduct(product);
    setTryOnResult(null);
    
    const backendResult = await generateTryOn(product.id);
    
    if (backendResult) {
      const result: TryOnResultType = {
        recommendedSize: backendResult.recommendedSize || 'M',
        fitScore: backendResult.fitScore || 85,
        fitNotes: ['Based on your body scan'],
        images: backendResult.images,
        prompt: backendResult.prompt,
      };
      setTryOnResult(result);
      toast.success(`Recommended size: ${result.recommendedSize}`);
    } else {
      toast.error('Try-on generation failed. Please try again.');
    }
  };

  const handleCloseTryOn = () => {
    setIsExpanded(false);
    setTryOnResult(null);
    // Notify parent window
    window.parent.postMessage({ type: 'tryon-collapse' }, '*');
  };

  const handleExpandAndTryOn = () => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      return;
    }
    
    // In embed mode, check auth first
    if (embedMode && !user) {
      // Open auth in a popup window
      const width = 450;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(
        `/auth?productId=${productId}&popup=true`,
        'tryon-auth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      return;
    }
    
    setIsExpanded(true);
    // Notify parent window
    window.parent.postMessage({ type: 'tryon-expand' }, '*');
    if (selectedProduct) {
      handleTryOn(selectedProduct);
    }
  };

  // Embed mode - show floating button that expands
  if (embedMode) {
    return (
      <div className={`${!isExpanded ? 'h-[80px] flex items-center justify-start p-3' : ''}`}>
        <Helmet>
          <title>Virtual Try-On</title>
        </Helmet>
        
        {!isExpanded ? (
          // Compact floating button - positioned at top-left of container
          <button
            onClick={handleExpandAndTryOn}
            disabled={isProductsLoading || authLoading || !selectedProduct}
            className="group flex items-center gap-3 bg-gradient-to-r from-zinc-800 to-zinc-900 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700"
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-sm">{authLoading ? 'Loading...' : 'Try On'}</span>
          </button>
        ) : (
          // Expanded panel
          <div className="w-[380px] max-h-[600px] overflow-y-auto bg-background border border-border rounded-2xl shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">
                  {selectedProduct?.name || 'Virtual Try-On'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {user && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8"
                    onClick={async () => {
                      await signOut();
                      toast.success('Signed out');
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCloseTryOn}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Try-On Loading */}
              {isTryOnLoading && <TryOnLoading />}

              {/* Try-On Result */}
              {!isTryOnLoading && tryOnResult && selectedProduct && (
                <TryOnResult 
                  result={tryOnResult} 
                  product={selectedProduct}
                  onClose={handleCloseTryOn}
                />
              )}

              {/* Retry button if result shown */}
              {!isTryOnLoading && tryOnResult && selectedProduct && (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleTryOn(selectedProduct)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regular mode - full interface
  return (
    <>
      <Helmet>
        <title>Virtual Try-On | AI-Powered Size Recommendations</title>
        <meta name="description" content="Experience our virtual try-on widget. Get personalized size recommendations based on your body scan." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
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
        </header>

        <main className="container py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left sidebar - Results */}
            <div className="lg:col-span-1 space-y-6">
              {isTryOnLoading && <TryOnLoading />}

              {!isTryOnLoading && selectedProduct && tryOnResult && (
                <TryOnResult 
                  result={tryOnResult} 
                  product={selectedProduct}
                  onClose={() => {
                    setSelectedProduct(null);
                    setTryOnResult(null);
                  }}
                />
              )}

              {!isTryOnLoading && !tryOnResult && (
                <div className="glass-card rounded-2xl p-6 text-center">
                  <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Ready to Try On</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a product to see how it looks on you
                  </p>
                </div>
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
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
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
        </main>

        <footer className="border-t border-border/50 py-6 mt-12">
          <div className="container text-center">
            <p className="text-sm text-muted-foreground">
              Virtual Try-On Widget
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
