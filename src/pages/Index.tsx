import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MeasurementForm } from '@/components/MeasurementForm';
import { ProductCard } from '@/components/ProductCard';
import { TryOnResult } from '@/components/TryOnResult';
import { useMeasurements } from '@/hooks/useMeasurements';
import { useTryOn } from '@/hooks/useTryOn';
import { sampleProducts } from '@/data/products';
import { calculateSize } from '@/utils/sizeCalculator';
import { Product, TryOnResult as TryOnResultType } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Sparkles, User, RefreshCw, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { measurements, isLoaded, saveMeasurements, clearMeasurements } = useMeasurements();
  const { generateTryOn, isLoading: isTryOnLoading, error: tryOnError } = useTryOn();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [tryOnResult, setTryOnResult] = useState<TryOnResultType | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleTryOn = async (product: Product) => {
    if (!measurements) {
      toast.error('Please enter your measurements first');
      setShowForm(true);
      return;
    }
    
    setSelectedProduct(product);
    toast.info(`Calling backend for ${product.name}...`);
    
    // Call the edge function
    const backendResult = await generateTryOn(product.id);
    
    if (backendResult) {
      // Use backend result if available
      const result: TryOnResultType = {
        recommendedSize: backendResult.recommendedSize || calculateSize(measurements).recommendedSize,
        fitScore: backendResult.fitScore || calculateSize(measurements).fitScore,
        fitNotes: calculateSize(measurements).fitNotes,
        images: backendResult.images,
      };
      setTryOnResult(result);
      toast.success(`Backend responded! Recommended: ${result.recommendedSize}`);
    } else {
      // Fallback to local calculation if backend fails
      const localResult = calculateSize(measurements);
      setTryOnResult(localResult);
      toast.error('Backend call failed, using local calculation');
    }
  };

  const handleCloseTryOn = () => {
    setSelectedProduct(null);
    setTryOnResult(null);
  };

  const handleSaveMeasurements = (data: typeof measurements) => {
    if (data) {
      saveMeasurements(data);
      setShowForm(false);
      toast.success('Measurements saved!');
    }
  };

  const handleClearMeasurements = () => {
    clearMeasurements();
    setShowForm(true);
    toast.info('Measurements cleared');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Virtual Try-On | AI-Powered Size Recommendations</title>
        <meta name="description" content="Experience our virtual try-on widget. Get personalized size recommendations based on your measurements." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/50">
          <div className="container py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground">Virtual Try-On</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Fitting</p>
              </div>
            </div>
            {measurements && (
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <User className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </header>

        <main className="container py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left sidebar - Measurements */}
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center relative pulse-ring">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">Your Profile</h2>
                      <p className="text-xs text-muted-foreground">Body measurements</p>
                    </div>
                  </div>
                </div>

                {!measurements || showForm ? (
                  <MeasurementForm 
                    initialValues={measurements} 
                    onSubmit={handleSaveMeasurements} 
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Height</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.height}cm</p>
                      </div>
                      <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Weight</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.weight}kg</p>
                      </div>
                      <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Chest</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.chest}cm</p>
                      </div>
                      <div className="glass-card p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Waist</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.waist}cm</p>
                      </div>
                      <div className="glass-card p-3 rounded-lg text-center col-span-2">
                        <p className="text-xs text-muted-foreground">Hips</p>
                        <p className="text-lg font-semibold text-foreground">{measurements.hips}cm</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setShowForm(true)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleClearMeasurements}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Try-On Result */}
              {selectedProduct && tryOnResult && measurements && (
                <TryOnResult 
                  result={tryOnResult} 
                  product={selectedProduct}
                  measurements={measurements}
                  onClose={handleCloseTryOn}
                />
              )}
            </div>

            {/* Main content - Products */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    <span className="text-gradient">Try On Collection</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select an item to see your personalized fit
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                {sampleProducts.map((product, index) => (
                  <div 
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ProductCard 
                      product={product} 
                      onTryOn={handleTryOn}
                      isSelected={selectedProduct?.id === product.id}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 py-6 mt-12">
          <div className="container text-center">
            <p className="text-sm text-muted-foreground">
              Demo widget using localStorage • No backend required
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
