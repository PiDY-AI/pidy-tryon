import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TryonTestRequest, TryonTestResponse } from '../types';

export interface TryonError {
  message: string;
  code: string | null;
}

export interface BatchProgress {
  current: number;
  total: number;
  completed: TryonTestResponse[];
  failed: { index: number; error: string; code?: string | null }[];
}

interface UseTryonTestReturn {
  runTest: (request: TryonTestRequest) => Promise<TryonTestResponse | null>;
  runBatch: (request: TryonTestRequest, count: number) => Promise<void>;
  stopBatch: () => void;
  isLoading: boolean;
  error: TryonError | null;
  result: TryonTestResponse | null;
  batchProgress: BatchProgress | null;
  batchResults: TryonTestResponse[];
}

class TryonApiError extends Error {
  code: string | null;
  constructor(message: string, code: string | null = null) {
    super(message);
    this.code = code;
  }
}

export const useTryonTest = (): UseTryonTestReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TryonError | null>(null);
  const [result, setResult] = useState<TryonTestResponse | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [batchResults, setBatchResults] = useState<TryonTestResponse[]>([]);
  const stopRef = useRef(false);

  const callEdgeFunction = async (request: TryonTestRequest): Promise<TryonTestResponse> => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error('Auth session missing. Please sign in again.');
    }

    // Use fetch directly instead of supabase.functions.invoke.
    // The Supabase SDK swallows the response body on non-2xx errors,
    // making it impossible to read error codes like NO_AVATAR.
    const functionsUrl = `${(supabase as any).functionsUrl || 'https://owipkfsjnmydsjhbfjqu.supabase.co/functions/v1'}`;
    const response = await fetch(`${functionsUrl}/tryon-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok || data?.success === false || data?.error) {
      console.error('[useTryonTest] Edge function error:', response.status, data);
      const errorObj = data?.error;
      const errorCode = typeof errorObj === 'object' ? errorObj?.code || null : null;
      const errorMessage = typeof errorObj === 'object'
        ? errorObj?.message || 'Test generation failed'
        : errorObj || data?.message || 'Test generation failed';
      throw new TryonApiError(errorMessage, errorCode);
    }

    return data as TryonTestResponse;
  };

  const runTest = async (request: TryonTestRequest): Promise<TryonTestResponse | null> => {
    setIsLoading(true);
    setError(null);
    setBatchProgress(null);
    setBatchResults([]);

    try {
      const testResult = await callEdgeFunction(request);
      setResult(testResult);
      return testResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run test';
      const code = err instanceof TryonApiError ? err.code : null;
      setError({ message, code });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const runBatch = async (request: TryonTestRequest, count: number): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    stopRef.current = false;

    const progress: BatchProgress = { current: 0, total: count, completed: [], failed: [] };
    setBatchProgress({ ...progress });
    setBatchResults([]);

    let predictionId: string | null = null;

    for (let i = 0; i < count; i++) {
      if (stopRef.current) break;

      progress.current = i + 1;
      setBatchProgress({ ...progress });

      try {
        let req: TryonTestRequest;
        if (i === 0) {
          // First run: use original request (creates prediction)
          req = { ...request };
        } else {
          // Subsequent runs: add generation to the prediction created in run #1
          req = {
            predictionId: predictionId!,
            provider: request.provider,
            replicateModel: request.replicateModel,
          };
        }

        const res = await callEdgeFunction(req);
        progress.completed.push(res);
        setBatchProgress({ ...progress });
        setBatchResults((prev) => [...prev, res]);
        setResult(res);

        // Capture prediction_id from first run
        if (i === 0) {
          predictionId = res.prediction_id;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';
        const code = err instanceof TryonApiError ? err.code : null;
        progress.failed.push({ index: i + 1, error: message, code });
        setBatchProgress({ ...progress });

        // Stop batch on NO_AVATAR — all subsequent runs will fail the same way
        if (code === 'NO_AVATAR') {
          setError({ message, code });
          break;
        }
      }
    }

    setIsLoading(false);
  };

  const stopBatch = () => {
    stopRef.current = true;
  };

  return { runTest, runBatch, stopBatch, isLoading, error, result, batchProgress, batchResults };
};
