import { useEffect, useState } from 'react';
import { TryOnResult as TryOnResultType, Product } from '@/types/measurements';
import { CheckCircle, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import pidyLogo from '@/assets/pidy-logo.png';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
const PromptSection = ({ prompt }: { prompt: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const truncatedPrompt = prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2">
        <CollapsibleTrigger className="flex items-center justify-between w-full text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors">
          <span>Generation Details</span>
          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </CollapsibleTrigger>
        {!isOpen && (
          <p className="text-[10px] text-muted-foreground/70 bg-secondary/30 px-3 py-2 border border-border/50 italic truncate">
            {truncatedPrompt}
          </p>
        )}
        <CollapsibleContent>
          <p className="text-[10px] text-muted-foreground/70 bg-secondary/30 px-3 py-2 border border-border/50 italic leading-relaxed">
            {prompt}
          </p>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface TryOnResultProps {
  result: TryOnResultType;
  product: Product;
  onClose: () => void;
}

export const TryOnResult = ({ result, product, onClose }: TryOnResultProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [base64Src, setBase64Src] = useState<string | null>(null);
  const [isConvertingToBase64, setIsConvertingToBase64] = useState(false);

  const postToParent = (payload: Record<string, unknown>) => {
    try {
      // Useful when debugging inside a third-party brand site (inspect in the parent window console)
      window.parent?.postMessage(
        {
          source: 'pidy-widget',
          ...payload,
        },
        '*'
      );
    } catch {
      // ignore
    }
  };

  // DEBUG: confirm backend payload + derived URL
  useEffect(() => {
    console.log('[TryOnResult] result object received:', result);
    console.log('[TryOnResult] result.images:', result.images);
    console.log('[TryOnResult] result.images[0]:', result.images?.[0]);

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
  
  // Use base64 version if available, otherwise use original URL
  const imageSrc = base64Src || rawImageSrc;

  useEffect(() => {
    console.log('[TryOnResult] imageUrl:', imageUrl);
    console.log('[TryOnResult] imageSrc (processed):', imageSrc);

    postToParent({
      type: 'pidy-image-src',
      imageUrl: imageUrl ?? null,
      imageSrc: imageSrc ?? null,
    });
  }, [imageUrl, imageSrc]);

  // Reset between results so a previous failure/loading state doesn't stick
  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
    setBase64Src(null);
    setIsConvertingToBase64(false);
  }, [rawImageSrc]);

  // Proactively convert to base64 for cross-origin compatibility
  useEffect(() => {
    // Skip if no URL, already base64, or conversion in progress
    if (!rawImageSrc || rawImageSrc.startsWith('data:')) return;
    
    // Use a ref pattern via closure to track if this effect is still valid
    let cancelled = false;
    
    const convertToBase64 = async () => {
      setIsConvertingToBase64(true);
      try {
        console.log('[TryOnResult] Converting image to base64:', rawImageSrc);
        
        // Try standard fetch first
        let response: Response;
        try {
          response = await fetch(rawImageSrc, {
            mode: 'cors',
            credentials: 'omit',
          });
        } catch (corsError) {
          console.warn('[TryOnResult] CORS fetch failed, image will load directly:', corsError);
          if (!cancelled) setIsConvertingToBase64(false);
          // Let the img tag try to load directly
          return;
        }
        
        if (cancelled) return;
        
        if (!response.ok) {
          console.warn('[TryOnResult] Fetch returned non-OK status:', response.status);
          setIsConvertingToBase64(false);
          return;
        }
        
        const blob = await response.blob();
        if (cancelled) return;
        
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (cancelled) return;
          const base64 = reader.result as string;
          console.log('[TryOnResult] Base64 conversion successful, length:', base64.length);
          setBase64Src(base64);
          setIsConvertingToBase64(false);
          
          postToParent({
            type: 'pidy-image-base64',
            status: 'success',
            originalUrl: rawImageSrc,
            base64Length: base64.length,
          });
        };
        
        reader.onerror = () => {
          if (cancelled) return;
          console.error('[TryOnResult] FileReader error during base64 conversion');
          setIsConvertingToBase64(false);
        };
        
        reader.readAsDataURL(blob);
      } catch (err) {
        if (cancelled) return;
        console.error('[TryOnResult] Base64 conversion failed:', err);
        setIsConvertingToBase64(false);
        
        postToParent({
          type: 'pidy-image-base64',
          status: 'error',
          originalUrl: rawImageSrc,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    };

    convertToBase64();
    
    return () => {
      cancelled = true;
    };
  }, [rawImageSrc]); // Only depend on rawImageSrc, not base64Src

  const getFitCategory = (score: number) => {
    if (score >= 85) return { label: 'Impeccable', color: 'text-green-400', bg: 'bg-green-400/10 border border-green-400/30' };
    if (score >= 70) return { label: 'Excellent', color: 'text-primary', bg: 'bg-primary/10 border border-primary/30' };
    if (score >= 50) return { label: 'Good Fit', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border border-yellow-400/30' };
    return { label: 'Consider Sizing', color: 'text-orange-400', bg: 'bg-orange-400/10 border border-orange-400/30' };
  };

  const fitCategory = getFitCategory(result.fitScore);

  return (
    <div className="glass-luxury rounded-lg overflow-hidden animate-scale-in">
      <div className="relative">
        {imageSrc && !imageFailed ? (
          <div className="aspect-[3/4] min-h-[300px] bg-gradient-to-br from-secondary via-muted to-secondary relative overflow-hidden">
            {/* Image - positioned above gradient, below vignette */}
            <img 
              src={imageSrc}
              alt={`Virtual try-on of ${product.name}`}
              className="absolute inset-0 w-full h-full object-contain z-[1]"
              loading="eager"
              decoding="async"
              onLoad={() => {
                console.log('[TryOnResult] image loaded:', imageSrc);
                setImageLoaded(true);

                postToParent({
                  type: 'pidy-image-load',
                  status: 'loaded',
                  imageSrc: imageSrc ?? null,
                });
              }}
              onError={(e) => {
                const currentSrc = (e.currentTarget as HTMLImageElement | null)?.currentSrc;
                console.error('[TryOnResult] image failed to load:', imageSrc, 'currentSrc:', currentSrc);
                setImageFailed(true);
                setImageLoaded(false);

                postToParent({
                  type: 'pidy-image-load',
                  status: 'error',
                  imageSrc: imageSrc ?? null,
                  currentSrc: currentSrc ?? null,
                });
              }}
            />
            {/* Subtle vignette - above image */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,hsl(0_0%_0%/0.3)_100%)] z-[2] pointer-events-none" />
            {!imageLoaded && (
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
              {!imageUrl && (
                <p className="text-[9px] text-red-400 mt-3 break-all">No image URL in response</p>
              )}
              {imageUrl && imageFailed && (
                <p className="text-[9px] text-orange-400 mt-3 break-all max-w-full">
                  Failed: {imageUrl.substring(0, 80)}...
                </p>
              )}
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
      
      <div className="p-5 space-y-5">
        {/* Size recommendation - luxury presentation */}
        <div className="text-center py-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Recommended Size</p>
          <div className="flex items-center justify-center gap-4">
            <span className="font-display text-4xl text-gradient tracking-wide">{result.recommendedSize}</span>
            <span className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] font-medium ${fitCategory.bg} ${fitCategory.color}`}>
              {fitCategory.label}
            </span>
          </div>
        </div>

        {/* Fit score - minimal elegant bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-[0.1em]">
            <span className="text-muted-foreground">Fit Score</span>
            <span className="font-medium text-foreground">{result.fitScore}%</span>
          </div>
          <div className="h-1 bg-secondary/50 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out"
              style={{ width: `${result.fitScore}%` }}
            />
          </div>
        </div>

        {/* Fit notes - refined styling */}
        {result.fitNotes && result.fitNotes.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Notes</p>
            <div className="space-y-2">
              {result.fitNotes.map((note, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-2 text-xs animate-slide-in-right"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {result.fitScore >= 70 ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400/80 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-400/80 mt-0.5 shrink-0" />
                  )}
                  <span className="text-muted-foreground leading-relaxed">{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prompt section */}
        {result.prompt && (
          <div className="pt-2 border-t border-border/30">
            <PromptSection prompt={result.prompt} />
          </div>
        )}
      </div>
    </div>
  );
};
