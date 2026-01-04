import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Measurements } from '@/types/measurements';
import { useAuth } from './useAuth';

export const useMeasurements = () => {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<Measurements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeasurements = async () => {
      if (!user) {
        setMeasurements(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('user_measurements')
          .select('height, weight, chest, waist, hips')
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // No measurements found
            setError('No measurements found. Please complete your body scan first.');
          } else {
            setError(fetchError.message);
          }
          setMeasurements(null);
        } else {
          setMeasurements(data);
        }
      } catch (err) {
        setError('Failed to fetch measurements');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeasurements();
  }, [user]);

  return {
    measurements,
    isLoading,
    error,
    isLoaded: !isLoading,
  };
};
