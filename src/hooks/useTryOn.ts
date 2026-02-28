import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TryOnResult {
  images: string[];
  recommendedSize?: string;
  fitScore?: number;
  prompt?: string;
}

interface GenerateTryOnOptions {
  productId: string;
  selectedSize: string;
  accessTokenOverride?: string;
  provider?: 'claude-openai' | 'cerebras-replicate';
  retry?: boolean;
}

interface UseTryOnReturn {
  generateTryOn: (options: GenerateTryOnOptions) => Promise<TryOnResult | null>;
  isLoading: boolean;
  error: string | null;
  result: TryOnResult | null;
}

export const useTryOn = (): UseTryOnReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryOnResult | null>(null);

  const generateTryOn = async ({
    productId,
    selectedSize,
    accessTokenOverride,
    provider,
    retry,
  }: GenerateTryOnOptions): Promise<TryOnResult | null> => {
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
      const requestBody: Record<string, string | boolean> = { productId, size: selectedSize };
      if (provider) {
        requestBody.provider = provider;
      }
      if (retry) {
        requestBody.retry = true;
      }

      // Use fetch directly instead of supabase.functions.invoke.
      // The Supabase SDK swallows the response body on non-2xx errors,
      // making it impossible to read error codes like NO_AVATAR.
      const functionsUrl = `${(supabase as any).functionsUrl || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`}`;
      const response = await fetch(`${functionsUrl}/tryon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || data?.success === false || data?.error) {
        console.error('[useTryOn] Edge function error:', response.status, data);
        const errorMessage = data?.error?.message || data?.message || 'Try-on generation failed';
        throw new Error(errorMessage);
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
