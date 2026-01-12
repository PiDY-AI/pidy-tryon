import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TryOnResult {
  images: string[];
  recommendedSize?: string;
  fitScore?: number;
  prompt?: string;
}

interface UseTryOnReturn {
  generateTryOn: (productId: string, accessTokenOverride?: string) => Promise<TryOnResult | null>;
  isLoading: boolean;
  error: string | null;
  result: TryOnResult | null;
}

export const useTryOn = (): UseTryOnReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryOnResult | null>(null);

  const generateTryOn = async (
    productId: string,
    accessTokenOverride?: string
  ): Promise<TryOnResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Prefer an explicit token (popup -> iframe storage can be unreliable)
      let accessToken = accessTokenOverride;

      if (!accessToken) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        accessToken = session?.access_token;
      }

      if (!accessToken) {
        throw new Error('Auth session missing! Please sign in again.');
      }

      // Invoke edge function with explicit Authorization header
      const { data, error: fnError } = await supabase.functions.invoke('tryon', {
        body: { productId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
