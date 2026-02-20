'use client';

import { useTrackVisit } from '@/hooks/use-track-visit';

export function VisitTracker() {
  useTrackVisit();
  return null;
}
