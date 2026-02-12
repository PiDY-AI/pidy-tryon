import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Image, Clock, DollarSign, Hash } from 'lucide-react';
import { TestingLayout } from '../components/TestingLayout';
import { StatusBadge } from '../components/StatusBadge';
import { MetadataTable } from '../components/MetadataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TryonGeneration } from '../types';

const formatDuration = (ms: number | null) => {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatCost = (cost: number | null) => {
  if (cost == null) return '-';
  return `$${cost.toFixed(6)}`;
};

const formatTokens = (count: number | null) => {
  if (count == null) return '-';
  return count.toLocaleString();
};

const GenerationDetailPage = () => {
  const { predictionId, generationId } = useParams<{ predictionId: string; generationId: string }>();
  const [generation, setGeneration] = useState<TryonGeneration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generationId) {
      setIsLoading(false);
      return;
    }

    const fetchGeneration = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('tryon_generations')
          .select('*')
          .eq('id', generationId)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        setGeneration(data as TryonGeneration);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch generation';
        setError(message);
        console.error('Error fetching generation:', message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGeneration();
  }, [generationId]);

  if (isLoading) {
    return (
      <TestingLayout>
        <div className="space-y-6">
          <Skeleton className="h-6 w-48" />
          <div className="flex flex-col lg:flex-row gap-6">
            <Skeleton className="aspect-[3/4] w-full lg:w-1/2 rounded-xl" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        </div>
      </TestingLayout>
    );
  }

  if (error || !generation) {
    return (
      <TestingLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-h3 text-foreground mb-2">Failed to load generation</h2>
          <p className="text-body text-muted-foreground mb-6">{error || 'Generation not found'}</p>
          <Link to={predictionId ? `/testing/predictions/${predictionId}` : '/testing/predictions'}>
            <Button variant="secondary">Go Back</Button>
          </Link>
        </div>
      </TestingLayout>
    );
  }

  const promptSections = [
    { title: 'Extracted Prompt', content: generation.extracted_prompt, defaultOpen: true },
    { title: 'System Prompt', content: generation.system_prompt, defaultOpen: false },
    { title: 'User Message', content: generation.user_message, defaultOpen: false },
    { title: 'Raw LLM Response', content: generation.raw_llm_response, defaultOpen: false },
    { title: 'Image Prompt Sent', content: generation.image_prompt_sent, defaultOpen: false },
  ].filter((s) => s.content);

  return (
    <TestingLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          to={`/testing/predictions/${predictionId}`}
          className="inline-flex items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Prediction
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3">
          <h1 className="text-h2 text-foreground">Generation #{generation.generation_number}</h1>
          <StatusBadge status={generation.status} />
        </div>

        {/* Main content: Image + Metadata */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Image */}
          <div className="w-full lg:w-1/2">
            <div className="glass-card rounded-xl overflow-hidden">
              {generation.generated_image_url ? (
                <img
                  src={generation.generated_image_url}
                  alt={`Generation #${generation.generation_number}`}
                  className="w-full object-contain max-h-[600px]"
                />
              ) : (
                <div className="aspect-[3/4] flex items-center justify-center bg-secondary">
                  <Image className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Error info */}
            {generation.error_message && (
              <div className="mt-4 glass-card rounded-xl p-4 border border-destructive/30">
                <h3 className="text-small text-destructive uppercase tracking-wider mb-2">Error</h3>
                <p className="text-caption text-destructive/80">{generation.error_message}</p>
                {generation.error_stage && (
                  <Badge variant="error" className="mt-2">{generation.error_stage}</Badge>
                )}
              </div>
            )}
          </div>

          {/* Metadata sidebar */}
          <div className="flex-1 space-y-4">
            {/* Provider Info */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-small text-primary mb-3 uppercase tracking-wider">Provider</h3>
              <MetadataTable
                items={[
                  { label: 'Provider', value: <Badge variant="accent">{generation.provider}</Badge> },
                  { label: 'Prompt Model', value: generation.prompt_model || '-' },
                  { label: 'Image Model', value: generation.image_model || '-' },
                  { label: 'Generation #', value: `${generation.generation_number}` },
                  { label: 'Generation ID', value: <span className="font-mono text-xs">{generation.id}</span> },
                ]}
              />
            </div>

            {/* Timing */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-small text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Timing
              </h3>
              <MetadataTable
                items={[
                  { label: 'Total Duration', value: formatDuration(generation.total_duration_ms) },
                  { label: 'Prompt Duration', value: formatDuration(generation.prompt_duration_ms) },
                  { label: 'Image Duration', value: formatDuration(generation.image_duration_ms) },
                ]}
              />
            </div>

            {/* Cost */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-small text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                Cost
              </h3>
              <MetadataTable
                items={[
                  { label: 'Total Cost', value: formatCost(generation.total_cost) },
                  { label: 'Prompt Cost', value: formatCost(generation.prompt_cost) },
                  { label: 'Image Cost', value: formatCost(generation.image_cost) },
                ]}
              />
            </div>

            {/* Tokens */}
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-small text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                Tokens
              </h3>
              <MetadataTable
                items={[
                  { label: 'Input Tokens', value: formatTokens(generation.prompt_input_tokens) },
                  { label: 'Output Tokens', value: formatTokens(generation.prompt_output_tokens) },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Prompts (full width, collapsible) */}
        {promptSections.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-h3 text-foreground">Prompts</h2>
            {promptSections.map((section) => (
              <Collapsible key={section.title} defaultOpen={section.defaultOpen}>
                <div className="glass-card rounded-xl p-4">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <h3 className="text-small text-primary uppercase tracking-wider">{section.title}</h3>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
                      {section.content}
                    </pre>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Raw Image Response (if available) */}
        {generation.raw_image_response && (
          <Collapsible>
            <div className="glass-card rounded-xl p-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h3 className="text-small text-primary uppercase tracking-wider">Raw Image API Response</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
                  {JSON.stringify(generation.raw_image_response, null, 2)}
                </pre>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </div>
    </TestingLayout>
  );
};

export default GenerationDetailPage;
