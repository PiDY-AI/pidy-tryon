import { useEffect, useState } from "react";
import { X } from "lucide-react";
import pidyLogo from "@/assets/pidy-logo.png";

interface VirtualTryOnBotProps {
  productId?: string;
  size?: string;
}

export function VirtualTryOnBot({ productId, size }: VirtualTryOnBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWidget, setShowWidget] = useState(false);

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

  // Listen for authentication from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type } = event.data || {};

      // Auth successful - these are the messages Auth.tsx sends
      if (type === 'tryon-auth-session' || type === 'pidy-onboarding-complete' || type === 'pidy-auth-success') {
        console.log('[VirtualTryOnBot] User authenticated via popup:', type);
        setIsAuthenticated(true);
        setShowWidget(true);
      } else if (type === 'pidy-auth-cancelled') {
        console.log('[VirtualTryOnBot] Auth cancelled, resetting');
        setIsOpen(false);
        setShowWidget(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Trigger SDK autoInit when widget should show (after auth)
  useEffect(() => {
    console.log('[VirtualTryOnBot] useEffect triggered', { showWidget, productId, size });
    if (!showWidget || !productId) {
      console.log('[VirtualTryOnBot] Skipping autoInit - showWidget:', showWidget, 'productId:', productId);
      return;
    }

    console.log('[VirtualTryOnBot] Setting timer for autoInit');
    const timer = setTimeout(() => {
      console.log('[VirtualTryOnBot] Timer fired, checking for SDK');
      console.log('[VirtualTryOnBot] window.PidyTryOn:', (window as any).PidyTryOn);
      if (typeof (window as any).PidyTryOn?.autoInit === 'function') {
        console.log('[VirtualTryOnBot] Calling PidyTryOn.autoInit()');
        (window as any).PidyTryOn.autoInit();
      } else {
        console.error('[VirtualTryOnBot] PidyTryOn SDK not loaded');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [showWidget, productId, size]);

  // Auto-reset if authentication takes too long (user likely closed popup)
  useEffect(() => {
    if (!isOpen || isAuthenticated) return;

    const timeout = setTimeout(() => {
      console.log('[VirtualTryOnBot] Auth timeout, resetting button');
      setIsOpen(false);
      setShowWidget(false);
    }, 60000); // 60 seconds timeout

    return () => clearTimeout(timeout);
  }, [isOpen, isAuthenticated]);

  if (!productId || !tryOnEnabledProducts.includes(productId)) return null;

  // Open sign-in popup directly (works on Vercel too)
  const handleOpenSignInPopup = () => {
    const authUrl = `${window.location.origin}/auth?productId=${encodeURIComponent(productId)}&popup=true`;
    const width = 420;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    console.log('[VirtualTryOnBot] Opening sign-in popup at:', authUrl);

    const popup = window.open(
      authUrl,
      'pidy-auth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed) {
      console.warn('[VirtualTryOnBot] Popup was blocked');
      alert('Please allow popups for this site to use Virtual Try-On');
    } else {
      console.log('[VirtualTryOnBot] Popup opened successfully');
      // Show widget container after successful popup
      setIsOpen(true);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Button - directly opens sign-in popup */}
      {!showWidget && (
        <button
          type="button"
          onClick={handleOpenSignInPopup}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90"
        >
          <img src={pidyLogo} alt="Pidy" className="h-4 w-4" />
          Virtual Try-On
        </button>
      )}

      {/* Waiting for auth indicator */}
      {isOpen && !showWidget && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Waiting for sign-in...
        </div>
      )}

      {/* Widget - shown only after auth succeeds */}
      {showWidget && (
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsAuthenticated(false);
              setShowWidget(false);
            }}
            aria-label="Close virtual try-on"
            className="absolute right-2 top-2 z-50 inline-flex h-9 w-9 items-center justify-center rounded-md bg-background/90 text-foreground shadow-lg backdrop-blur transition hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>

          {/* SDK will inject the iframe here */}
          <div
            key={`${productId}-${size}-widget`}
            id="pidy-tryon"
            data-product-id={productId}
            data-size={size || "M"}
            data-pidy-tryon
            style={{
              width: "400px",
              height: "620px",
              position: "relative",
            }}
          />
        </div>
      )}
    </div>
  );
}
