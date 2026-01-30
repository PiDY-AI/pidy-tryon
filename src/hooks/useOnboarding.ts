import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'pidy-onboarding-complete';

export const useOnboarding = () => {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if onboarding has been completed
    // In a real app, this would check the backend for user measurements
    const completed = localStorage.getItem(ONBOARDING_KEY) === 'true';
    setNeedsOnboarding(!completed);
    setIsLoading(false);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setNeedsOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setNeedsOnboarding(true);
  };

  return {
    needsOnboarding,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  };
};
