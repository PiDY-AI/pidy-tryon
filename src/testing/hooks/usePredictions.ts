import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TryonPrediction, PredictionFilters } from '../types';

interface UsePredictionsReturn {
  predictions: TryonPrediction[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const usePredictions = (filters: PredictionFilters): UsePredictionsReturn => {
  const [predictions, setPredictions] = useState<TryonPrediction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('tryon_predictions')
        .select('*, tryon_generations(id, generation_number, generated_image_url, status, provider, total_cost, total_duration_ms)', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`product_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      if (filters.productId) {
        query = query.eq('product_id', filters.productId);
      }

      if (filters.tags) {
        const tagList = filters.tags.split(',').map((t) => t.trim()).filter(Boolean);
        if (tagList.length > 0) {
          query = query.contains('tags', tagList);
        }
      }

      if (filters.dateRange !== 'all') {
        const now = new Date();
        let since: Date;
        switch (filters.dateRange) {
          case '24h':
            since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            since = new Date(0);
        }
        query = query.gte('created_at', since.toISOString());
      }

      // Pagination
      const offset = (filters.page - 1) * filters.pageSize;
      query = query.range(offset, offset + filters.pageSize - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Filter by generation status client-side (status lives on generations, not predictions)
      let filtered = (data || []) as TryonPrediction[];
      if (filters.status !== 'all') {
        filtered = filtered.filter((p) =>
          p.tryon_generations?.some((g) => g.status === filters.status)
        );
      }

      setPredictions(filtered);
      setTotalCount(count || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch predictions';
      setError(message);
      console.error('Error fetching predictions:', message);
    } finally {
      setIsLoading(false);
    }
  }, [filters.search, filters.productId, filters.tags, filters.dateRange, filters.status, filters.page, filters.pageSize]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  return { predictions, totalCount, isLoading, error, refetch: fetchPredictions };
};
