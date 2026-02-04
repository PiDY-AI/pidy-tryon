import { useEffect, useState } from "react";
import { X } from "lucide-react";
import pidyLogo from "@/assets/pidy-logo.png";

interface VirtualTryOnBotProps {
  productId?: string;
  size?: string;
}

export function VirtualTryOnBot({ productId, size }: VirtualTryOnBotProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  // Trigger SDK autoInit when widget opens
  useEffect(() => {
    if (!isOpen || !productId) return;

    const timer = setTimeout(() => {
      if (typeof (window as any).PidyTryOn?.autoInit === 'function') {
        (window as any).PidyTryOn.autoInit();
      } else {
        console.error('PidyTryOn SDK not loaded');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, productId, size]);

  if (!productId || !tryOnEnabledProducts.includes(productId)) return null;

  return (
    <div className="w-full">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90"
        >
          <img src={pidyLogo} alt="Pidy" className="h-4 w-4" />
          Virtual Try-On
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close virtual try-on"
              className="absolute right-2 top-2 z-50 inline-flex h-9 w-9 items-center justify-center rounded-md bg-background/90 text-foreground shadow-lg backdrop-blur transition hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>

            {/* SDK will inject the iframe here */}
            <div
              key={`${productId}-${size}`}
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
        </div>
      )}
    </div>
  );
}
