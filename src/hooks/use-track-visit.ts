'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function useTrackVisit() {
  const pathname = usePathname();
  const { status } = useSession();
  const lastTracked = useRef<string>('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (pathname === lastTracked.current) return;

    lastTracked.current = pathname;

    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route: pathname }),
    }).catch(() => {
      // fire-and-forget — don't block navigation
    });
  }, [pathname, status]);
}
