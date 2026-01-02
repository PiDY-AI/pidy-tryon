import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface TryOnResult {
  images: string[];
  recommendedSize?: string;
  fitScore?: number;
}

interface UseTryOnReturn {
  generateTryOn: (productId: string) => Promise<TryOnResult | null>;
  isLoading: boolean;
  error: string | null;
  result: TryOnResult | null;
}

// Your Supabase Edge Function URL
const TRYON_FUNCTION_URL = 'https://owipkfsjnmydsjhbfjqu.supabase.co/functions/v1/tryon';

export const useTryOn = (): UseTryOnReturn => {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryOnResult | null>(null);

  const generateTryOn = async (productId: string): Promise<TryOnResult | null> => {
    if (!session?.access_token) {
      setError('Not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(TRYON_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data: TryOnResult = await response.json();
      setResult(data);
      return data;
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
