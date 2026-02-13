import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Clock, DollarSign, Hash, Image, Loader2,
} from 'lucide-react';
import { TestingLayout } from '../components/TestingLayout';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { TryonPrediction, TryonGeneration } from '../types';

const PROMPT_FIELDS: { key: keyof TryonGeneration; label: string }[] = [
  { key: 'extracted_prompt', label: 'Extracted Prompt' },
  { key: 'system_prompt', label: 'System Prompt' },
  { key: 'user_message', label: 'User Message' },
  { key: 'raw_llm_response', label: 'Raw LLM Response' },
  { key: 'image_prompt_sent', label: 'Image Prompt Sent' },
];

const fmt = {
  duration: (ms: number | null) => {
    if (ms == null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  },
  cost: (c: number | null) => (c == null ? '-' : `$${c.toFixed(4)}`),
  tokens: (n: number | null) => (n == null ? '-' : n.toLocaleString()),
};

const pickBestGeneration = (prediction: TryonPrediction): TryonGeneration | null => {
  const gens = prediction.tryon_generations || [];
  if (gens.length === 0) return null;

  // Prefer latest completed generation
  const completed = gens
    .filter((g) => g.status === 'completed')
    .sort((a, b) => b.generation_number - a.generation_number);
  if (completed.length > 0) return completed[0];

  // Fallback: latest overall
  return gens.sort((a, b) => b.generation_number - a.generation_number)[0];
};

const ComparePredictionsPage = () => {
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean);

  const [predictions, setPredictions] = useState<TryonPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState(PROMPT_FIELDS[0].key);

  const fetchPredictions = useCallback(async () => {
    if (ids.length === 0) {
      setIsLoading(false);
      setError('No prediction IDs provided.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tryon_predictions')
        .select('*, tryon_generations(*)')
        .in('id', ids);

      if (fetchError) throw new Error(fetchError.message);

      // Sort generations within each prediction
      const sorted = ((data || []) as TryonPrediction[]).map((p) => ({
        ...p,
        tryon_generations: (p.tryon_generations || []).sort(
          (a: TryonGeneration, b: TryonGeneration) => a.generation_number - b.generation_number
        ),
      }));

      // Preserve the order from URL params
      const ordered = ids
        .map((id) => sorted.find((p) => p.id === id))
        .filter(Boolean) as TryonPrediction[];

      setPredictions(ordered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setIsLoading(false);
    }
  }, [ids.join(',')]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const currentField = PROMPT_FIELDS.find((f) => f.key === selectedPrompt) || PROMPT_FIELDS[0];
  const columns = predictions.map((p) => ({
    prediction: p,
    generation: pickBestGeneration(p),
  }));

  if (isLoading) {
    return (
      <TestingLayout>
        <div className="space-y-6">
          <Link
            to="/testing/predictions"
            className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Predictions
          </Link>
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-body text-muted-foreground">Loading predictions...</span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${ids.length}, 1fr)` }}>
            {ids.map((id) => (
              <Skeleton key={id} className="h-[600px] rounded-xl" />
            ))}
          </div>
        </div>
      </TestingLayout>
    );
  }

  if (error || predictions.length === 0) {
    return (
      <TestingLayout>
        <div className="space-y-6">
          <Link
            to="/testing/predictions"
            className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Predictions
          </Link>
          <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-body text-destructive">{error || 'No predictions found.'}</p>
          </div>
        </div>
      </TestingLayout>
    );
  }

  return (
    <TestingLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          to="/testing/predictions"
          className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Predictions
        </Link>

        {/* Title */}
        <div>
          <h1 className="text-h2 text-foreground">Compare Predictions</h1>
          <p className="text-caption text-muted-foreground mt-1">
            Comparing {predictions.length} predictions side by side
          </p>
        </div>

        {/* Prompt type selector */}
        <div className="flex items-center gap-3">
          <Label className="text-caption text-muted-foreground shrink-0">Prompt:</Label>
          <Select value={selectedPrompt as string} onValueChange={(val) => setSelectedPrompt(val as keyof TryonGeneration)}>
            <SelectTrigger className="w-[220px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROMPT_FIELDS.map((f) => (
                <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Side-by-side columns */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
          {columns.map(({ prediction, generation }) => {
            const content = generation ? (generation[currentField.key] as string | null) : null;

            return (
              <div key={prediction.id} className="glass-card rounded-xl overflow-hidden flex flex-col">
                {/* Column header — prediction info */}
                <div className="p-3 border-b border-border/30 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-primary uppercase tracking-wider font-medium truncate">
                      {prediction.category || 'Uncategorized'}
                    </p>
                    {generation && <StatusBadge status={generation.status} />}
                  </div>
                  <Link
                    to={`/testing/predictions/${prediction.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {prediction.product_name || prediction.product_id}
                  </Link>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Size {prediction.size}</span>
                    {generation && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        <Badge variant="accent" className="text-[9px]">{generation.provider}</Badge>
                        {generation.image_model && (
                          <Badge variant="secondary" className="text-[9px]">{generation.image_model}</Badge>
                        )}
                      </>
                    )}
                  </div>
                  {generation && (
                    <p className="text-[10px] text-muted-foreground">
                      Generation #{generation.generation_number}
                      {(prediction.tryon_generations?.length || 0) > 1 && (
                        <span className="text-muted-foreground/50"> of {prediction.tryon_generations?.length}</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Image */}
                <div className="aspect-[4/3] relative overflow-hidden bg-secondary shrink-0">
                  {generation?.generated_image_url ? (
                    <img
                      src={generation.generated_image_url}
                      alt={prediction.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Image className="w-8 h-8 opacity-30" />
                    </div>
                  )}
                </div>

                {/* Prompt content */}
                <div className="flex-1 p-3">
                  {content ? (
                    <pre className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-[500px] overflow-y-auto">
                      {content}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-caption text-muted-foreground/50">
                      {generation ? `No ${currentField.label.toLowerCase()} available` : 'No generations'}
                    </div>
                  )}
                </div>

                {/* Column footer with metrics */}
                {generation && (
                  <div className="p-3 border-t border-border/30 flex items-center gap-3 text-micro text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmt.duration(generation.total_duration_ms)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {fmt.cost(generation.total_cost)}
                    </span>
                    {generation.prompt_input_tokens != null && (
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {fmt.tokens(generation.prompt_input_tokens)} in
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TestingLayout>
  );
};

export default ComparePredictionsPage;
