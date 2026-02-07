'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import type { League } from '@/config/leagues';
import { useCredits } from '@/hooks/use-credits';

interface PredictionsFilterProps {
  selectedLeagueId: number;
  leagues: League[];
}

export function PredictionsFilter({ selectedLeagueId, leagues }: PredictionsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tier } = useCredits();

  const handleLeagueChange = (leagueId: number, leagueTier: League['tier']) => {
    if (leagueTier === 'pro' && tier === 'free') {
      router.push('/pricing');
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('league', leagueId.toString());
    router.push(`/predictions?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {leagues.map((league) => {
        const isSelected = league.id === selectedLeagueId;
        const isLocked = league.tier === 'pro' && tier === 'free';

        return (
          <Button
            key={league.id}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLeagueChange(league.id, league.tier)}
            className={isLocked ? 'opacity-75' : ''}
          >
            {league.shortName}
            {isLocked && <Crown className="h-3 w-3 ml-1 text-yellow-500" />}
          </Button>
        );
      })}
    </div>
  );
}
