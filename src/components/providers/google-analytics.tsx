'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const CONSENT_KEY = 'mypredictify:cookie-consent';

type ConsentState = 'pending' | 'accepted' | 'declined';

function getConsent(): ConsentState {
  if (typeof window === 'undefined') return 'pending';
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === 'accepted') return 'accepted';
  if (v === 'declined') return 'declined';
  return 'pending';
}

export function GoogleAnalytics() {
  const [consent, setConsent] = useState<ConsentState>('pending');

  useEffect(() => {
    setConsent(getConsent());

    const handler = () => setConsent(getConsent());
    window.addEventListener('cookie-consent-change', handler);
    return () => window.removeEventListener('cookie-consent-change', handler);
  }, []);

  if (!GA_ID) return null;

  // Always load GA. If declined or pending, run in cookieless/PII-masked mode.
  const full = consent === 'accepted';

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {full
          ? `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { anonymize_ip: true });
          `
          : `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied'
            });
            gtag('config', '${GA_ID}', {
              anonymize_ip: true,
              client_storage: 'none',
              store_gac: false
            });
          `
        }
      </Script>
      {/* When consent changes to accepted, grant storage */}
      {full && (
        <Script id="ga-consent-update" strategy="afterInteractive">
          {`
            if (typeof gtag === 'function') {
              gtag('consent', 'update', {
                analytics_storage: 'granted'
              });
            }
          `}
        </Script>
      )}
    </>
  );
}
