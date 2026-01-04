import { TryOnResult as TryOnResultType, Product } from '@/types/measurements';
import { CheckCircle, AlertCircle, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TryOnResultProps {
  result: TryOnResultType;
  product: Product;
  onClose: () => void;
}

export const TryOnResult = ({ result, product, onClose }: TryOnResultProps) => {
  const getFitCategory = (score: number) => {
    if (score >= 85) return { label: 'Perfect Fit', color: 'text-green-400', bg: 'bg-green-400/20' };
    if (score >= 70) return { label: 'Good Fit', color: 'text-primary', bg: 'bg-primary/20' };
    if (score >= 50) return { label: 'Moderate Fit', color: 'text-yellow-400', bg: 'bg-yellow-400/20' };
    return { label: 'Consider Other Size', color: 'text-orange-400', bg: 'bg-orange-400/20' };
  };

  const fitCategory = getFitCategory(result.fitScore);

  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-scale-in">
      <div className="relative">
        {result.images && result.images.length > 0 ? (
          <div className="aspect-[3/4] bg-gradient-to-br from-secondary to-muted relative overflow-hidden">
            <img 
              src={result.images[0]} 
              alt={`Virtual try-on of ${product.name}`}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-secondary to-muted flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_70%)]" />
            <div className="text-center z-10 animate-float">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground">Virtual Try-On Complete</p>
              <p className="text-sm text-muted-foreground mt-1">{product.name}</p>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-3 right-3"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Size recommendation */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Recommended Size</p>
          <div className="inline-flex items-center gap-3">
            <span className="text-5xl font-bold text-gradient">{result.recommendedSize}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${fitCategory.bg} ${fitCategory.color}`}>
              {fitCategory.label}
            </span>
          </div>
        </div>

        {/* Fit score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fit Score</span>
            <span className="font-semibold text-foreground">{result.fitScore}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${result.fitScore}%` }}
            />
          </div>
        </div>

        {/* Fit notes */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Fit Notes</p>
          <div className="space-y-2">
            {result.fitNotes.map((note, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2 text-sm animate-slide-in-right"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {result.fitScore >= 70 ? (
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                )}
                <span className="text-muted-foreground">{note}</span>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full" size="lg">
          Add to Cart - Size {result.recommendedSize}
        </Button>
      </div>
    </div>
  );
};
