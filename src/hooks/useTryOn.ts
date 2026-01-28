import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TryOnResult {
  images: string[];
  recommendedSize?: string;
  fitScore?: number;
  prompt?: string;
}

interface UseTryOnReturn {
  generateTryOn: (productId: string, selectedSize: string, accessTokenOverride?: string) => Promise<TryOnResult | null>;
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
    selectedSize: string,
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
        body: { productId, size: selectedSize },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (fnError) {
        // Try to extract meaningful error from response
        console.error('[useTryOn] Edge function error:', fnError);
        const errorMessage = fnError.message || 'Edge function error';
        
        // Check for common error codes
        if (errorMessage.includes('USER_NOT_FOUND') || errorMessage.includes('404')) {
          throw new Error('Please complete your body scan in the PIDY app first.');
        }
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          throw new Error('Session expired. Please sign in again.');
        }
        throw new Error(errorMessage);
      }
      
      // Also check if data contains an error (some edge functions return errors in body)
      if (data?.error) {
        console.error('[useTryOn] Response error:', data.error);
        throw new Error(data.error.message || data.error || 'Try-on generation failed');
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
