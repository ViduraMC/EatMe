import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { writePref } from '../utils/preferences';

interface OnboardingContextValue {
  /** True once this phone has seen the language choice and the introduction. */
  onboarded: boolean;
  complete: () => void;
  /** Profile > "Replay the introduction". */
  replay: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

/**
 * Whether to show first-run onboarding. It is per device, not per account:
 * the choice of language belongs to whoever holds the phone, before they
 * have signed in.
 */
export function OnboardingProvider({
  initial,
  children,
}: {
  initial: boolean;
  children: React.ReactNode;
}) {
  const [onboarded, setOnboarded] = useState(initial);

  const complete = useCallback(() => {
    setOnboarded(true);
    void writePref('onboarded', 'yes');
  }, []);

  const replay = useCallback(() => {
    setOnboarded(false);
    void writePref('onboarded', 'no');
  }, []);

  const value = useMemo(
    () => ({ onboarded, complete, replay }),
    [onboarded, complete, replay],
  );
  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return context;
}
