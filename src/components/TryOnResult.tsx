import { useEffect, useState } from 'react';
import { TryOnResult as TryOnResultType, Product } from '@/types/measurements';
import { X } from 'lucide-react';
import pidyLogo from '@/assets/pidy-logo.png';
import { Button } from '@/components/ui/button';

interface TryOnResultProps {
  result: TryOnResultType;
  product: Product;
  onClose: () => void;
}

export const TryOnResult = ({ result, product, onClose }: TryOnResultProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [base64Src, setBase64Src] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const postToParent = (payload: Record<string, unknown>) => {
    try {
      window.parent?.postMessage({ source: 'pidy-widget', ...payload }, '*');
    } catch { /* ignore */ }
  };

  useEffect(() => {
    console.log('[TryOnResult] result object received:', result);
    postToParent({
      type: 'pidy-tryon-result',
      hasImages: Array.isArray(result.images) && result.images.length > 0,
      firstImage: result.images?.[0] ?? null,
      fitScore: result.fitScore,
      recommendedSize: result.recommendedSize,
    });
  }, [result]);

  const imageUrl = result.images?.[0];
  const rawImageSrc = imageUrl && !imageUrl.startsWith('data:') ? encodeURI(imageUrl) : imageUrl;
  const imageSrc = base64Src || rawImageSrc;

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
    setBase64Src(null);
    setIsConverting(false);
  }, [rawImageSrc]);

  // Convert to base64 for cross-origin compatibility
  useEffect(() => {
    if (!rawImageSrc || rawImageSrc.startsWith('data:')) return;
    
    let cancelled = false;
    
    const convertToBase64 = async () => {
      setIsConverting(true);
      try {
        const response = await fetch(rawImageSrc, { mode: 'cors', credentials: 'omit' });
        if (cancelled || !response.ok) { setIsConverting(false); return; }
        
        const blob = await response.blob();
        if (cancelled) return;
        
        const reader = new FileReader();
        reader.onloadend = () => {
          if (cancelled) return;
          setBase64Src(reader.result as string);
          setIsConverting(false);
        };
        reader.onerror = () => { if (!cancelled) setIsConverting(false); };
        reader.readAsDataURL(blob);
      } catch {
        if (!cancelled) setIsConverting(false);
      }
    };

    convertToBase64();
    return () => { cancelled = true; };
  }, [rawImageSrc]);

  return (
    <div className="glass-luxury rounded-lg overflow-hidden animate-scale-in">
      <div className="relative">
        {imageSrc && !imageFailed ? (
          <div className="aspect-[3/4] min-h-[300px] bg-gradient-to-br from-secondary via-muted to-secondary relative overflow-hidden">
            <img 
              src={imageSrc}
              alt={`Virtual try-on of ${product.name}`}
              className="absolute inset-0 w-full h-full object-contain z-[1]"
              loading="eager"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={(e) => { 
                e.currentTarget.style.display = 'none'; // Immediately hide broken image placeholder
                setImageFailed(true); 
                setImageLoaded(false); 
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,hsl(0_0%_0%/0.3)_100%)] z-[2] pointer-events-none" />
            {!imageLoaded && !imageFailed && (
              <div className="absolute inset-0 flex items-center justify-center z-[3]">
                <div className="px-4 py-2 bg-background/60 backdrop-blur-sm border border-primary/20 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Loading...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-secondary via-muted to-secondary flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.08),transparent_70%)]" />
            <div className="text-center z-10 animate-float p-6">
              <img src={pidyLogo} alt="PIDY" className="w-10 h-10 mx-auto mb-3 opacity-60" />
              <p className="font-display text-lg text-foreground">
                {imageFailed ? 'Unable to Load' : 'Complete'}
              </p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">{product.name}</p>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};