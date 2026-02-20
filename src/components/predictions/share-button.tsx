'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  fixtureId: number;
  gameweek: number;
  leagueId: number;
  homeTeam: string;
  awayTeam: string;
}

export function ShareButton({ fixtureId, gameweek, leagueId, homeTeam, awayTeam }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/predictions?league=${leagueId}&gw=${gameweek}`;
    const text = `Check out the AI prediction for ${homeTeam} vs ${awayTeam} on MyPredictify`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [gameweek, leagueId, homeTeam, awayTeam]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleShare}
      title="Share prediction"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Share2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
