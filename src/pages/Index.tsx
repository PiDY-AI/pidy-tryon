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
import { ShoppingBag, LogOut, Loader2, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import pidyLogo from '@/assets/pidy-logo.png';
import pidyLogoBlack from '@/assets/pidy-logo-black.png';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('productId');
  const embedMode = !!productId;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDoorAnimation, setShowDoorAnimation] = useState(false);
  const [doorOpened, setDoorOpened] = useState(false);
  const [tryOnSequence, setTryOnSequence] = useState(0);
  
  const { generateTryOn, isLoading: isTryOnLoading } = useTryOn();
  const { signOut, user, loading: authLoading } = useAuth();
  const { products, isLoading: isProductsLoading } = useProducts();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tryOnResult, setTryOnResult] = useState<TryOnResultType | null>(null);

  // Auto-select product from URL parameter (embed-safe)
  // In real brand embeds, the productId may not exist in our products table.
  // We still allow the flow by creating a lightweight placeholder product.
  useEffect(() => {
    if (!productId) return;

    const fromDb = products.find((p) => p.id === productId);

    if (fromDb) {
      // Prefer real product details when available
      if (!selectedProduct || selectedProduct.id !== fromDb.id || selectedProduct.name !== fromDb.name) {
        setSelectedProduct(fromDb);
      }
      return;
    }

    // Fallback placeholder so the widget never blanks/locks up
    if (!selectedProduct) {
      setSelectedProduct({
        id: productId,
        name: 'Selected item',
        category: 'Item',
        image: '',
        price: 0,
        sizes: ['S', 'M', 'L', 'XL'],
      });
    }
  }, [productId, products, selectedProduct]);

  // Listen for messages from parent (brand website) and auth popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Handle auth success from popup (same origin)
      if (event.origin === window.location.origin && event.data?.type === 'tryon-auth-session') {
        const { access_token, refresh_token } = event.data || {};

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }

        setIsExpanded(true);
        window.parent.postMessage({ type: 'tryon-expand' }, '*');
        return;
      }

      // Handle expand command from parent (brand website's "Try On" button)
      if (event.data?.type === 'tryon-expand' || event.data?.type === 'pidy-expand') {
        setIsExpanded(true);
        window.parent.postMessage({ type: 'tryon-expand' }, '*');
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

  // After popup login, we intentionally do NOT auto-start the try-on.
  // The user will tap the door to begin (better UX + predictable animation).


  const handleCloseTryOn = () => {
    setIsExpanded(false);
    setTryOnResult(null);
    setShowDoorAnimation(false);
    setDoorOpened(false);
    // Notify parent window
    window.parent.postMessage({ type: 'tryon-collapse' }, '*');
  };

  const handleExpandAndTryOn = () => {
    // Just expand the panel - don't auto-start try-on
    setIsExpanded(true);
    window.parent.postMessage({ type: 'tryon-expand' }, '*');
  };

  const handleStartTryOn = () => {
    if (!selectedProduct) return;
    setShowDoorAnimation(true);
    setDoorOpened(false);
    setTryOnResult(null);
    handleTryOn(selectedProduct);
  };

  const handleOpenAuthPopup = () => {
    const width = 450;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const url = `/auth?productId=${encodeURIComponent(productId ?? '')}&popup=true`;

    window.open(
      url,
      'tryon-auth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  const handleDoorOpened = () => {
    setDoorOpened(true);
  };

  // Auto-expand in embed mode immediately
  useEffect(() => {
    if (embedMode && !isExpanded) {
      setIsExpanded(true);
      window.parent.postMessage({ type: 'tryon-expand' }, '*');
    }
  }, [embedMode, isExpanded]);

  // Embed mode - show panel directly (no button)
  if (embedMode) {
    return (
      <div>
        <Helmet>
          <title>Virtual Try-On</title>
        </Helmet>
        
        <div className="w-[380px] h-[580px] flex flex-col bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header - sticky */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border/50 bg-background z-10">
              <div className="flex items-center gap-2 min-w-0">
                <img src={pidyLogo} alt="PIDY" className="w-5 h-5 flex-shrink-0" />
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

            {/* Content - show sign-in, door button, or try-on animation */}
            <div className="flex-1 overflow-hidden">
              {authLoading ? (
                // Loading state
                <div className="h-full flex items-center justify-center bg-gradient-to-b from-muted to-background">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                      <img src={pidyLogo} alt="PIDY" className="w-10 h-10 object-contain" />
                    </div>
                    <p className="text-muted-foreground text-sm">Loading...</p>
                  </div>
                </div>
              ) : !user ? (
                // Sign-in screen
                <div className="h-full flex items-center justify-center bg-gradient-to-b from-muted to-background p-6">
                  <div className="text-center max-w-xs">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <img src={pidyLogo} alt="PIDY" className="w-12 h-12 object-contain" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to Pidy</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Sign in to try on this item and get your perfect size recommendation
                    </p>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleOpenAuthPopup}
                    >
                      Sign In to Try On
                    </Button>
                  </div>
                </div>
              ) : !showDoorAnimation ? (
                // Door with PIDY logo - click to start
                <div className="h-full flex items-center justify-center bg-gradient-to-b from-muted to-background p-6">
                  <button 
                    onClick={handleStartTryOn}
                    className="group relative w-48 h-72 cursor-pointer transition-transform duration-300 hover:scale-105"
                    disabled={!selectedProduct}
                  >
                    {/* Door frame */}
                    <div className="absolute inset-0 rounded-lg border-4 border-primary/30 bg-gradient-to-b from-secondary to-muted shadow-2xl overflow-hidden">
                      {/* Door panels */}
                      <div className="absolute top-4 bottom-4 left-4 right-4 rounded border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent" />
                      
                      {/* Door handle */}
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-10 bg-gradient-to-b from-primary to-primary/50 rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
                      
                      {/* PIDY Room sign */}
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 border border-primary/40 rounded-full bg-background/50 backdrop-blur-sm">
                        <span className="text-[10px] font-bold tracking-[0.2em] text-primary">PIDY ROOM</span>
                      </div>
                      
                      {/* Center logo */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 group-hover:bg-primary/30 transition-colors" />
                          <img 
                            src={pidyLogoBlack} 
                            alt="PIDY" 
                            className="relative w-20 h-auto opacity-80 group-hover:opacity-100 transition-opacity" 
                          />
                        </div>
                      </div>
                      
                      {/* Tap to enter text */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
                        <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          Tap to enter
                        </p>
                      </div>
                    </div>
                    
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="absolute inset-0 bg-primary/10 blur-xl rounded-lg" />
                    </div>
                  </button>
                </div>
              ) : (
                // Door animation and try-on
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
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    )}
                  </div>
                </TrialRoomDoor>
              )}
          </div>
        </div>
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
                    <img src={pidyLogo} alt="PIDY" className="w-6 h-6" />
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
