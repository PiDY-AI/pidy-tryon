import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ProductCard } from '@/components/ProductCard';
import { TryOnResult } from '@/components/TryOnResult';
import { TryOnLoading } from '@/components/TryOnLoading';
import { TrialRoomDoor } from '@/components/TrialRoomDoor';
import { OnboardingFlow, OnboardingData } from '@/components/onboarding/OnboardingFlow';
import { useTryOn } from '@/hooks/useTryOn';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { useOnboarding } from '@/hooks/useOnboarding';
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
  const brandSize = searchParams.get('size'); // Size passed from brand site
  const embedMode = !!productId;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDoorAnimation, setShowDoorAnimation] = useState(false);
  const [doorOpened, setDoorOpened] = useState(false);
  const [tryOnSequence, setTryOnSequence] = useState(0);
  
  const { generateTryOn, isLoading: isTryOnLoading, error: tryOnError } = useTryOn();
  const { signOut, user, loading: authLoading } = useAuth();
  const { products, isLoading: isProductsLoading } = useProducts();
  const { needsOnboarding, isLoading: isOnboardingLoading, completeOnboarding } = useOnboarding();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tryOnResult, setTryOnResult] = useState<TryOnResultType | null>(null);
  const [hasSessionToken, setHasSessionToken] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false);

  // "user" can be flaky inside third-party iframes; token is the source of truth for backend calls.
  const isAuthed = !!authToken || hasSessionToken;
  
  // In embedded iframes, Supabase auth "loading" can remain true due to storage partitioning.
  // The SDK token is the source of truth in embed mode, so don't block UI on authLoading.
  const isInitializing = !sessionCheckComplete || (!embedMode && authLoading) || isOnboardingLoading;

  // Handle onboarding completion
  const handleOnboardingComplete = async (data: OnboardingData) => {
    // TODO: Send data to backend (photos, measurements, email)
    // For now, just mark onboarding as complete locally
    console.log('[PIDY Widget] Onboarding data:', data);
    completeOnboarding();
    toast.success('Profile created! You can now try on clothes.');
  };

  // Cross-check session presence (iframe/popup storage can be flaky)
  // IMPORTANT: In embed mode, wait for SDK tokens before completing session check
  useEffect(() => {
    // In embed mode, don't wait for authLoading; we may get an SDK token even if Supabase can't hydrate session.
    if (!embedMode && authLoading) return;

    let cancelled = false;
    
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled) {
        // Only update token state if we don't already have a token from SDK
        if (!authToken) {
          setHasSessionToken(!!session?.access_token);
          setAuthToken(session?.access_token ?? null);
        }
        
        // In embed mode, delay completing session check to give SDK time to send tokens
        // The SDK might need time to load the auth bridge and retrieve cached tokens
        if (embedMode && !authToken && !session?.access_token) {
          // Wait for SDK tokens before declaring "no auth"
          setTimeout(() => {
            if (!cancelled) {
              setSessionCheckComplete(true);
            }
          }, 1500); // Give SDK 1.5s to respond with cached tokens
        } else {
          setSessionCheckComplete(true);
        }
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [authLoading, embedMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep local token state in sync when onboarding sets a session (or when auth changes elsewhere)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setHasSessionToken(true);
        if (!authToken) setAuthToken(session.access_token);
        setSessionCheckComplete(true);
        return;
      }

      setHasSessionToken(false);
      // In embed mode, keep SDK-provided in-memory tokens even if the Supabase session can't persist.
      if (!embedMode) setAuthToken(null);
    });

    return () => subscription.unsubscribe();
  }, [authToken, embedMode]);

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

  // Listen for messages from parent (brand website SDK) and auth popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const { type, access_token, refresh_token } = event.data || {};

      // Handle auth token from SDK (parent window cached token)
      if (type === 'pidy-auth-token' && access_token) {
        console.log('[PIDY Widget] Received token from SDK');
        
        const { error } = await supabase.auth.setSession({ 
          access_token, 
          refresh_token: refresh_token || '' 
        });
        
        if (error) {
          console.warn('[PIDY Widget] Could not set session from SDK token:', error.message);
        }

        // Use in-memory token as source of truth
        setAuthToken(access_token);
        setHasSessionToken(true);
        setSessionCheckComplete(true); // Mark session check as done since we got token from SDK
        
        // Notify SDK that auth was successful
        window.parent.postMessage({ 
          type: 'pidy-auth-success',
          access_token,
          refresh_token,
          expires_in: 3600
        }, '*');
        return;
      }

      // Handle auth invalid from SDK (refresh token rotated/expired)
      if (type === 'pidy-auth-invalid') {
        console.log('[PIDY Widget] Auth invalid from SDK:', event.data?.reason);
        setAuthToken(null);
        setHasSessionToken(false);
        setShowDoorAnimation(false);
        setDoorOpened(false);
        setTryOnResult(null);
        toast.message('Session expired', {
          description: 'Please sign in again to continue.',
        });
        return;
      }

      // Handle sign-out request from SDK
      if (type === 'pidy-sign-out-request') {
        await signOut();
        setAuthToken(null);
        setHasSessionToken(false);
        setShowDoorAnimation(false);
        setDoorOpened(false);
        setTryOnResult(null);
        return;
      }

      // Handle auth success from popup (same origin)
      if (event.origin === window.location.origin && type === 'tryon-auth-session') {
        if (!access_token || !refresh_token) {
          toast.error('Auth session missing! Please sign in again.');
          return;
        }

        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          toast.error(error.message || 'Failed to apply session. Please sign in again.');
          return;
        }

        // Keep an in-memory token as source of truth for backend calls
        setAuthToken(access_token);

        // Verify session in iframe context
        const { data: { session } } = await supabase.auth.getSession();
        const ok = !!session?.access_token;
        setHasSessionToken(ok);

        if (!ok) {
          toast.message('Signed in (limited)', {
            description: 'Your browser blocked embedded storage. Try-on will still work for this session.',
          });
        }

        // Notify parent SDK to cache the tokens
        window.parent.postMessage({ 
          type: 'pidy-auth-success',
          access_token,
          refresh_token,
          expires_in: 3600
        }, '*');

        setIsExpanded(true);
        window.parent.postMessage({ type: 'tryon-expand' }, '*');
        return;
      }

      // Handle expand command from parent
      if (type === 'tryon-expand' || type === 'pidy-expand') {
        setIsExpanded(true);
        window.parent.postMessage({ type: 'tryon-expand' }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Request cached token from SDK on mount (in case SDK has it stored)
    if (embedMode) {
      window.parent.postMessage({ type: 'pidy-auth-request' }, '*');
    }
    
    return () => window.removeEventListener('message', handleMessage);
  }, [embedMode, signOut]);

  const handleTryOn = async (product: Product, size?: string) => {
    setSelectedProduct(product);
    setTryOnResult(null);
    setDoorOpened(false);
    setTryOnSequence((v) => v + 1);

    const sizeToUse = size || brandSize || product.sizes[0] || 'M';
    const backendResult = await generateTryOn(product.id, sizeToUse, authToken ?? undefined);

    if (backendResult) {
      const result: TryOnResultType = {
        recommendedSize: backendResult.recommendedSize || sizeToUse,
        fitScore: backendResult.fitScore || 85,
        fitNotes: ['Based on your body scan'],
        images: backendResult.images,
        prompt: backendResult.prompt,
      };
      setTryOnResult(result);
      toast.success(`Try-on generated for size: ${sizeToUse}`);
    } else {
      toast.error(tryOnError || 'Try-on generation failed. Please try again.');
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

    // Treat "no token" as signed out (common in iframe storage-partitioning edge cases)
    if (!isAuthed) {
      toast.error('Please sign in again to start try-on.');
      setHasSessionToken(false);
      setAuthToken(null);
      setShowDoorAnimation(false);
      setDoorOpened(false);
      setTryOnResult(null);
      handleOpenAuthPopup();
      return;
    }

    setShowDoorAnimation(true);
    setDoorOpened(false);
    setTryOnResult(null);
    handleTryOn(selectedProduct);
  };

  // Reset door animation + auth-token state when user signs out
  // In embed mode, user can be null even when we have a valid SDK token — don't treat that as signed-out.
  useEffect(() => {
    if (!embedMode && !user && !authLoading) {
      setHasSessionToken(false);
      setAuthToken(null);
      setShowDoorAnimation(false);
      setDoorOpened(false);
      setTryOnResult(null);
    }
  }, [user, authLoading, embedMode]);

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
        
        <div className="w-[380px] h-[580px] flex flex-col bg-[#0d0d0d] border border-[#c9a862]/20 rounded-xl overflow-hidden shadow-2xl">
            {/* Header - luxury minimal */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-primary/10 bg-background/50 backdrop-blur-xl z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <img src={pidyLogo} alt="PIDY" className="w-5 h-5 flex-shrink-0" />
                </div>
                <div className="min-w-0">
                  <span className="font-display text-sm text-foreground tracking-wide block truncate">
                    {selectedProduct?.name || 'Virtual Try-On'}
                  </span>
                  <span className="text-[10px] uppercase tracking-luxury text-muted-foreground">
                    Private Fitting
                  </span>
                </div>
              </div>
              {isAuthed && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full transition-all duration-300"
                  onClick={async () => {
                    const { error } = await signOut();
                    setHasSessionToken(false);
                    setAuthToken(null);
                    setShowDoorAnimation(false);
                    setDoorOpened(false);
                    setTryOnResult(null);
                    // Notify SDK to clear cached tokens
                    window.parent.postMessage({ type: 'pidy-sign-out' }, '*');
                    if (error) {
                      toast.error(error.message || 'Sign out failed');
                      return;
                    }
                    toast.success('Signed out');
                  }}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isInitializing ? (
                // Luxury loading state - wait until both auth and session check complete
                <div className="h-full flex items-center justify-center bg-gradient-to-b from-secondary/50 to-background">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center animate-glow">
                      <img src={pidyLogo} alt="PIDY" className="w-10 h-10 object-contain" />
                    </div>
                    <p className="text-xs uppercase tracking-luxury text-muted-foreground">Preparing your suite...</p>
                  </div>
                </div>
              ) : !isAuthed ? (
                // Luxury sign-in screen
                <div className="h-full flex items-center justify-center bg-gradient-to-b from-secondary/30 to-background p-8">
                  <div className="text-center max-w-xs">
                    {/* Elegant logo presentation */}
                    <div className="relative w-24 h-24 mx-auto mb-8">
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-glow-subtle" />
                      <div className="absolute inset-2 rounded-full bg-background border border-primary/30 flex items-center justify-center">
                        <img src={pidyLogo} alt="PIDY" className="w-12 h-12 object-contain" />
                      </div>
                    </div>
                    <h3 className="font-display text-2xl text-foreground mb-2 tracking-wide">Private Fitting Room</h3>
                    <p className="text-xs uppercase tracking-luxury text-muted-foreground mb-6">
                      Exclusive virtual experience
                    </p>
                    <Button 
                      className="w-full btn-luxury h-12 rounded-none mb-3"
                      size="lg"
                      onClick={handleOpenAuthPopup}
                    >
                      Sign In
                    </Button>
                    <Button 
                      className="w-full h-12 rounded-none"
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        // For first-time users, open auth popup - after signup they'll see onboarding
                        handleOpenAuthPopup();
                      }}
                    >
                      First Time PIDY
                    </Button>
                    <p className="text-[10px] text-muted-foreground/60 mt-4 tracking-wide">
                      New users will set up their profile after signing up
                    </p>
                  </div>
                </div>
              ) : needsOnboarding ? (
                // First-time user onboarding flow
                <OnboardingFlow onComplete={handleOnboardingComplete} />
              ) : !showDoorAnimation ? (
                // Luxury fitting room door
                <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-secondary/30 to-background p-6 gap-6">
                  {/* Selected size display */}
                  {brandSize && (
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-luxury text-muted-foreground mb-2">Selected Size</p>
                      <span className="inline-block px-4 py-2 border border-primary/40 bg-primary/10 text-primary font-display text-lg tracking-wide">
                        {brandSize}
                      </span>
                    </div>
                  )}
                  
                  {/* Luxury fitting room door */}
                  <button 
                    onClick={handleStartTryOn}
                    className="group relative w-52 h-72 cursor-pointer transition-all duration-500 hover:scale-[1.02]"
                    disabled={!selectedProduct}
                  >
                    {/* Ambient glow */}
                    <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    {/* Door frame - art deco inspired */}
                    <div className="absolute inset-0 border border-primary/40 bg-gradient-to-b from-secondary via-muted to-secondary overflow-hidden">
                      {/* Gold corner accents */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/60" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/60" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/60" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/60" />
                      
                      {/* Inner door panel */}
                      <div className="absolute top-6 bottom-6 left-6 right-6 border border-primary/20 bg-gradient-to-b from-background/5 to-transparent" />
                      
                      {/* Elegant door handle */}
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                        <div className="w-0.5 h-8 bg-gradient-to-b from-primary via-primary/80 to-primary/40" />
                        <div className="w-3 h-3 rounded-full border border-primary/60 bg-primary/20" />
                      </div>
                      
                      {/* Top emblem */}
                      <div className="absolute top-8 left-1/2 -translate-x-1/2">
                        <div className="relative">
                          <div className="w-12 h-px bg-primary/40" />
                          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-t border-l border-primary/40" />
                        </div>
                        <span className="block text-[8px] font-medium uppercase tracking-[0.3em] text-primary/80 mt-3 text-center">
                          Pidy
                        </span>
                      </div>
                      
                      {/* Center monogram */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                          <div className="absolute -inset-8 bg-primary/5 blur-2xl rounded-full group-hover:bg-primary/10 transition-colors duration-500" />
                          <div className="relative w-16 h-16 rounded-full border border-primary/30 bg-background/30 backdrop-blur-sm flex items-center justify-center group-hover:border-primary/50 transition-colors duration-300">
                            <img 
                              src={pidyLogo} 
                              alt="PIDY" 
                              className="w-8 h-8 object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300" 
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom text */}
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300">
                          Tap to Enter
                        </p>
                        {brandSize && (
                          <p className="text-[11px] text-primary font-medium tracking-wider mt-1">
                            Size {brandSize}
                          </p>
                        )}
                      </div>
                      
                      {/* Subtle shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </button>
                  
                  {/* Footer tagline */}
                  <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
                    Your Private Fitting Awaits
                  </p>
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
                    {!isTryOnLoading && tryOnResult && selectedProduct && (
                      <div className="animate-reveal-up">
                        <TryOnResult 
                          result={tryOnResult} 
                          product={selectedProduct}
                          onClose={handleCloseTryOn}
                        />
                      </div>
                    )}

                    {/* Retry button if result shown */}
                    {!isTryOnLoading && tryOnResult && selectedProduct && (
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

                    {/* If the animation completed but we got no result, don't show a blank room */}
                    {!isTryOnLoading && !tryOnResult && selectedProduct && (
                      <div className="animate-reveal-up rounded-lg border border-border/40 bg-background/40 backdrop-blur-sm p-4 text-center space-y-3">
                        <p className="text-[10px] uppercase tracking-luxury text-muted-foreground">
                          Try-on completed
                        </p>
                        <p className="text-sm text-foreground">We didn’t receive an image to display.</p>
                        {tryOnError && (
                          <p className="text-xs text-muted-foreground break-words">{tryOnError}</p>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setShowDoorAnimation(false);
                            setDoorOpened(false);
                            setTimeout(() => {
                              setShowDoorAnimation(true);
                              handleTryOn(selectedProduct);
                            }, 100);
                          }}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                      </div>
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
                      {!isTryOnLoading && selectedProduct && tryOnResult && (
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

                      {!isTryOnLoading && selectedProduct && !tryOnResult && (
                        <div className="rounded-lg border border-border/40 bg-background/40 backdrop-blur-sm p-4 text-center space-y-2">
                          <p className="text-[10px] uppercase tracking-luxury text-muted-foreground">Try-on completed</p>
                          <p className="text-sm text-foreground">No image was returned.</p>
                          {tryOnError && (
                            <p className="text-xs text-muted-foreground break-words">{tryOnError}</p>
                          )}
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
