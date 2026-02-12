import { Link } from 'react-router-dom';
import { Image, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { TryonGeneration } from '../types';

interface GenerationCardProps {
  generation: TryonGeneration;
  predictionId: string;
}

const formatDuration = (ms: number | null) => {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatCost = (cost: number | null) => {
  if (cost == null) return '-';
  return `$${cost.toFixed(4)}`;
};

export const GenerationCard = ({ generation, predictionId }: GenerationCardProps) => {
  const isFailed = generation.status === 'failed';

  return (
    <Link
      to={`/testing/predictions/${predictionId}/generations/${generation.id}`}
      className={`glass-card rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] block group ${
        isFailed ? 'ring-1 ring-destructive/30' : ''
      }`}
    >
      {/* Image */}
      <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
        {generation.generated_image_url ? (
          <img
            src={generation.generated_image_url}
            alt={`Generation #${generation.generation_number}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : isFailed ? (
          <div className="w-full h-full flex flex-col items-center justify-center px-4 text-center">
            <AlertTriangle className="w-10 h-10 text-destructive/60 mb-3" />
            <p className="text-xs text-destructive/80 font-medium mb-1">Generation Failed</p>
            {generation.error_message && (
              <p className="text-[10px] text-muted-foreground/70 line-clamp-3 leading-relaxed">
                {generation.error_message}
              </p>
            )}
            {generation.error_stage && (
              <Badge variant="error" className="mt-2 text-[9px]">{generation.error_stage}</Badge>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Image className="w-10 h-10 opacity-30" />
          </div>
        )}

        {/* Status overlay */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={generation.status} />
        </div>

        {/* Generation number */}
        <div className="absolute top-2 left-2 bg-background/70 backdrop-blur-sm rounded-md px-2 py-1">
          <span className="text-micro text-foreground font-semibold">#{generation.generation_number}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="accent" className="text-[10px]">
            {generation.provider}
          </Badge>
          {generation.image_model && (
            <Badge variant="secondary" className="text-[10px]">
              {generation.image_model}
            </Badge>
          )}
        </div>

        {isFailed ? (
          <p className="text-micro text-destructive/70 line-clamp-2">
            {generation.error_message || 'Unknown error'}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 text-caption text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(generation.total_duration_ms)}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatCost(generation.total_cost)}
              </span>
            </div>

            {generation.prompt_input_tokens != null && (
              <p className="text-micro text-muted-foreground/70">
                {generation.prompt_input_tokens.toLocaleString()} in / {(generation.prompt_output_tokens || 0).toLocaleString()} out tokens
              </p>
            )}
          </>
        )}
      </div>
    </Link>
  );
};
