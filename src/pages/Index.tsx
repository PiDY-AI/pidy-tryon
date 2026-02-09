import { useState, useEffect, useRef } from 'react';
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
import pidyLogo from '@/assets/pidy_logo_white.png';

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
  const [tryOnFailCount, setTryOnFailCount] = useState(0);

  const { generateTryOn, isLoading: isTryOnLoading, error: tryOnError } = useTryOn();
  const { signOut, user, loading: authLoading } = useAuth();
  const { products, isLoading: isProductsLoading } = useProducts();
  const { needsOnboarding, isLoading: isOnboardingLoading, completeOnboarding } = useOnboarding();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tryOnResult, setTryOnResult] = useState<TryOnResultType | null>(null);
  const [hasSessionToken, setHasSessionToken] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false);
  const [provider, setProvider] = useState<'claude-openai' | 'groq-replicate'>('groq-replicate');
  const [sdkOnboardingReceived, setSdkOnboardingReceived] = useState(false);

  // Track whether the current session was set from an SDK-provided token (not a fresh popup sign-in).
  // When true, onAuthStateChange should NOT echo pidy-auth-success / pidy-onboarding-complete
  // back to the SDK, because the SDK already has the token. Echoing creates an infinite loop.
  const tokenFromSdkRef = useRef(false);

  // Mirror authToken in a ref so handleTryOn (called from setTimeout/closures) always reads the latest value.
  const authTokenRef = useRef<string | null>(null);
  authTokenRef.current = authToken;

  // "user" can be flaky inside third-party iframes; token is the source of truth for backend calls.
  const isAuthed = !!authToken || hasSessionToken;

  // In embedded iframes, Supabase auth "loading" can remain true due to storage partitioning.
  // The SDK token is the source of truth in embed mode, so don't block UI on authLoading.
  // In embed mode, also wait for SDK onboarding response
  const waitingForSdk = embedMode && !sdkOnboardingReceived;
  const isInitializing = !sessionCheckComplete ||
                        (!embedMode && authLoading) ||
                        isOnboardingLoading ||
                        waitingForSdk;

  // Handle onboarding completion
  const handleOnboardingComplete = async (data: OnboardingData) => {
    console.log('[PIDY Widget] Onboarding data:', data);

    // Save onboarding completion to user metadata in Supabase
    if (user) {
      console.log('[PIDY Widget] Saving onboarding status to user metadata');
      const { error } = await supabase.auth.updateUser({
        data: { onboarding_complete: true }
      });

      if (error) {
        console.error('[PIDY Widget] Error saving onboarding to user metadata:', error);
        toast.error('Failed to save profile. Please try again.');
        return;
      }

      console.log('[PIDY Widget] Onboarding status saved to database');
    }

    // Mark as complete locally
    console.log('[PIDY Widget] Calling completeOnboarding()');
    completeOnboarding();
    console.log('[PIDY Widget] After completeOnboarding, localStorage:', localStorage.getItem('pidy_onboarding_complete'));

    // Notify parent SDK so it stores in central bridge
    if (embedMode) {
      console.log('[PIDY Widget] Sending onboarding completion to parent SDK');
      window.parent.postMessage({ type: 'pidy-onboarding-complete' }, '*');
    }

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

      console.log('[PIDY Widget] Session check:', {
        embedMode,
        hasSession: !!session?.access_token,
        hasAuthToken: !!authToken,
        userId: session?.user?.id
      });

      if (!cancelled) {
        // If we found a session, use it
        if (session?.access_token) {
          console.log('[PIDY Widget] Found existing Supabase session, using it');
          setHasSessionToken(true);
          if (!authToken) setAuthToken(session.access_token);

          // Check if user has completed onboarding from database
          const onboardingComplete = session.user?.user_metadata?.onboarding_complete === true;
          if (onboardingComplete) {
            console.log('[PIDY Widget] User has already completed onboarding (from session)');
            completeOnboarding();
            // Mark that we received onboarding status (so we don't wait for SDK)
            setSdkOnboardingReceived(true);
          }

          // In embed mode, do NOT send pidy-auth-success back to SDK here.
          // The SDK already has the token (it sent it to us, or is about to).
          // Sending auth-success from here creates a loop:
          // session check -> sends auth-success -> SDK stores -> SDK sends token -> setSession -> onAuthStateChange -> repeat
          // The SDK manages its own token storage. We only need to notify on NEW auth (popup sign-in).

          setSessionCheckComplete(true);
        }
        // Only update token state if we don't already have a token from SDK
        else if (!authToken) {
          setHasSessionToken(false);
          setAuthToken(null);

          // In embed mode, delay completing session check to give SDK time to send tokens
          // The SDK might need time to load the auth bridge and retrieve cached tokens
          if (embedMode) {
            // Wait for SDK tokens before declaring "no auth"
            console.log('[PIDY Widget] No session found, waiting for SDK tokens...');
            setTimeout(() => {
              if (!cancelled) {
                console.log('[PIDY Widget] SDK timeout reached, completing session check');
                setSessionCheckComplete(true);
              }
            }, 1500); // Give SDK 1.5s to respond with cached tokens
          } else {
            setSessionCheckComplete(true);
          }
        } else {
          // We have authToken from SDK already
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
  // IMPORTANT: Do NOT include authToken in deps - it causes infinite re-subscribe loop:
  // subscribe -> INITIAL_SESSION -> setAuthToken -> re-subscribe -> INITIAL_SESSION -> ...
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[PIDY Widget] onAuthStateChange:', event);
      if (session?.access_token) {
        setHasSessionToken(true);
        // Use functional update to check previous value without needing authToken in closure
        setAuthToken((prev) => prev || session.access_token);
        setSessionCheckComplete(true);

        // When user signs in via popup (not from SDK-cached token), notify SDK
        if (event === 'SIGNED_IN' && session.user) {
          console.log('[PIDY Widget] User signed in, checking onboarding status from database');
          const onboardingComplete = session.user.user_metadata?.onboarding_complete === true;

          if (onboardingComplete) {
            console.log('[PIDY Widget] User has already completed onboarding');
            completeOnboarding();

            // Only notify SDK if this was a fresh sign-in (popup), not an SDK-provided token.
            // If tokenFromSdkRef is true, the SDK already knows about the auth + onboarding.
            if (embedMode && !tokenFromSdkRef.current) {
              window.parent.postMessage({ type: 'pidy-onboarding-complete' }, '*');
            }
          }
        }
        // Reset the flag after processing - future SIGNED_IN events should be treated normally
        tokenFromSdkRef.current = false;
        return;
      }

      setHasSessionToken(false);
      // In embed mode, keep SDK-provided in-memory tokens even if the Supabase session can't persist.
      if (!embedMode) setAuthToken(null);
    });

    return () => subscription.unsubscribe();
  }, [embedMode, completeOnboarding]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Keep handler non-async so thrown errors don't become unhandled promise rejections.
    const handleMessage = (event: MessageEvent) => {
      void (async () => {
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

        // Mark that this session came from the SDK - prevents echo loops in onAuthStateChange
        tokenFromSdkRef.current = true;

        // Use in-memory token as source of truth
        setAuthToken(access_token);
        authTokenRef.current = access_token; // Eagerly update ref
        setHasSessionToken(true);
        setSessionCheckComplete(true); // Mark session check as done since we got token from SDK

        // Do NOT send pidy-auth-success back to SDK here - the SDK already has the token.
        // Sending it back creates an infinite ping-pong loop:
        // SDK sends token -> widget sends auth-success -> SDK stores -> triggers more events
        return;
      }

      // Handle onboarding complete from popup
      if (type === 'pidy-onboarding-complete') {
        console.log('[PIDY Widget] Onboarding complete from popup');
        completeOnboarding();

        // Forward to SDK (parent) so it can persist on brand domain
        // This is safe - the SDK handler for this message just stores locally, no echo back
        window.parent.postMessage({ type: 'pidy-onboarding-complete' }, '*');

        // If tokens were also sent, apply them
        if (access_token && refresh_token) {
          // Mark as SDK-sourced to prevent onAuthStateChange from echoing back
          tokenFromSdkRef.current = true;
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) {
            setAuthToken(access_token);
            authTokenRef.current = access_token; // Eagerly update ref
            setHasSessionToken(true);
            setSessionCheckComplete(true);
            // Do NOT send pidy-auth-success here - the popup already notified the SDK.
            // Sending it again creates a loop.

            // Auto-start try-on after successful onboarding in embed mode
            if (embedMode && selectedProduct) {
              console.log('[PIDY Widget] Auto-starting try-on after onboarding');
              setShowDoorAnimation(true);
              setTimeout(() => {
                handleTryOn(selectedProduct);
              }, 100);
            }
          }
        }
        return;
      }

      // Handle onboarding status from SDK (persisted on brand domain)
      if (type === 'pidy-onboarding-status') {
        const { isComplete } = event.data || {};
        console.log('[PIDY Widget] Onboarding status from SDK:', isComplete);
        setSdkOnboardingReceived(true); // Mark that we received SDK response
        if (isComplete) {
          console.log('[PIDY Widget] SDK says onboarding complete, calling completeOnboarding()');
          completeOnboarding();
          console.log('[PIDY Widget] After SDK onboarding complete, localStorage:', localStorage.getItem('pidy_onboarding_complete'));
        }
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

      // Handle sign-out request from SDK / VirtualTryOnBot
      if (type === 'pidy-sign-out-request') {
        await signOut();
        setAuthToken(null);
        authTokenRef.current = null;
        setHasSessionToken(false);
        setShowDoorAnimation(false);
        setDoorOpened(false);
        setTryOnResult(null);
        // Notify parent SDK to clear cached tokens
        window.parent.postMessage({ type: 'pidy-sign-out', source: 'pidy-widget' }, '*');
        return;
      }

      // Handle auth cancelled from SDK (user closed auth modal/popup without signing in)
      if (type === 'pidy-auth-cancelled') {
        console.log('[PIDY Widget] Auth cancelled from SDK');
        // Forward to parent (VirtualTryOnBot) so it can reset the button state
        window.parent.postMessage({ type: 'pidy-auth-cancelled', source: 'pidy-widget' }, '*');
        return;
      }

      // Handle auth success from popup (same origin) - this is a FRESH sign-in
      if (event.origin === window.location.origin && type === 'tryon-auth-session') {
        if (!access_token || !refresh_token) {
          toast.error('Auth session missing! Please sign in again.');
          return;
        }

        // Mark so onAuthStateChange doesn't echo pidy-auth-success back to SDK
        // (we send it ourselves below, once is enough)
        tokenFromSdkRef.current = true;

        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          toast.error(error.message || 'Failed to apply session. Please sign in again.');
          return;
        }

        // Keep an in-memory token as source of truth for backend calls
        setAuthToken(access_token);
        authTokenRef.current = access_token; // Eagerly update ref so handleTryOn reads fresh token

        // Verify session in iframe context
        const { data: { session } } = await supabase.auth.getSession();
        const ok = !!session?.access_token;
        setHasSessionToken(ok);

        if (!ok) {
          toast.message('Signed in (limited)', {
            description: 'Your browser blocked embedded storage. Try-on will still work for this session.',
          });
        }

        // Notify parent SDK to cache the tokens (this is the ONE place we tell SDK about popup auth)
        window.parent.postMessage({
          type: 'pidy-auth-success',
          access_token,
          refresh_token,
          expires_in: 3600
        }, '*');

        setIsExpanded(true);
        window.parent.postMessage({ type: 'tryon-expand' }, '*');

        // Auto-start try-on after successful auth in embed mode
        if (embedMode && selectedProduct) {
          console.log('[PIDY Widget] Auto-starting try-on after auth');
          setShowDoorAnimation(true);
          // Delay slightly to let state settle
          setTimeout(() => {
            handleTryOn(selectedProduct);
          }, 100);
        }
        return;
      }

        // Handle expand command from parent
        if (type === 'tryon-expand' || type === 'pidy-expand') {
          setIsExpanded(true);
          window.parent.postMessage({ type: 'tryon-expand' }, '*');
        }

        // Handle start try-on request from parent (VirtualTryOnBot)
        if (type === 'pidy-start-tryon') {
          const { productId: reqProductId, size: reqSize, retry: reqRetry } = event.data || {};
          console.log('[PIDY Widget] Received start-tryon request:', { reqProductId, reqSize, retry: reqRetry });

          // If not authenticated, open auth popup
          if (!isAuthed) {
            console.log('[PIDY Widget] Not authenticated, opening auth popup');
            handleOpenAuthPopup();
            // Notify parent that auth is required
            window.parent.postMessage({ source: 'pidy-widget', type: 'pidy-auth-required' }, '*');
            return;
          }

          // If needs onboarding, notify parent
          if (needsOnboarding) {
            console.log('[PIDY Widget] Needs onboarding, opening auth popup with onboarding');
            handleOpenAuthPopup({ onboarding: true });
            window.parent.postMessage({ source: 'pidy-widget', type: 'pidy-auth-required' }, '*');
            return;
          }

          // Start try-on with the product
          const product = selectedProduct || {
            id: reqProductId,
            name: 'Selected item',
            category: 'Item',
            image: '',
            price: 0,
            sizes: ['S', 'M', 'L', 'XL'],
          };

          console.log('[PIDY Widget] Starting try-on for product:', product.id, 'size:', reqSize, 'retry:', !!reqRetry);
          setShowDoorAnimation(true);
          // Widget-initiated try-ons always use fast mode (groq-replicate)
          handleTryOn(product, reqSize, !!reqRetry, 'groq-replicate');
        }
      })().catch((err) => {
        console.error('[PIDY Widget] Message handler error:', err);
      });
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [embedMode, isAuthed, needsOnboarding, selectedProduct]); // eslint-disable-line react-hooks/exhaustive-deps

  // Request cached token from SDK on mount ONLY ONCE
  useEffect(() => {
    if (!embedMode) return;

    // Only request once
    console.log('[PIDY Widget] Requesting cached tokens from SDK (once)');
    window.parent.postMessage({ type: 'pidy-auth-request' }, '*');
    window.parent.postMessage({ type: 'pidy-onboarding-request' }, '*');

    // Timeout: if SDK doesn't respond in 3 seconds, assume no onboarding status
    const timeout = setTimeout(() => {
      console.log('[PIDY Widget] SDK onboarding timeout check');
      setSdkOnboardingReceived((prev) => {
        if (!prev) {
          console.log('[PIDY Widget] SDK onboarding timeout - assuming not complete');
          return true;
        }
        return prev;
      });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [embedMode]); // Only run when embedMode changes (once on mount)

  // Note: Removed auto-open popup in embed mode due to popup blockers
  // The SDK button in VirtualTryOnBot.tsx will handle authentication flow

  const handleTryOn = async (product: Product, size?: string, isRetry?: boolean, providerOverride?: 'claude-openai' | 'groq-replicate') => {
    setSelectedProduct(product);
    setTryOnResult(null);
    setDoorOpened(false);
    setTryOnSequence((v) => v + 1);

    const sizeToUse = size || brandSize || product.sizes[0] || 'M';
    const providerToUse = providerOverride || provider;

    // Notify parent that try-on has started (for VirtualTryOnBot loading state)
    window.parent.postMessage({ source: 'pidy-widget', type: 'pidy-tryon-started', productId: product.id, size: sizeToUse }, '*');

    try {
      const backendResult = await generateTryOn({
        productId: product.id,
        selectedSize: sizeToUse,
        accessTokenOverride: authTokenRef.current ?? undefined,
        provider: providerToUse,
        retry: isRetry,
      });

      if (backendResult) {
        const result: TryOnResultType = {
          recommendedSize: backendResult.recommendedSize || sizeToUse,
          fitScore: backendResult.fitScore || 85,
          fitNotes: ['Based on your body scan'],
          images: backendResult.images,
          prompt: backendResult.prompt,
        };
        setTryOnResult(result);
        setTryOnFailCount(0); // Reset fail count on success
        toast.success(`Try-on generated for size: ${sizeToUse}`);

        // Notify parent (VirtualTryOnBot) with the try-on result
        window.parent.postMessage({
          source: 'pidy-widget',
          type: 'pidy-tryon-result',
          images: backendResult.images,
          recommendedSize: result.recommendedSize,
          fitScore: result.fitScore,
        }, '*');
      } else {
        // Increment fail count
        setTryOnFailCount((prev) => prev + 1);
        // Notify parent of error
        window.parent.postMessage({ source: 'pidy-widget', type: 'pidy-tryon-error', error: tryOnError || 'Try-on generation failed' }, '*');
        toast.error(tryOnError || 'Try-on generation failed. Please try again.');
      }
    } catch (error) {
      console.error('[PIDY Widget] Try-on error:', error);
      // Increment fail count
      setTryOnFailCount((prev) => prev + 1);
      // Notify parent of error
      window.parent.postMessage({ source: 'pidy-widget', type: 'pidy-tryon-error', error: error instanceof Error ? error.message : 'Unknown error' }, '*');
      toast.error(error instanceof Error ? error.message : 'Try-on generation failed. Please try again.');
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

  const handleOpenAuthPopup = (options?: { onboarding?: boolean }) => {
    console.log('[PIDY Widget] Opening auth popup', { options, embedMode });

    // Build the auth URL
    let url = `/auth?productId=${encodeURIComponent(productId ?? '')}&popup=true`;
    if (options?.onboarding) {
      url += '&onboarding=true';
    }

    // In embed mode, request parent window to open popup (won't be blocked)
    if (embedMode) {
      const fullUrl = window.location.origin + url;
      console.log('[PIDY Widget] Embed mode detected, sending popup request to parent');
      console.log('[PIDY Widget] Full URL:', fullUrl);
      console.log('[PIDY Widget] Window parent:', window.parent);

      const message = {
        type: 'pidy-open-popup',
        url: fullUrl,
        width: 420,
        height: 550
      };

      console.log('[PIDY Widget] Sending message:', message);
      window.parent.postMessage(message, '*');
      console.log('[PIDY Widget] Message sent to parent');
      return;
    }

    // Non-embed mode: open popup directly
    console.log('[PIDY Widget] Attempting to open popup at:', url);

    const width = 420;
    const height = 550;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    try {
      const popup = window.open(
        url,
        'tryon-auth',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      console.log('[PIDY Widget] Popup opened:', popup ? 'success' : 'blocked');

      // Check if popup was blocked
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.warn('[PIDY Widget] Popup was blocked by browser');

        // Fallback: redirect in same window
        const allowRedirect = confirm(
          'Please allow popups for this site to use Virtual Try-On.\n\n' +
          'Click OK to open the sign-in page in this window instead.'
        );

        if (allowRedirect) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error('[PIDY Widget] Error opening popup:', error);
      window.location.href = url;
    }
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
      <div className="w-full h-full min-h-screen bg-[#0d0d0d]">
        <Helmet>
          <title>Virtual Try-On</title>
        </Helmet>

        <div className="w-[380px] h-[580px] flex flex-col bg-[#0d0d0d] border border-[#c9a862]/20 rounded-xl overflow-hidden shadow-2xl">
          {/* Header - luxury minimal - hide when showing sign-in UI */}
          {isAuthed && (
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-primary/10 bg-background/50 backdrop-blur-xl z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <img src={pidyLogo} alt="PIDY" className="w-5 h-5 flex-shrink-0" onError={(e) => e.currentTarget.style.display = 'none'} />
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
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden">
              {isInitializing ? (
                // Luxury loading state - wait until both auth and session check complete
                <div className="h-full flex items-center justify-center bg-gradient-to-b from-secondary/50 to-background">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center animate-glow">
                      <img src={pidyLogo} alt="PIDY" className="w-10 h-10 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </div>
                    <p className="text-xs uppercase tracking-luxury text-muted-foreground">Preparing your suite...</p>
                  </div>
                </div>
              ) : !isAuthed ? (
                embedMode ? (
                  // Sign-in UI for embed mode with popup delegation
                  <div className="h-full flex items-center justify-center bg-gradient-to-b from-secondary/50 to-background p-6">
                    <div className="text-center max-w-xs space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <img src={pidyLogo} alt="PIDY" className="w-8 h-8 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                      <div>
                        <h3 className="text-h4 text-foreground mb-1">Virtual Try-On</h3>
                        <p className="text-caption text-muted-foreground">
                          Sign in to see how this looks on you
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Button
                          onClick={() => handleOpenAuthPopup()}
                          className="w-full"
                          size="default"
                        >
                          Sign In
                        </Button>
                        <Button
                          onClick={() => handleOpenAuthPopup({ onboarding: true })}
                          variant="outline"
                          className="w-full"
                          size="default"
                        >
                          First Time PIDY
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Full sign-in screen for non-embed mode
                  <div className="h-full flex items-center justify-center bg-gradient-to-b from-secondary/30 to-background p-8">
                    <div className="text-center max-w-xs">
                      {/* Elegant logo presentation - use text fallback if image fails */}
                      <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-glow-subtle" />
                        <div className="absolute inset-2 rounded-full bg-background border border-primary/30 flex items-center justify-center">
                          <img
                            src={pidyLogo}
                            alt=""
                            className="w-12 h-12 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              // Show text fallback
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <span
                            className="font-display text-2xl text-primary hidden items-center justify-center"
                            style={{ display: 'none' }}
                          >
                            P
                          </span>
                        </div>
                      </div>
                      <h3 className="font-display text-2xl text-foreground mb-2 tracking-wide">Private Fitting Room</h3>
                      <p className="text-xs uppercase tracking-luxury text-muted-foreground mb-6">
                        Exclusive virtual experience
                      </p>
                      <Button
                        className="w-full btn-luxury h-12 rounded-none mb-3"
                        size="lg"
                        onClick={() => handleOpenAuthPopup()}
                      >
                        Sign In
                      </Button>
                      <Button
                        className="w-full h-12 rounded-none"
                        variant="outline"
                        size="lg"
                        onClick={() => handleOpenAuthPopup({ onboarding: true })}
                      >
                        First Time PIDY
                      </Button>
                      <p className="text-[10px] text-muted-foreground/60 mt-4 tracking-wide">
                        New users will set up their profile after signing up
                      </p>
                    </div>
                  </div>
                )
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
                  
                  {/* Provider toggle */}
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-luxury text-muted-foreground mb-2">Generation Mode</p>
                    <div className="flex items-center justify-center gap-1 p-1 border border-border/40 bg-background/30 backdrop-blur-sm">
                      <button
                        onClick={() => setProvider('claude-openai')}
                        className={`px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all duration-300 ${
                          provider === 'claude-openai'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Best Quality
                      </button>
                      <button
                        onClick={() => setProvider('groq-replicate')}
                        className={`px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all duration-300 ${
                          provider === 'groq-replicate'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Fast
                      </button>
                    </div>
                  </div>
                  
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
                              onError={(e) => e.currentTarget.style.display = 'none'}
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
                  <div className="h-full overflow-y-auto p-4 space-y-3">
                    {/* Try-On Result with reveal animation */}
                    {!isTryOnLoading && tryOnResult && selectedProduct && (
                      <div className="animate-reveal-up">
                        <TryOnResult
                          result={tryOnResult}
                          product={selectedProduct}
                          onClose={() => {
                            setTryOnResult(null);
                            setShowDoorAnimation(false);
                            setDoorOpened(false);
                          }}
                        />
                      </div>
                    )}

                    {/* Size selector + actions after result */}
                    {!isTryOnLoading && tryOnResult && selectedProduct && (
                      <div className="animate-reveal-up space-y-3" style={{ animationDelay: '0.2s' }}>
                        {/* Tried size indicator */}
                        <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Tried Size</p>
                            <p className="text-sm font-semibold text-foreground">{tryOnResult.recommendedSize}</p>
                          </div>
                          <Button
                            onClick={() => {
                              setShowDoorAnimation(false);
                              setDoorOpened(false);
                              setTimeout(() => {
                                setShowDoorAnimation(true);
                                handleTryOn(selectedProduct, undefined, true);
                              }, 100);
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <RotateCcw className="w-3 h-3 mr-1.5" />
                            Retry
                          </Button>
                        </div>

                        {/* Try different size */}
                        <div className="px-3 py-2 bg-secondary/20 border border-border/30 rounded-lg">
                          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Try a Different Size</p>
                          <div className="flex gap-2 flex-wrap">
                            {selectedProduct.sizes.map((s) => (
                              <Button
                                key={s}
                                size="sm"
                                variant={s === tryOnResult.recommendedSize ? "default" : "outline"}
                                className="min-w-[40px] h-8 text-xs"
                                disabled={s === tryOnResult.recommendedSize}
                                onClick={() => {
                                  setShowDoorAnimation(false);
                                  setDoorOpened(false);
                                  setTryOnResult(null);
                                  setTimeout(() => {
                                    setShowDoorAnimation(true);
                                    handleTryOn(selectedProduct, s, true);
                                  }, 100);
                                }}
                              >
                                {s}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Close button */}
                        <Button
                          className="w-full"
                          variant="ghost"
                          onClick={handleCloseTryOn}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Close
                        </Button>
                      </div>
                    )}

                    {/* If the animation completed but we got no result, don't show a blank room */}
                    {!isTryOnLoading && !tryOnResult && selectedProduct && (
                      <div className="animate-reveal-up rounded-lg border border-border/40 bg-background/40 backdrop-blur-sm p-4 text-center space-y-3">
                        <p className="text-[10px] uppercase tracking-luxury text-muted-foreground">
                          Try-on completed
                        </p>
                        <p className="text-sm text-foreground">We didn't receive an image to display.</p>
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
                              handleTryOn(selectedProduct, undefined, true);
                            }, 100);
                          }}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Retry
                        </Button>
                        {tryOnFailCount >= 2 && (
                          <Button
                            variant="ghost"
                            className="w-full text-muted-foreground"
                            onClick={async () => {
                              await signOut();
                              setTryOnFailCount(0);
                              setShowDoorAnimation(false);
                              setDoorOpened(false);
                              setTryOnResult(null);
                              toast.success('Signed out. Please sign in again.');
                            }}
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out & Try Again
                          </Button>
                        )}
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
                        <div className="animate-reveal-up space-y-3">
                          {/* Tried size + retry */}
                          <div className="flex items-center justify-between p-3 bg-secondary/30 border border-border/50 rounded-lg">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Tried Size</p>
                              <p className="font-semibold text-foreground">{tryOnResult.recommendedSize}</p>
                            </div>
                            <Button
                              onClick={() => handleTryOn(selectedProduct, undefined, true)}
                              size="sm"
                              variant="outline"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Retry
                            </Button>
                          </div>

                          {/* Try different size */}
                          <div className="px-3 py-2 bg-secondary/20 border border-border/30 rounded-lg">
                            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Try a Different Size</p>
                            <div className="flex gap-2 flex-wrap">
                              {selectedProduct.sizes.map((s) => (
                                <Button
                                  key={s}
                                  size="sm"
                                  variant={s === tryOnResult.recommendedSize ? "default" : "outline"}
                                  className="min-w-[40px] h-8 text-xs"
                                  disabled={s === tryOnResult.recommendedSize}
                                  onClick={() => {
                                    setTryOnResult(null);
                                    setDoorOpened(false);
                                    setTimeout(() => {
                                      handleTryOn(selectedProduct, s, true);
                                    }, 100);
                                  }}
                                >
                                  {s}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Prompt display */}
                          {tryOnResult.prompt && (
                            <div className="p-3 bg-secondary/20 border border-border/30 rounded-lg">
                              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Generation Prompt</p>
                              <p className="text-xs text-muted-foreground/80 italic leading-relaxed">{tryOnResult.prompt}</p>
                            </div>
                          )}

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
                        <div className="rounded-lg border border-border/40 bg-background/40 backdrop-blur-sm p-4 text-center space-y-3">
                          <p className="text-[10px] uppercase tracking-luxury text-muted-foreground">Try-on completed</p>
                          <p className="text-sm text-foreground">No image was returned.</p>
                          {tryOnError && (
                            <p className="text-xs text-muted-foreground break-words">{tryOnError}</p>
                          )}
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleTryOn(selectedProduct, undefined, true)}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Retry
                          </Button>
                          {tryOnFailCount >= 2 && (
                            <Button
                              variant="ghost"
                              className="w-full text-muted-foreground"
                              onClick={async () => {
                                await signOut();
                                setTryOnFailCount(0);
                                setShowDoorAnimation(false);
                                setDoorOpened(false);
                                setTryOnResult(null);
                                toast.success('Signed out. Please sign in again.');
                              }}
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Sign Out & Try Again
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TrialRoomDoor>
                </div>
              )}

              {!isTryOnLoading && !tryOnResult && (
                <div className="glass-card rounded-2xl p-6 text-center space-y-4">
                  <img src={pidyLogo} alt="PIDY" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold text-foreground mb-2">Pidy Room</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct 
                      ? `Ready to try on: ${selectedProduct.name}`
                      : 'Select a product to see how it looks on you'
                    }
                  </p>
                  
                  {/* Retry button - visible when a product is selected */}
                  {selectedProduct && (
                    <Button
                      onClick={() => handleTryOn(selectedProduct, undefined, true)}
                      className="w-full"
                      variant="outline"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry Try-On
                    </Button>
                  )}
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
                
                {/* Provider toggle */}
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Generation Mode</p>
                  <div className="flex items-center gap-1 p-1 border border-border/40 bg-background/30 backdrop-blur-sm rounded">
                    <button
                      onClick={() => setProvider('claude-openai')}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all duration-300 rounded-sm ${
                        provider === 'claude-openai'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Best Quality
                    </button>
                    <button
                      onClick={() => setProvider('groq-replicate')}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all duration-300 rounded-sm ${
                        provider === 'groq-replicate'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Fast
                    </button>
                  </div>
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
