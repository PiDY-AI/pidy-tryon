import { useState, useEffect } from 'react';
import { Measurements } from '@/types/measurements';

const STORAGE_KEY = 'virtual-tryon-measurements';

export const useMeasurements = () => {
  const [measurements, setMeasurements] = useState<Measurements | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setMeasurements(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse measurements:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const saveMeasurements = (data: Measurements) => {
    setMeasurements(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const clearMeasurements = () => {
    setMeasurements(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    measurements,
    isLoaded,
    saveMeasurements,
    clearMeasurements,
  };
};
