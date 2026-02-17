import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Loader2, AlertCircle, ExternalLink, Square, Check, X, LogIn } from 'lucide-react';
import { TestingLayout } from '../components/TestingLayout';
import { StatusBadge } from '../components/StatusBadge';
import { MetadataTable } from '../components/MetadataTable';
import { useTryonTest } from '../hooks/useTryonTest';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/hooks/useAuth';
import { TryonTestRequest } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

type TestMode = 'new' | 'add-generation';
type Provider = 'cerebras-replicate' | 'claude-openai';
type ReplicateModel = 'klein-9b' | 'flux-2-pro';

const TestRunnerPage = () => {
  const { session, loading: authLoading } = useAuth();
  const { products, isLoading: productsLoading } = useProducts();
  const { runTest, runBatch, stopBatch, isLoading, error, result, batchProgress, batchResults } = useTryonTest();

  const [mode, setMode] = useState<TestMode>('new');
  const [productId, setProductId] = useState('');
  const [size, setSize] = useState('');
  const [provider, setProvider] = useState<Provider>('cerebras-replicate');
  const [replicateModel, setReplicateModel] = useState<ReplicateModel>('klein-9b');
  const [predictionId, setPredictionId] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [runCount, setRunCount] = useState(1);

  const selectedProduct = products.find((p) => p.id === productId);

  const isAuthenticated = !authLoading && !!session;

  const handleGenerate = async () => {
    if (!session) {
      toast.error('Please sign in to run tests');
      return;
    }
    const request: TryonTestRequest = {};

    if (mode === 'new') {
      if (!productId) {
        toast.error('Please select a product');
        return;
      }
      request.productId = productId;
      if (size) request.size = size;
      if (notes) request.notes = notes;
      if (tags) request.tags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    } else {
      if (!predictionId) {
        toast.error('Please enter a prediction ID');
        return;
      }
      request.predictionId = predictionId;
    }

    request.provider = provider;
    if (provider === 'cerebras-replicate') {
      request.replicateModel = replicateModel;
    }

    if (runCount > 1) {
      await runBatch(request, runCount);
      toast.success(`Batch complete`);
    } else {
      const res = await runTest(request);
      if (res) {
        toast.success(`Generation #${res.generation_number} completed`);
      }
    }
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (ms == null) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cost: number | null | undefined) => {
    if (cost == null) return '-';
    return `$${cost.toFixed(6)}`;
  };

  const formatTokens = (count: number | null | undefined) => {
    if (count == null) return '-';
    return count.toLocaleString();
  };

  return (
    <TestingLayout>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel - Form */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-5">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h2 className="text-h3 text-foreground">Test Configuration</h2>

            {!isAuthenticated && !authLoading && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <LogIn className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-caption text-destructive">
                  Not signed in.{' '}
                  <Link to="/auth" className="underline font-medium">Sign in</Link>
                  {' '}to run tests.
                </p>
              </div>
            )}

            {/* Mode Toggle */}
            <div>
              <Label className="text-caption text-muted-foreground mb-1.5 block">Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={mode === 'new' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setMode('new')}
                  className="flex-1"
                >
                  New Prediction
                </Button>
                <Button
                  variant={mode === 'add-generation' ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setMode('add-generation')}
                  className="flex-1"
                >
                  Add Generation
                </Button>
              </div>
            </div>

            {mode === 'new' ? (
              <>
                {/* Product Select */}
                <div>
                  <Label className="text-caption text-muted-foreground mb-1.5 block">Product</Label>
                  <Select value={productId} onValueChange={(val) => { setProductId(val); setSize(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={productsLoading ? 'Loading...' : 'Select product'} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Size Select */}
                {selectedProduct && (
                  <div>
                    <Label className="text-caption text-muted-foreground mb-1.5 block">Size (optional)</Label>
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-recommend" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProduct.sizes.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <Label className="text-caption text-muted-foreground mb-1.5 block">Tags (comma-separated)</Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="regression, v2-prompt"
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-caption text-muted-foreground mb-1.5 block">Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Testing slim fit accuracy..."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label className="text-caption text-muted-foreground mb-1.5 block">Prediction ID</Label>
                <Input
                  value={predictionId}
                  onChange={(e) => setPredictionId(e.target.value)}
                  placeholder="UUID of existing prediction"
                />
              </div>
            )}

            {/* Provider is always cerebras-replicate with klein-9b */}

            {/* Run Count */}
            <div>
              <Label className="text-caption text-muted-foreground mb-1.5 block">
                Generations to Run
              </Label>
              <div className="flex items-center gap-2">
                {[1, 3, 5, 10].map((n) => (
                  <Button
                    key={n}
                    variant={runCount === n ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setRunCount(n)}
                    className="flex-1"
                  >
                    {n}
                  </Button>
                ))}
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={runCount}
                  onChange={(e) => setRunCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-16 h-9 text-center"
                />
              </div>
              {runCount > 1 && (
                <p className="text-micro text-muted-foreground/60 mt-1">
                  Run #1 creates the prediction, runs #2-{runCount} add generations to it
                </p>
              )}
            </div>

            {/* Generate Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !isAuthenticated}
                className="flex-1"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {batchProgress
                      ? `Running ${batchProgress.current}/${batchProgress.total}...`
                      : 'Generating...'}
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-4 h-4 mr-2" />
                    {runCount > 1 ? `Generate ${runCount}x` : 'Generate Try-On'}
                  </>
                )}
              </Button>
              {isLoading && batchProgress && (
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={stopBatch}
                  className="shrink-0"
                >
                  <Square className="w-4 h-4" />
                </Button>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-caption text-destructive">{error.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 min-w-0">
          {!result && !isLoading && (
            <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
              <FlaskConical className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-body text-muted-foreground">Configure and run a test to see results</p>
            </div>
          )}

          {isLoading && (
            <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px]">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              {batchProgress ? (
                <div className="w-full max-w-xs space-y-3">
                  <p className="text-body text-muted-foreground text-center">
                    Running generation {batchProgress.current} of {batchProgress.total}
                  </p>
                  <Progress value={(batchProgress.completed.length / batchProgress.total) * 100} className="h-2" />
                  <div className="flex justify-center gap-4 text-caption text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" />
                      {batchProgress.completed.length} done
                    </span>
                    {batchProgress.failed.length > 0 && (
                      <span className="flex items-center gap-1">
                        <X className="w-3 h-3 text-destructive" />
                        {batchProgress.failed.length} failed
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-body text-muted-foreground">Generating try-on image...</p>
                  <p className="text-caption text-muted-foreground/60 mt-1">This may take 5-15 seconds</p>
                </>
              )}
            </div>
          )}

          {result && !isLoading && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={result.status} />
                  <span className="text-caption text-muted-foreground">
                    {batchResults.length > 1
                      ? `${batchResults.length} generations`
                      : `Generation #${result.generation_number}`}
                  </span>
                </div>
                <Link
                  to={`/testing/predictions/${result.prediction_id}`}
                  className="text-caption text-primary hover:underline flex items-center gap-1"
                >
                  View Prediction <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Batch Summary */}
              {batchResults.length > 1 && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-small text-primary uppercase tracking-wider">Batch Summary</h3>
                    <div className="flex items-center gap-3 text-caption text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-500" />
                        {batchResults.length} completed
                      </span>
                      {batchProgress?.failed && batchProgress.failed.length > 0 && (
                        <span className="flex items-center gap-1">
                          <X className="w-3 h-3 text-destructive" />
                          {batchProgress.failed.length} failed
                        </span>
                      )}
                    </div>
                  </div>
                  <MetadataTable
                    items={[
                      {
                        label: 'Total Cost',
                        value: formatCost(batchResults.reduce((sum, r) => sum + (r.generation?.total_cost || 0), 0)),
                      },
                      {
                        label: 'Total Time',
                        value: formatDuration(batchResults.reduce((sum, r) => sum + (r.generation?.total_duration_ms || 0), 0)),
                      },
                      {
                        label: 'Avg Time / Generation',
                        value: formatDuration(
                          Math.round(
                            batchResults.reduce((sum, r) => sum + (r.generation?.total_duration_ms || 0), 0) / batchResults.length,
                          ),
                        ),
                      },
                    ]}
                  />
                  {/* Thumbnail grid of all batch images */}
                  <div className="grid grid-cols-5 gap-2">
                    {batchResults.map((br, i) => (
                      <Link
                        key={br.generation_id}
                        to={`/testing/predictions/${br.prediction_id}/generations/${br.generation_id}`}
                        className="relative aspect-[3/4] rounded-lg overflow-hidden bg-secondary hover:ring-2 ring-primary/50 transition-all"
                      >
                        {br.generation?.generated_image_url ? (
                          <img
                            src={br.generation.generated_image_url}
                            alt={`Gen #${br.generation_number}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-micro">
                            #{br.generation_number}
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-background/70 backdrop-blur-sm px-1 py-0.5 text-center">
                          <span className="text-[9px] text-muted-foreground">#{br.generation_number}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {batchProgress?.failed && batchProgress.failed.length > 0 && (
                    <div className="space-y-1">
                      {batchProgress.failed.map((f) => (
                        <p key={f.index} className="text-micro text-destructive/80">
                          Run #{f.index}: {f.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col xl:flex-row gap-4">
                {/* Image */}
                {result.generation?.generated_image_url && (
                  <div className="glass-card rounded-xl overflow-hidden xl:w-[380px] shrink-0">
                    <img
                      src={result.generation.generated_image_url}
                      alt="Generated try-on"
                      className="w-full object-contain max-h-[500px]"
                    />
                  </div>
                )}

                {/* Metadata */}
                <div className="flex-1 space-y-4">
                  {/* Prediction Info */}
                  <div className="glass-card rounded-xl p-4">
                    <h3 className="text-small text-primary mb-3 uppercase tracking-wider">Prediction</h3>
                    <MetadataTable
                      items={[
                        { label: 'Prediction ID', value: <span className="font-mono text-xs">{result.prediction_id}</span> },
                        { label: 'Product', value: result.prediction?.product_name || result.prediction?.product_id || '-' },
                        { label: 'Size', value: result.prediction?.size || '-' },
                        { label: 'Category', value: result.prediction?.category || '-' },
                        { label: 'Body Type', value: result.prediction?.body_type || '-' },
                      ]}
                    />
                  </div>

                  {/* Generation Info */}
                  <div className="glass-card rounded-xl p-4">
                    <h3 className="text-small text-primary mb-3 uppercase tracking-wider">Generation</h3>
                    <MetadataTable
                      items={[
                        { label: 'Generation ID', value: <span className="font-mono text-xs">{result.generation_id}</span> },
                        { label: 'Provider', value: result.generation?.provider || '-' },
                        { label: 'Prompt Model', value: result.generation?.prompt_model || '-' },
                        { label: 'Image Model', value: result.generation?.image_model || '-' },
                      ]}
                    />
                  </div>

                  {/* Timing & Cost */}
                  <div className="glass-card rounded-xl p-4">
                    <h3 className="text-small text-primary mb-3 uppercase tracking-wider">Performance</h3>
                    <MetadataTable
                      items={[
                        { label: 'Total Time', value: formatDuration(result.generation?.total_duration_ms) },
                        { label: 'Prompt Time', value: formatDuration(result.generation?.prompt_duration_ms) },
                        { label: 'Image Time', value: formatDuration(result.generation?.image_duration_ms) },
                        { label: 'Prompt Tokens (in)', value: formatTokens(result.generation?.prompt_tokens?.input) },
                        { label: 'Prompt Tokens (out)', value: formatTokens(result.generation?.prompt_tokens?.output) },
                        { label: 'Prompt Cost', value: formatCost(result.generation?.prompt_cost) },
                        { label: 'Image Cost', value: formatCost(result.generation?.image_cost) },
                        { label: 'Total Cost', value: formatCost(result.generation?.total_cost) },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Fit Calculations */}
              {result.prediction?.fit_calculations && (
                <Collapsible>
                  <div className="glass-card rounded-xl p-4">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <h3 className="text-small text-primary uppercase tracking-wider">Fit Calculations</h3>
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(result.prediction.fit_calculations, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Prompts */}
              {result.generation?.extracted_prompt && (
                <Collapsible defaultOpen>
                  <div className="glass-card rounded-xl p-4">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <h3 className="text-small text-primary uppercase tracking-wider">Extracted Prompt</h3>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                        {result.generation.extracted_prompt}
                      </pre>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {result.generation?.system_prompt && (
                <Collapsible>
                  <div className="glass-card rounded-xl p-4">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <h3 className="text-small text-primary uppercase tracking-wider">System Prompt</h3>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                        {result.generation.system_prompt}
                      </pre>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {result.generation?.raw_llm_response && (
                <Collapsible>
                  <div className="glass-card rounded-xl p-4">
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <h3 className="text-small text-primary uppercase tracking-wider">Raw LLM Response</h3>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-3 p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                        {result.generation.raw_llm_response}
                      </pre>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
            </div>
          )}
        </div>
      </div>
    </TestingLayout>
  );
};

export default TestRunnerPage;
