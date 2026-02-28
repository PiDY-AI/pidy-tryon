import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, FlaskConical, Layers, Image,
  Clock, DollarSign, Hash, ChevronDown, Trash2, Loader2,
} from 'lucide-react';
import { TestingLayout } from '../components/TestingLayout';
import { GenerationCard } from '../components/GenerationCard';
import { MetadataTable } from '../components/MetadataTable';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { usePredictionDetail } from '../hooks/usePredictionDetail';
import { TryonGeneration } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const fmt = {
  duration: (ms: number | null) => {
    if (ms == null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  },
  cost: (c: number | null) => (c == null ? '-' : `$${c.toFixed(4)}`),
  tokens: (n: number | null) => (n == null ? '-' : n.toLocaleString()),
};

// ── Gallery View ──────────────────────────────────────────
const GalleryView = ({ generations, predictionId }: { generations: TryonGeneration[]; predictionId: string }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {generations.map((gen) => (
      <GenerationCard key={gen.id} generation={gen} predictionId={predictionId} />
    ))}
  </div>
);

// ── Compare View ──────────────────────────────────────────
const CompareView = ({ generations, predictionId }: { generations: TryonGeneration[]; predictionId: string }) => (
  <div className="glass-card rounded-xl overflow-hidden">
    <ScrollArea className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Image</TableHead>
            <TableHead className="w-[40px]">#</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Image Model</TableHead>
            <TableHead className="text-right">Prompt Time</TableHead>
            <TableHead className="text-right">Image Time</TableHead>
            <TableHead className="text-right">Total Time</TableHead>
            <TableHead className="text-right">Tokens In</TableHead>
            <TableHead className="text-right">Tokens Out</TableHead>
            <TableHead className="text-right">Prompt Cost</TableHead>
            <TableHead className="text-right">Image Cost</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {generations.map((gen) => (
            <TableRow key={gen.id} className="group">
              <TableCell className="p-1">
                <Link to={`/testing/predictions/${predictionId}/generations/${gen.id}`}>
                  {gen.generated_image_url ? (
                    <img
                      src={gen.generated_image_url}
                      alt={`#${gen.generation_number}`}
                      className="w-14 h-14 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-md bg-secondary flex items-center justify-center">
                      <Image className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  )}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs">{gen.generation_number}</TableCell>
              <TableCell><StatusBadge status={gen.status} /></TableCell>
              <TableCell>
                <Badge variant="accent" className="text-[10px]">{gen.provider}</Badge>
              </TableCell>
              <TableCell className="text-caption">{gen.image_model || '-'}</TableCell>
              <TableCell className="text-right text-caption">{fmt.duration(gen.prompt_duration_ms)}</TableCell>
              <TableCell className="text-right text-caption">{fmt.duration(gen.image_duration_ms)}</TableCell>
              <TableCell className="text-right text-caption font-medium">{fmt.duration(gen.total_duration_ms)}</TableCell>
              <TableCell className="text-right text-caption">{fmt.tokens(gen.prompt_input_tokens)}</TableCell>
              <TableCell className="text-right text-caption">{fmt.tokens(gen.prompt_output_tokens)}</TableCell>
              <TableCell className="text-right text-caption">{fmt.cost(gen.prompt_cost)}</TableCell>
              <TableCell className="text-right text-caption">{fmt.cost(gen.image_cost)}</TableCell>
              <TableCell className="text-right text-caption font-medium">{fmt.cost(gen.total_cost)}</TableCell>
            </TableRow>
          ))}
          {/* Totals row */}
          {generations.length > 1 && (
            <TableRow className="border-t-2 border-primary/20 font-medium">
              <TableCell colSpan={5} className="text-caption text-primary">
                Total ({generations.length} generations)
              </TableCell>
              <TableCell className="text-right text-caption">-</TableCell>
              <TableCell className="text-right text-caption">-</TableCell>
              <TableCell className="text-right text-caption text-primary">
                {fmt.duration(generations.reduce((s, g) => s + (g.total_duration_ms || 0), 0))}
              </TableCell>
              <TableCell className="text-right text-caption">
                {fmt.tokens(generations.reduce((s, g) => s + (g.prompt_input_tokens || 0), 0))}
              </TableCell>
              <TableCell className="text-right text-caption">
                {fmt.tokens(generations.reduce((s, g) => s + (g.prompt_output_tokens || 0), 0))}
              </TableCell>
              <TableCell className="text-right text-caption">
                {fmt.cost(generations.reduce((s, g) => s + (g.prompt_cost || 0), 0))}
              </TableCell>
              <TableCell className="text-right text-caption">
                {fmt.cost(generations.reduce((s, g) => s + (g.image_cost || 0), 0))}
              </TableCell>
              <TableCell className="text-right text-caption text-primary">
                {fmt.cost(generations.reduce((s, g) => s + (g.total_cost || 0), 0))}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  </div>
);

// ── Prompts View (side-by-side comparison) ────────────────
const PROMPT_FIELDS: { key: keyof TryonGeneration; label: string }[] = [
  { key: 'extracted_prompt', label: 'Extracted Prompt' },
  { key: 'system_prompt', label: 'System Prompt' },
  { key: 'user_message', label: 'User Message' },
  { key: 'raw_llm_response', label: 'Raw LLM Response' },
  { key: 'image_prompt_sent', label: 'Image Prompt Sent' },
];

const PromptsView = ({ generations }: { generations: TryonGeneration[] }) => {
  const [selectedPrompt, setSelectedPrompt] = useState(PROMPT_FIELDS[0].key);

  const currentField = PROMPT_FIELDS.find((f) => f.key === selectedPrompt) || PROMPT_FIELDS[0];

  // For single generation, show all prompts stacked
  if (generations.length === 1) {
    const gen = generations[0];
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h3 className="text-h4 text-foreground">Generation #{gen.generation_number}</h3>
          <Badge variant="accent" className="text-[10px]">{gen.provider}</Badge>
          <StatusBadge status={gen.status} />
        </div>
        {PROMPT_FIELDS.map(({ key, label }) => {
          const content = gen[key] as string | null;
          if (!content) return null;
          return (
            <Collapsible key={key} defaultOpen={key === 'extracted_prompt'}>
              <div className="glass-card rounded-xl p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <h4 className="text-small text-primary uppercase tracking-wider">{label}</h4>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words max-h-[500px] overflow-y-auto">
                    {content}
                  </pre>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>
    );
  }

  // Multiple generations: side-by-side comparison
  return (
    <div className="space-y-4">
      {/* Prompt type selector */}
      <div className="flex items-center gap-3">
        <Label className="text-caption text-muted-foreground shrink-0">Compare:</Label>
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
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(generations.length, 3)}, 1fr)` }}>
        {generations.map((gen) => {
          const content = gen[currentField.key] as string | null;
          return (
            <div key={gen.id} className="glass-card rounded-xl overflow-hidden flex flex-col">
              {/* Column header */}
              <div className="p-3 border-b border-border/30 flex items-center gap-2 shrink-0">
                <span className="text-small text-foreground font-semibold">#{gen.generation_number}</span>
                <Badge variant="accent" className="text-[9px]">{gen.provider}</Badge>
                {gen.image_model && (
                  <Badge variant="secondary" className="text-[9px]">{gen.image_model}</Badge>
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
                    No {currentField.label.toLowerCase()} available
                  </div>
                )}
              </div>

              {/* Column footer with quick metrics */}
              <div className="p-3 border-t border-border/30 flex items-center gap-3 text-micro text-muted-foreground shrink-0">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {fmt.duration(gen.total_duration_ms)}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {fmt.cost(gen.total_cost)}
                </span>
                {gen.prompt_input_tokens != null && (
                  <span>{fmt.tokens(gen.prompt_input_tokens)} tok in</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overflow notice for >3 generations */}
      {generations.length > 3 && (
        <p className="text-micro text-muted-foreground/60 text-center">
          Showing first 3 generations. Use the Detail tab to inspect each one individually.
        </p>
      )}
    </div>
  );
};

// ── Detail View (single generation deep-dive, inline) ─────
const DetailView = ({ generations, predictionId }: { generations: TryonGeneration[]; predictionId: string }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const gen = generations[selectedIdx];

  if (!gen) return null;

  const promptSections = [
    { title: 'Extracted Prompt', content: gen.extracted_prompt, defaultOpen: true },
    { title: 'System Prompt', content: gen.system_prompt, defaultOpen: false },
    { title: 'User Message', content: gen.user_message, defaultOpen: false },
    { title: 'Raw LLM Response', content: gen.raw_llm_response, defaultOpen: false },
    { title: 'Image Prompt Sent', content: gen.image_prompt_sent, defaultOpen: false },
  ].filter((s) => s.content);

  return (
    <div className="space-y-4">
      {/* Generation selector */}
      {generations.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {generations.map((g, i) => (
            <Button
              key={g.id}
              variant={i === selectedIdx ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSelectedIdx(i)}
              className="gap-1.5"
            >
              #{g.generation_number}
              <Badge
                variant={g.status === 'completed' ? 'success' : g.status === 'failed' ? 'error' : 'secondary'}
                className="text-[9px] px-1 py-0 ml-0.5"
              >
                {g.provider.split('-')[0]}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {/* Selected generation detail */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Image */}
        <div className="w-full lg:w-1/2">
          <div className="glass-card rounded-xl overflow-hidden">
            {gen.generated_image_url ? (
              <img
                src={gen.generated_image_url}
                alt={`Generation #${gen.generation_number}`}
                className="w-full object-contain max-h-[600px]"
              />
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center bg-secondary">
                <Image className="w-16 h-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {gen.error_message && (
            <div className="mt-4 glass-card rounded-xl p-4 border border-destructive/30">
              <h4 className="text-small text-destructive uppercase tracking-wider mb-2">Error</h4>
              <p className="text-caption text-destructive/80">{gen.error_message}</p>
              {gen.error_stage && <Badge variant="error" className="mt-2">{gen.error_stage}</Badge>}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex-1 space-y-4">
          <div className="glass-card rounded-xl p-4">
            <h4 className="text-small text-primary mb-3 uppercase tracking-wider">Provider</h4>
            <MetadataTable
              items={[
                { label: 'Provider', value: <Badge variant="accent">{gen.provider}</Badge> },
                { label: 'Prompt Model', value: gen.prompt_model || '-' },
                { label: 'Image Model', value: gen.image_model || '-' },
                { label: 'Generation #', value: `${gen.generation_number}` },
                { label: 'ID', value: <span className="font-mono text-xs">{gen.id}</span> },
              ]}
            />
          </div>

          <div className="glass-card rounded-xl p-4">
            <h4 className="text-small text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Timing
            </h4>
            <MetadataTable
              items={[
                { label: 'Total', value: fmt.duration(gen.total_duration_ms) },
                { label: 'Prompt', value: fmt.duration(gen.prompt_duration_ms) },
                { label: 'Image', value: fmt.duration(gen.image_duration_ms) },
              ]}
            />
          </div>

          <div className="glass-card rounded-xl p-4">
            <h4 className="text-small text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" /> Cost
            </h4>
            <MetadataTable
              items={[
                { label: 'Total', value: fmt.cost(gen.total_cost) },
                { label: 'Prompt', value: fmt.cost(gen.prompt_cost) },
                { label: 'Image', value: fmt.cost(gen.image_cost) },
              ]}
            />
          </div>

          <div className="glass-card rounded-xl p-4">
            <h4 className="text-small text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
              <Hash className="w-3.5 h-3.5" /> Tokens
            </h4>
            <MetadataTable
              items={[
                { label: 'Input', value: fmt.tokens(gen.prompt_input_tokens) },
                { label: 'Output', value: fmt.tokens(gen.prompt_output_tokens) },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Prompts */}
      {promptSections.length > 0 && (
        <div className="space-y-3">
          {promptSections.map((section) => (
            <Collapsible key={section.title} defaultOpen={section.defaultOpen}>
              <div className="glass-card rounded-xl p-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <h4 className="text-small text-primary uppercase tracking-wider">{section.title}</h4>
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
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────
const PredictionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prediction, isLoading, error } = usePredictionDetail(id);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!prediction || !window.confirm('Delete this prediction and all its generations? This cannot be undone.')) return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please sign in to delete predictions');
        return;
      }

      const functionsUrl = `${(supabase as any).functionsUrl || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`}`;
      const response = await fetch(`${functionsUrl}/tryon-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ deletePredictionId: prediction.id }),
      });

      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.message || data?.message || 'Failed to delete prediction');
      }

      toast.success('Prediction deleted');
      navigate('/testing/predictions');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete prediction');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <TestingLayout>
        <div className="space-y-6">
          <Skeleton className="h-6 w-48" />
          <div className="glass-card rounded-xl p-6 space-y-4">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        </div>
      </TestingLayout>
    );
  }

  if (error || !prediction) {
    return (
      <TestingLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-h3 text-foreground mb-2">Failed to load prediction</h2>
          <p className="text-body text-muted-foreground mb-6">{error || 'Prediction not found'}</p>
          <Link to="/testing/predictions">
            <Button variant="secondary">Back to Predictions</Button>
          </Link>
        </div>
      </TestingLayout>
    );
  }

  const generations = prediction.tryon_generations || [];

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

        {/* Header Card */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-primary uppercase tracking-wider font-medium">
                {prediction.category || 'Uncategorized'}
              </p>
              <h1 className="text-h2 text-foreground mt-1">
                {prediction.product_name || prediction.product_id}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-caption text-muted-foreground">
                  {generations.length} generation{generations.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-1.5"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <MetadataTable
              items={[
                { label: 'Size', value: prediction.size || '-' },
                { label: 'Body Type', value: prediction.body_type || '-' },
                { label: 'Garment', value: prediction.garment_type || '-' },
                { label: 'Created', value: getTimeAgo(prediction.created_at) },
              ]}
              className="flex-1 min-w-[200px]"
            />
            <div className="flex-1 min-w-[200px]">
              <p className="text-caption text-muted-foreground mb-1.5">Prediction ID</p>
              <p className="font-mono text-xs text-foreground/70 break-all">{prediction.id}</p>

              {prediction.notes && (
                <>
                  <p className="text-caption text-muted-foreground mb-1.5 mt-3">Notes</p>
                  <p className="text-caption text-foreground/80">{prediction.notes}</p>
                </>
              )}

              {prediction.tags && prediction.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {prediction.tags.map((tag) => (
                    <Badge key={tag} variant="accent" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fit Calculations */}
        {prediction.fit_calculations && (
          <Collapsible>
            <div className="glass-card rounded-xl p-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h3 className="text-small text-primary uppercase tracking-wider">Fit Calculations</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(prediction.fit_calculations, null, 2)}
                </pre>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Body Measurements */}
        {prediction.body_measurements && (
          <Collapsible>
            <div className="glass-card rounded-xl p-4">
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h3 className="text-small text-primary uppercase tracking-wider">Body Measurements</h3>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(prediction.body_measurements, null, 2)}
                </pre>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {/* Generations with View Modes */}
        <div>
          {generations.length === 0 ? (
            <>
              <h2 className="text-h3 text-foreground mb-4">Generations</h2>
              <EmptyState
                icon={FlaskConical}
                title="No generations yet"
                description="This prediction has no generations. Run a test to create one."
              />
            </>
          ) : (
            <Tabs defaultValue="gallery">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-h3 text-foreground">Generations</h2>
                <TabsList>
                  <TabsTrigger value="gallery">Gallery</TabsTrigger>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                  <TabsTrigger value="prompts">Prompts</TabsTrigger>
                  <TabsTrigger value="detail">Detail</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="gallery">
                <GalleryView generations={generations} predictionId={prediction.id} />
              </TabsContent>

              <TabsContent value="compare">
                <CompareView generations={generations} predictionId={prediction.id} />
              </TabsContent>

              <TabsContent value="prompts">
                <PromptsView generations={generations} />
              </TabsContent>

              <TabsContent value="detail">
                <DetailView generations={generations} predictionId={prediction.id} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </TestingLayout>
  );
};

export default PredictionDetailPage;
