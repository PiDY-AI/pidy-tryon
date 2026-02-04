import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Use same key as SDK for consistency
const ONBOARDING_KEY = 'pidy_onboarding_complete';

export const useOnboarding = () => {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // First check localStorage for quick access
      const localCompleted = localStorage.getItem(ONBOARDING_KEY) === 'true';

      // Then check user metadata in Supabase (source of truth)
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.user_metadata?.onboarding_complete === true) {
        console.log('[useOnboarding] User has completed onboarding in database');
        // Sync to localStorage
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setNeedsOnboarding(false);
        setIsLoading(false);
        return;
      }

      // Fall back to localStorage if no user or no metadata
      console.log('[useOnboarding] Checking onboarding status:', {
        key: ONBOARDING_KEY,
        localValue: localStorage.getItem(ONBOARDING_KEY),
        userMetadata: user?.user_metadata?.onboarding_complete,
        completed: localCompleted,
        needsOnboarding: !localCompleted
      });
      setNeedsOnboarding(!localCompleted);
      setIsLoading(false);
    };

    checkOnboardingStatus();
  }, []);

  const completeOnboarding = () => {
    console.log('[useOnboarding] Completing onboarding, setting key:', ONBOARDING_KEY);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setNeedsOnboarding(false);
    console.log('[useOnboarding] Onboarding completed. Value now:', localStorage.getItem(ONBOARDING_KEY));
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
