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

      // If localStorage says complete, trust it without checking server (reduces API calls)
      if (localCompleted) {
        console.log('[useOnboarding] Onboarding complete (cached)');
        setNeedsOnboarding(false);
        setIsLoading(false);
        return;
      }

      // Only check server if localStorage doesn't have completion status
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.user_metadata?.onboarding_complete === true) {
          console.log('[useOnboarding] User has completed onboarding in database');
          // Sync to localStorage for future quick access
          localStorage.setItem(ONBOARDING_KEY, 'true');
          setNeedsOnboarding(false);
        } else {
          console.log('[useOnboarding] Onboarding not complete');
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error('[useOnboarding] Error checking onboarding status:', error);
        // Fall back to not requiring onboarding if we can't check
        setNeedsOnboarding(false);
      }

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
