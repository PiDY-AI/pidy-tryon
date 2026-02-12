import { Link } from 'react-router-dom';
import { Image, Layers, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { TryonPrediction } from '../types';

interface PredictionCardProps {
  prediction: TryonPrediction;
}

const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const PredictionCard = ({ prediction }: PredictionCardProps) => {
  const generations = prediction.tryon_generations || [];
  const latestGen = generations.length > 0
    ? generations.reduce((a, b) => (a.generation_number > b.generation_number ? a : b))
    : null;
  const thumbnailUrl = latestGen?.generated_image_url;
  const latestStatus = latestGen?.status || 'pending';

  const failedGens = generations.filter((g) => g.status === 'failed');
  const allFailed = generations.length > 0 && failedGens.length === generations.length;
  const latestError = latestGen?.status === 'failed'
    ? (latestGen as any).error_message || null
    : null;

  // Get product image as fallback
  let productImage: string | null = null;
  if (prediction.product_images) {
    if (Array.isArray(prediction.product_images)) {
      productImage = prediction.product_images[0] || null;
    } else if (typeof prediction.product_images === 'string') {
      try {
        const parsed = JSON.parse(prediction.product_images);
        productImage = Array.isArray(parsed) ? parsed[0] : null;
      } catch {
        productImage = null;
      }
    }
  }

  const imageUrl = thumbnailUrl || productImage;

  return (
    <Link
      to={`/testing/predictions/${prediction.id}`}
      className={`glass-card rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] block group ${
        allFailed ? 'ring-1 ring-destructive/30' : ''
      }`}
    >
      {/* Image */}
      <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={prediction.product_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : allFailed ? (
          <div className="w-full h-full flex flex-col items-center justify-center px-4 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive/60 mb-3" />
            <p className="text-xs text-destructive/80 font-medium mb-1">
              {failedGens.length === 1 ? 'Generation Failed' : `All ${failedGens.length} Failed`}
            </p>
            {latestError && (
              <p className="text-[10px] text-muted-foreground/70 line-clamp-3 leading-relaxed">
                {latestError}
              </p>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Image className="w-12 h-12 opacity-30" />
          </div>
        )}

        {/* Overlays */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={latestStatus} />
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-background/70 backdrop-blur-sm rounded-md px-2 py-1">
          <Layers className="w-3 h-3 text-muted-foreground" />
          <span className="text-micro text-muted-foreground">
            {generations.length}
            {failedGens.length > 0 && !allFailed && (
              <span className="text-destructive/70"> ({failedGens.length} err)</span>
            )}
          </span>
        </div>

        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-xs text-primary uppercase tracking-wider font-medium truncate">
            {prediction.category || 'Uncategorized'}
          </p>
          <h3 className="font-semibold text-foreground text-sm truncate mt-0.5">
            {prediction.product_name || prediction.product_id}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          <span>Size {prediction.size}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span>{getTimeAgo(prediction.created_at)}</span>
        </div>

        {/* Error summary for failed predictions */}
        {latestError && !allFailed && (
          <p className="text-micro text-destructive/70 line-clamp-2">{latestError}</p>
        )}

        {prediction.tags && prediction.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {prediction.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {prediction.tags.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{prediction.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};
