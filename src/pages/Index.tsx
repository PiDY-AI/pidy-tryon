import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ProductCard } from '@/components/ProductCard';
import { TryOnResult } from '@/components/TryOnResult';
import { TryOnLoading } from '@/components/TryOnLoading';
import { TrialRoomDoor } from '@/components/TrialRoomDoor';
import { useTryOn } from '@/hooks/useTryOn';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { Product, TryOnResult as TryOnResultType } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Sparkles, ShoppingBag, LogOut, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import pidyLogo from '@/assets/pidy-logo.png';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('productId');
  const embedMode = !!productId;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [pendingAutoTryOn, setPendingAutoTryOn] = useState(false);
  const [showDoorAnimation, setShowDoorAnimation] = useState(false);
  const [doorOpened, setDoorOpened] = useState(false);
  const [tryOnSequence, setTryOnSequence] = useState(0);
  
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
    const handleMessage = async (event: MessageEvent) => {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'tryon-auth-session') {
        const { access_token, refresh_token } = event.data || {};

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }

        setIsExpanded(true);
        window.parent.postMessage({ type: 'tryon-expand' }, '*');
        setPendingAutoTryOn(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTryOn = async (product: Product) => {
    setSelectedProduct(product);
    setTryOnResult(null);
    setDoorOpened(false);
    setTryOnSequence((v) => v + 1);
    
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

  // After popup login, auto-run try-on once auth + product are ready
  useEffect(() => {
    if (!pendingAutoTryOn) return;
    if (authLoading) return;
    if (!user) return;
    if (!selectedProduct) return;

    setPendingAutoTryOn(false);
    handleTryOn(selectedProduct);
  }, [pendingAutoTryOn, authLoading, user, selectedProduct]);

  const handleCloseTryOn = () => {
    setIsExpanded(false);
    setTryOnResult(null);
    setShowDoorAnimation(false);
    setDoorOpened(false);
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
    setShowDoorAnimation(true);
    setDoorOpened(false);
    setTryOnResult(null);
    // Notify parent window
    window.parent.postMessage({ type: 'tryon-expand' }, '*');
    if (selectedProduct) {
      handleTryOn(selectedProduct);
    }
  };

  const handleDoorOpened = () => {
    setDoorOpened(true);
  };

  // Embed mode - show floating button that expands
  if (embedMode) {
    return (
      <div className={!isExpanded ? 'inline-block' : ''}>
        <Helmet>
          <title>Virtual Try-On</title>
        </Helmet>
        
        {!isExpanded ? (
          // Compact button - no container background
          <button
            onClick={handleExpandAndTryOn}
            disabled={isProductsLoading || authLoading || !selectedProduct}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-medium text-sm">{authLoading ? 'Loading...' : 'Try On'}</span>
          </button>
        ) : (
          // Expanded panel with door animation
          <div className="w-[380px] h-[580px] flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header - sticky */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border/50 bg-background z-10">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium text-foreground text-sm truncate">
                  {selectedProduct?.name || 'Virtual Try-On'}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
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

            {/* Content with door animation */}
            <div className="flex-1 overflow-hidden">
              <TrialRoomDoor 
                key={tryOnSequence}
                isOpening={showDoorAnimation} 
                isLoading={isTryOnLoading}
                onDoorOpened={handleDoorOpened}
              >
                {/* Scrollable content inside the room */}
                <div className="h-full overflow-y-auto p-4 space-y-4">
                  {/* Try-On Result with reveal animation */}
                  {!isTryOnLoading && tryOnResult && selectedProduct && doorOpened && (
                    <div className="animate-reveal-up">
                      <TryOnResult 
                        result={tryOnResult} 
                        product={selectedProduct}
                        onClose={handleCloseTryOn}
                      />
                    </div>
                  )}

                  {/* Retry button if result shown */}
                  {!isTryOnLoading && tryOnResult && selectedProduct && doorOpened && (
                    <Button 
                      className="w-full animate-reveal-up" 
                      variant="outline"
                      onClick={() => {
                        setShowDoorAnimation(false);
                        setDoorOpened(false);
                        setTimeout(() => {
                          setShowDoorAnimation(true);
                          handleTryOn(selectedProduct);
                        }, 100);
                      }}
                      style={{ animationDelay: '0.2s' }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                </div>
              </TrialRoomDoor>
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
            {/* Left sidebar - Results with Door Animation */}
            <div className="lg:col-span-1">
              {(isTryOnLoading || tryOnResult) && (
                <div className="h-[500px] rounded-2xl overflow-hidden border border-border">
                  <TrialRoomDoor 
                    key={tryOnSequence}
                    isOpening={isTryOnLoading || !!tryOnResult} 
                    isLoading={isTryOnLoading}
                    onDoorOpened={() => setDoorOpened(true)}
                  >
                    <div className="h-full overflow-y-auto p-4">
                      {!isTryOnLoading && selectedProduct && tryOnResult && doorOpened && (
                        <div className="animate-reveal-up">
                          <TryOnResult 
                            result={tryOnResult} 
                            product={selectedProduct}
                            onClose={() => {
                              setSelectedProduct(null);
                              setTryOnResult(null);
                              setDoorOpened(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </TrialRoomDoor>
                </div>
              )}

              {!isTryOnLoading && !tryOnResult && (
                <div className="glass-card rounded-2xl p-6 text-center">
                  <img src={pidyLogo} alt="PIDY" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold text-foreground mb-2">Pidy Room</h3>
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
