'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const CONSENT_KEY = 'mypredictify:cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  const respond = (value: 'accepted' | 'declined') => {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
    window.dispatchEvent(new Event('cookie-consent-change'));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-card border border-border/50 shadow-lg rounded-lg p-4">
      <p className="text-sm text-muted-foreground mb-3">
        We use cookies for analytics to improve your experience. Declining still allows anonymous analytics with no personal data stored.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => respond('accepted')} className="flex-1">
          Accept
        </Button>
        <Button size="sm" variant="ghost" onClick={() => respond('declined')} className="flex-1">
          Decline
        </Button>
      </div>
    </div>
  );
}
