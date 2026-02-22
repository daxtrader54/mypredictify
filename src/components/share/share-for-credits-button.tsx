'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Share2, Check, Copy, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/use-credits';
import { buildShareUrl, buildShareText, buildSharePageUrl, type SharePlatform } from '@/lib/share';
import { SHARE_CREDITS } from '@/config/pricing';

interface ShareForCreditsButtonProps {
  contentType: 'prediction' | 'value-bet' | 'acca' | 'blog' | 'market';
  contentId: string;
  shareText: string;
  shareUrl?: string;
  variant?: 'icon' | 'button';
}

const PLATFORMS: { id: SharePlatform; label: string; icon: string; color: string }[] = [
  { id: 'twitter', label: 'X / Twitter', icon: '𝕏', color: 'hover:bg-sky-500/10 hover:text-sky-500' },
  { id: 'facebook', label: 'Facebook', icon: 'f', color: 'hover:bg-blue-600/10 hover:text-blue-600' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', color: 'hover:bg-green-500/10 hover:text-green-500' },
  { id: 'copy', label: 'Copy Link', icon: '', color: 'hover:bg-muted' },
];

export function ShareForCreditsButton({
  contentType,
  contentId,
  shareText,
  shareUrl,
  variant = 'icon',
}: ShareForCreditsButtonProps) {
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [creditsAwarded, setCreditsAwarded] = useState(0);
  const [sharing, setSharing] = useState(false);
  const { isGold, shareCreditsUsedToday, shareDailyCap, shareForCredits } = useCredits();

  const atCap = shareCreditsUsedToday >= shareDailyCap;
  const url = shareUrl || buildSharePageUrl(contentType, contentId);
  const text = buildShareText(contentType, shareText);

  const handleShare = useCallback(async (platform: SharePlatform) => {
    if (sharing) return;
    setSharing(true);

    // Open share URL in new tab (or copy to clipboard)
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
      } catch {
        // clipboard not available
      }
    } else {
      const shareLink = buildShareUrl(platform, text, url);
      if (shareLink) {
        window.open(shareLink, '_blank', 'noopener,noreferrer');
      }
    }

    // Award credits
    const result = await shareForCredits(contentType, contentId, platform, url);

    if (result.success && result.creditsAwarded && result.creditsAwarded > 0) {
      setCreditsAwarded(result.creditsAwarded);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 1500);
    } else {
      // Still close after sharing even if no credits (gold tier, or at cap)
      setTimeout(() => setOpen(false), 500);
    }

    setSharing(false);
  }, [sharing, text, url, shareForCredits, contentType, contentId]);

  // Try native share on mobile
  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: text, url });
        // Award credits for native share (treat as 'copy' platform)
        await shareForCredits(contentType, contentId, 'copy', url);
        setOpen(false);
        return true;
      } catch {
        // User cancelled — don't close
      }
    }
    return false;
  }, [text, url, shareForCredits, contentType, contentId]);

  return (
    <>
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 relative"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Try native share first on mobile
            const shared = await handleNativeShare();
            if (!shared) setOpen(true);
          }}
          title="Share for credits"
        >
          <Share2 className="h-3.5 w-3.5" />
          {!isGold && !atCap && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-yellow-500 text-[8px] font-bold text-black flex items-center justify-center">
              {SHARE_CREDITS.PER_SHARE}
            </span>
          )}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const shared = await handleNativeShare();
            if (!shared) setOpen(true);
          }}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
          {!isGold && !atCap && (
            <span className="inline-flex items-center gap-0.5 text-yellow-500">
              <Coins className="h-3 w-3" />
              +{SHARE_CREDITS.PER_SHARE}
            </span>
          )}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-lg font-semibold text-green-500">+{creditsAwarded} credits</p>
              <p className="text-sm text-muted-foreground">Thanks for sharing!</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Share & Earn Credits</DialogTitle>
              </DialogHeader>

              <p className="text-sm text-muted-foreground line-clamp-2">
                {text}
              </p>

              <div className="space-y-2">
                {PLATFORMS.map((platform) => (
                  <Button
                    key={platform.id}
                    variant="outline"
                    className={cn(
                      "w-full justify-between h-auto py-3 px-4",
                      platform.color,
                      atCap && !isGold && "opacity-60"
                    )}
                    onClick={() => handleShare(platform.id)}
                    disabled={sharing}
                  >
                    <div className="flex items-center gap-2.5">
                      {platform.id === 'copy' ? (
                        <Copy className="h-4 w-4" />
                      ) : (
                        <span className="text-base w-5 text-center">{platform.icon}</span>
                      )}
                      <span className="text-sm font-medium">{platform.label}</span>
                    </div>
                    {!isGold && !atCap && (
                      <span className="flex items-center gap-1 text-xs text-yellow-500">
                        <Coins className="h-3 w-3" />
                        +{SHARE_CREDITS.PER_SHARE}
                      </span>
                    )}
                  </Button>
                ))}
              </div>

              {!isGold && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <span>
                    {shareCreditsUsedToday}/{shareDailyCap} share credits today
                  </span>
                  {atCap && (
                    <span className="text-amber-500 font-medium">Daily limit reached</span>
                  )}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground text-center">
                Include our link in your post to help others discover MyPredictify
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
