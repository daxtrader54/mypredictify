'use client';

import { useCreditsContext } from '@/components/providers/credits-provider';

export function useCredits() {
  return useCreditsContext();
}
