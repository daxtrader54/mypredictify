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

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    window.dispatchEvent(new Event('cookie-consent-change'));
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-card border border-border/50 shadow-lg rounded-lg p-4">
      <p className="text-sm text-muted-foreground mb-3">
        We use cookies for analytics to improve your experience.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAccept} className="flex-1">
          Accept
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDecline} className="flex-1">
          Decline
        </Button>
      </div>
    </div>
  );
}
