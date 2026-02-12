import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TryonPrediction } from '../types';

interface UsePredictionDetailReturn {
  prediction: TryonPrediction | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePredictionDetail = (predictionId: string | undefined): UsePredictionDetailReturn => {
  const [prediction, setPrediction] = useState<TryonPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = useCallback(async () => {
    if (!predictionId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tryon_predictions')
        .select('*, tryon_generations(*)')
        .eq('id', predictionId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Sort generations by generation_number
      if (data?.tryon_generations) {
        data.tryon_generations.sort(
          (a: any, b: any) => a.generation_number - b.generation_number
        );
      }

      setPrediction(data as TryonPrediction);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch prediction';
      setError(message);
      console.error('Error fetching prediction:', message);
    } finally {
      setIsLoading(false);
    }
  }, [predictionId]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  return { prediction, isLoading, error, refetch: fetchPrediction };
};
