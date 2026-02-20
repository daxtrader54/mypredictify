'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface CreditsState {
  credits: number;
  tier: 'free' | 'pro' | 'gold';
  hasApiAccess: boolean;
  canRedeemDaily: boolean;
  loading: boolean;
  error: string | null;
}

interface CreditsContextValue extends CreditsState {
  isPro: boolean;
  isGold: boolean;
  isPaid: boolean;
  fetchCredits: () => Promise<void>;
  redeemDailyCredits: () => Promise<{ success: boolean; creditsAdded?: number; error?: string }>;
  deductCredits: (amount: number, reason: string, leagueId?: number) => Promise<{ success: boolean; error?: string }>;
  hasEnoughCredits: (amount: number) => boolean;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<CreditsState>({
    credits: 0,
    tier: 'free',
    hasApiAccess: false,
    canRedeemDaily: false,
    loading: true,
    error: null,
  });

  const fetchCredits = useCallback(async () => {
    if (!session?.user?.email) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      const response = await fetch('/api/credits/balance');
      if (!response.ok) throw new Error('Failed to fetch credits');

      const data = await response.json();
      setState({
        credits: data.credits,
        tier: data.tier,
        hasApiAccess: data.hasApiAccess,
        canRedeemDaily: data.canRedeemDaily,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCredits();
    } else if (status === 'unauthenticated') {
      setState({
        credits: 0,
        tier: 'free',
        hasApiAccess: false,
        canRedeemDaily: false,
        loading: false,
        error: null,
      });
    }
  }, [status, fetchCredits]);

  const redeemDailyCredits = useCallback(async (): Promise<{
    success: boolean;
    creditsAdded?: number;
    error?: string;
  }> => {
    try {
      const response = await fetch('/api/credits/redeem', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      setState((prev) => ({
        ...prev,
        credits: data.newBalance,
        canRedeemDaily: false,
      }));

      return { success: true, creditsAdded: data.creditsAdded };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, []);

  const deductCredits = useCallback(async (
    amount: number,
    reason: string,
    leagueId?: number
  ): Promise<{ success: boolean; error?: string }> => {
    if (state.credits < amount) {
      return { success: false, error: 'Insufficient credits' };
    }

    try {
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason, leagueId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      setState((prev) => ({
        ...prev,
        credits: data.newBalance,
      }));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [state.credits]);

  const hasEnoughCredits = useCallback((amount: number): boolean => {
    return state.credits >= amount;
  }, [state.credits]);

  const value: CreditsContextValue = {
    ...state,
    isPro: state.tier === 'pro' || state.tier === 'gold',
    isGold: state.tier === 'gold',
    isPaid: state.tier !== 'free',
    fetchCredits,
    redeemDailyCredits,
    deductCredits,
    hasEnoughCredits,
  };

  return (
    <CreditsContext.Provider value={value}>
      {children}
    </CreditsContext.Provider>
  );
}

const defaultValue: CreditsContextValue = {
  credits: 0,
  tier: 'free',
  hasApiAccess: false,
  canRedeemDaily: false,
  loading: true,
  error: null,
  isPro: false,
  isGold: false,
  isPaid: false,
  fetchCredits: async () => {},
  redeemDailyCredits: async () => ({ success: false, error: 'No provider' }),
  deductCredits: async (_a: number, _r: string, _l?: number) => ({ success: false, error: 'No provider' }),
  hasEnoughCredits: () => false,
};

export function useCreditsContext() {
  const context = useContext(CreditsContext);
  return context ?? defaultValue;
}
