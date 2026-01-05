import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TryOnResult {
  images: string[];
  recommendedSize?: string;
  fitScore?: number;
  prompt?: string;
}

interface UseTryOnReturn {
  generateTryOn: (productId: string) => Promise<TryOnResult | null>;
  isLoading: boolean;
  error: string | null;
  result: TryOnResult | null;
}

export const useTryOn = (): UseTryOnReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryOnResult | null>(null);

  const generateTryOn = async (productId: string): Promise<TryOnResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use supabase.functions.invoke which handles auth automatically
      const { data, error: fnError } = await supabase.functions.invoke('tryon', {
        body: { productId },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Edge function error');
      }

      const tryOnData: TryOnResult = data;
      setResult(tryOnData);
      return tryOnData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate try-on';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateTryOn,
    isLoading,
    error,
    result,
  };
};
