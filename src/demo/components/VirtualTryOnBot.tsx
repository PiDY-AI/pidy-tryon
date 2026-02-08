import { useEffect, useState, useRef } from "react";
import { X, LogOut } from "lucide-react";
import pidyLogo from "@/assets/pidy_logo_white.png";
import pidyLogoBlack from "@/assets/pidy_logo_black.png";

interface VirtualTryOnBotProps {
  productId?: string;
  size?: string;
}

/**
 * VirtualTryOnBot - A minimal button that embeds the PIDY SDK widget
 *
 * Flow:
 * 1. Shows just a "Virtual Try-On" button (minimal space)
 * 2. On click: triggers try-on via the hidden SDK widget
 * 3. Widget handles auth popup if needed
 * 4. When image is received, expands to show the result
 */
export function VirtualTryOnBot({ productId, size }: VirtualTryOnBotProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [tryOnSize, setTryOnSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetInitializedRef = useRef(false);
  // Track the last size we generated for, so we know if this is a retry (same size) or new generation
  const lastGeneratedSizeRef = useRef<string | null>(null);

  // Products that support try-on
  const tryOnEnabledProducts = [
    'OVO-STAN-VRS-2025-001',
    'KITH-LAX-PKT-2025-002',
    'KNIT-POLO-JNY-2025-003',
    'W-LEG-DENIM-2025-004',
    'BTN-DWN-BRW-2025-005',
    'JCREW-STRIPE-DRS-2026-006',
    'AEO-LACE-CUL-2026-007',
    'NEXT-CP-BTN-2026-008',
    'NEXT-CRM-SHRT-2026-009',
    'SHEIN-RIB-TNK-2026-010',
    'SWIM-FLOR-BKN-2026-011',
  ];

  // Initialize the hidden SDK widget
  useEffect(() => {
    if (!productId || !tryOnEnabledProducts.includes(productId)) return;
    if (widgetInitializedRef.current) return;

    // Load SDK script if not already loaded
    const existingScript = document.querySelector('script[src*="sdk.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `${window.location.origin}/sdk.js`;
      script.async = true;
      script.onload = () => {
        initWidget();
      };
      document.head.appendChild(script);
    } else {
      // SDK already loaded
      initWidget();
    }

    function initWidget() {
      // Small delay to ensure SDK is fully initialized
      setTimeout(() => {
        if (window.PidyTryOn && widgetContainerRef.current) {
          window.PidyTryOn.init({
            container: `#pidy-widget-${productId}`,
            productId: productId,
            size: size || undefined,
            authMethod: 'popup',
            width: 380,
            height: 580,
          });
          widgetInitializedRef.current = true;
          console.log('[VirtualTryOnBot] SDK widget initialized');
        }
      }, 100);
    }
  }, [productId]);

  // Listen for messages from the SDK widget
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, source } = event.data || {};

      // Only handle messages from our widget
      if (source !== 'pidy-widget') return;

      console.log('[VirtualTryOnBot] Widget message:', type, event.data);

      switch (type) {
        case 'pidy-tryon-started':
          setIsProcessing(true);
          setError(null);
          break;

        case 'pidy-tryon-result':
          // Widget has try-on result (user must be authenticated to get here)
          const { images, recommendedSize } = event.data;
          if (images && images.length > 0) {
            setTryOnImage(images[0]);
            const resultSize = recommendedSize || size || 'M';
            setTryOnSize(resultSize);
            lastGeneratedSizeRef.current = resultSize;
            setIsProcessing(false);
            setIsAuthenticated(true);
          }
          break;

        case 'pidy-tryon-error':
          setError(event.data.error || 'Try-on failed');
          setIsProcessing(false);
          break;

        case 'pidy-auth-required':
          // Widget needs auth - it will handle opening popup
          setIsProcessing(true);
          break;

        case 'pidy-auth-success':
          // Auth completed, try-on will start automatically
          console.log('[VirtualTryOnBot] Auth success from widget');
          setIsAuthenticated(true);
          break;

        case 'pidy-auth-cancelled':
          setIsProcessing(false);
          break;

        case 'pidy-sign-out':
          // User signed out from widget
          console.log('[VirtualTryOnBot] User signed out');
          setIsAuthenticated(false);
          setTryOnImage(null);
          setTryOnSize(null);
          setIsProcessing(false);
          setError(null);
          lastGeneratedSizeRef.current = null;
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [size]);

  // Don't render if product doesn't support try-on
  if (!productId || !tryOnEnabledProducts.includes(productId)) return null;

  const isSizeSelected = !!size && size.trim() !== '';
  const hasResult = !!tryOnImage;

  // Trigger try-on by sending message to widget
  const handleTryOnClick = () => {
    if (!isSizeSelected) return;

    // If we already have a result for this exact size, it's a retry
    const isRetry = lastGeneratedSizeRef.current === size;

    setIsProcessing(true);
    setError(null);

    // Send message to the hidden widget to start try-on
    const widgetIframe = widgetContainerRef.current?.querySelector('iframe');
    if (widgetIframe && widgetIframe.contentWindow) {
      widgetIframe.contentWindow.postMessage({
        type: 'pidy-start-tryon',
        productId,
        size,
        retry: isRetry,
      }, '*');
      console.log('[VirtualTryOnBot] Sent start-tryon to widget, retry:', isRetry);
    } else {
      console.error('[VirtualTryOnBot] Widget iframe not found');
      setError('Widget not ready. Please try again.');
      setIsProcessing(false);
    }
  };

  // Close and reset
  const handleClose = () => {
    setTryOnImage(null);
    setTryOnSize(null);
    setIsProcessing(false);
    setError(null);
  };

  // Sign out via the widget iframe
  const handleSignOut = () => {
    const widgetIframe = widgetContainerRef.current?.querySelector('iframe');
    if (widgetIframe && widgetIframe.contentWindow) {
      widgetIframe.contentWindow.postMessage({ type: 'pidy-sign-out-request' }, '*');
      console.log('[VirtualTryOnBot] Sent sign-out request to widget');
    }
    // Reset local state immediately
    setIsAuthenticated(false);
    setTryOnImage(null);
    setTryOnSize(null);
    setIsProcessing(false);
    setError(null);
    lastGeneratedSizeRef.current = null;
  };

  return (
    <div className="w-full space-y-2">
      {/* Hidden SDK widget container - only visible when we need to show auth UI */}
      <div
        id={`pidy-widget-${productId}`}
        ref={widgetContainerRef}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Try-On Button - visible when no result yet */}
      {!hasResult && (
        <div className="relative group">
          <button
            type="button"
            onClick={isSizeSelected && !isProcessing ? handleTryOnClick : undefined}
            disabled={isProcessing}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-lg transition ${
              isProcessing
                ? 'bg-primary/50 text-primary-foreground/70 cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Your look is being prepared...
              </>
            ) : (
              <>
                <img src={pidyLogoBlack} alt="Pidy" className="h-4 w-4" />
                Digital Fitting Room
              </>
            )}
          </button>

          {/* Hover tooltip when no size selected */}
          {!isSizeSelected && !isProcessing && (
            <div className="absolute left-0 -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-foreground text-background px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-lg">
                Select a size first
                <div className="absolute left-6 -bottom-1 w-2 h-2 bg-foreground rotate-45" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && !hasResult && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Result display - only visible when we have an image */}
      {hasResult && (
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-background shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close virtual try-on"
            className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg backdrop-blur transition hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Try-on image */}
          <div className="aspect-[3/4] bg-muted">
            <img
              src={tryOnImage}
              alt="Virtual Try-On Result"
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error('[VirtualTryOnBot] Image failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Result info */}
          <div className="p-4 space-y-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tried Size</p>
                <p className="text-sm font-semibold text-foreground">{tryOnSize}</p>
              </div>
              {(() => {
                const sizeChanged = size !== tryOnSize;
                const label = isProcessing ? 'Generating...' : sizeChanged ? 'Generate' : 'Retry';
                return (
                  <button
                    onClick={() => {
                      setTryOnImage(null);
                      setTryOnSize(null);
                      handleTryOnClick();
                    }}
                    disabled={isProcessing}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
                      sizeChanged
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                );
              })()}
            </div>

            {/* Powered by PIDY + Sign Out */}
            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="flex items-center gap-2">
                <img src={pidyLogo} alt="PIDY" className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Powered by PIDY
                </span>
              </div>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition"
                >
                  <LogOut className="h-3 w-3" />
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Type declaration for the global PidyTryOn SDK
declare global {
  interface Window {
    PidyTryOn?: {
      init: (config: {
        container: string;
        productId: string;
        size?: string;
        authMethod?: 'modal' | 'popup' | 'redirect';
        width?: number;
        height?: number;
        debug?: boolean;
      }) => void;
      autoInit: () => void;
    };
  }
}
