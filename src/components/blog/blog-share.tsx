'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check, Copy, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildShareUrl, buildShareText, type SharePlatform } from '@/lib/share';
import { SHARE_CREDITS } from '@/config/pricing';

interface BlogShareProps {
  slug: string;
  title: string;
}

const PLATFORMS: { id: SharePlatform; label: string; icon: string }[] = [
  { id: 'twitter', label: 'X / Twitter', icon: '𝕏' },
  { id: 'facebook', label: 'Facebook', icon: 'f' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'copy', label: 'Copy Link', icon: '' },
];

export function BlogShare({ slug, title }: BlogShareProps) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [shareInfo, setShareInfo] = useState<{
    shareCreditsUsedToday: number;
    shareCreditsRemaining: number;
    tier: string;
  } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const url = `https://mypredictify.com/blog/${slug}`;
  const text = buildShareText('blog', title);

  useEffect(() => {
    fetch('/api/credits/balance')
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error('not logged in');
      })
      .then((data) => {
        setLoggedIn(true);
        setShareInfo({
          shareCreditsUsedToday: data.shareCreditsUsedToday ?? 0,
          shareCreditsRemaining: data.shareCreditsRemaining ?? 50,
          tier: data.tier,
        });
      })
      .catch(() => {
        setLoggedIn(false);
      });
  }, []);

  const handleShare = useCallback(async (platform: SharePlatform) => {
    // Open share link
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
      } catch { /* no clipboard */ }
    } else {
      const shareLink = buildShareUrl(platform, text, url);
      if (shareLink) {
        window.open(shareLink, '_blank', 'noopener,noreferrer');
      }
    }

    // Award credits if logged in
    if (loggedIn) {
      try {
        const res = await fetch('/api/credits/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: 'blog', contentId: slug, platform, url }),
        });
        const data = await res.json();
        if (data.creditsAwarded > 0) {
          setSuccess(`+${data.creditsAwarded} credits`);
          setShareInfo((prev) => prev ? {
            ...prev,
            shareCreditsUsedToday: data.dailyUsed,
            shareCreditsRemaining: Math.max(0, SHARE_CREDITS.DAILY_CAP - data.dailyUsed),
          } : prev);
          setTimeout(() => setSuccess(null), 2000);
        }
      } catch {
        // non-critical
      }
    }

    if (!success) {
      setSuccess(platform === 'copy' ? 'Link copied!' : 'Shared!');
      setTimeout(() => setSuccess(null), 2000);
    }
  }, [loggedIn, text, url, slug, success]);

  const isGold = shareInfo?.tier === 'gold';
  const atCap = (shareInfo?.shareCreditsRemaining ?? 50) <= 0;

  return (
    <div className="border-t border-border/50 pt-6 mt-8">
      <p className="text-sm font-semibold mb-3">Share this article</p>

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-500 font-medium mb-3">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((platform) => (
          <Button
            key={platform.id}
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => handleShare(platform.id)}
          >
            {platform.id === 'copy' ? (
              <Copy className="h-3.5 w-3.5" />
            ) : (
              <span className="text-sm">{platform.icon}</span>
            )}
            {platform.label}
            {loggedIn && !isGold && !atCap && (
              <span className="flex items-center gap-0.5 text-yellow-500 text-xs">
                <Coins className="h-3 w-3" />
                +{SHARE_CREDITS.PER_SHARE}
              </span>
            )}
          </Button>
        ))}
      </div>

      {loggedIn && !isGold && shareInfo && (
        <p className="text-xs text-muted-foreground mt-2">
          {shareInfo.shareCreditsUsedToday}/{SHARE_CREDITS.DAILY_CAP} share credits earned today
          {atCap && <span className="text-amber-500 ml-1">(daily limit reached)</span>}
        </p>
      )}
    </div>
  );
}
