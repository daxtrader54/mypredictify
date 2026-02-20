'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { League } from '@/config/leagues';

interface PredictionsFilterProps {
  selectedLeagueId: number;
  leagues: League[];
  currentGameweek: number;
  availableGameweeks: number[];
  hideCompleted: boolean;
}

export function PredictionsFilter({
  selectedLeagueId,
  leagues,
  currentGameweek,
  availableGameweeks,
  hideCompleted,
}: PredictionsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortedGWs = [...availableGameweeks].sort((a, b) => a - b);
  const maxAvailableGW = sortedGWs.length > 0 ? sortedGWs[sortedGWs.length - 1] : 0;
  const currentIdx = sortedGWs.indexOf(currentGameweek);
  const hasPrev = currentIdx > 0 || (currentIdx === -1 && currentGameweek > (sortedGWs[0] || 1));
  // Allow navigating one GW beyond the latest available data
  const hasNext = currentGameweek < maxAvailableGW + 1;

  const navigate = (leagueId: number, gw: number, extraParams?: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('league', leagueId.toString());
    params.set('gw', gw.toString());
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
    }
    router.push(`/predictions?${params.toString()}`);
  };

  const handleLeagueChange = (leagueId: number) => {
    navigate(leagueId, currentGameweek);
  };

  const handlePrevGW = () => {
    if (currentIdx > 0) {
      navigate(selectedLeagueId, sortedGWs[currentIdx - 1]);
    } else if (currentIdx === -1 && currentGameweek > 1) {
      // Currently on a GW beyond available data — go back to the latest available
      navigate(selectedLeagueId, maxAvailableGW);
    }
  };

  const handleNextGW = () => {
    if (hasNext) {
      if (currentIdx >= 0 && currentIdx < sortedGWs.length - 1) {
        // Navigate to the next available GW
        navigate(selectedLeagueId, sortedGWs[currentIdx + 1]);
      } else {
        // On the latest available (or beyond) — go to next number
        navigate(selectedLeagueId, currentGameweek + 1);
      }
    }
  };

  const handleToggleCompleted = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('league', selectedLeagueId.toString());
    params.set('gw', currentGameweek.toString());
    if (hideCompleted) {
      params.delete('hideCompleted');
    } else {
      params.set('hideCompleted', '1');
    }
    router.push(`/predictions?${params.toString()}`);
  };

  return (
    <div data-tour="predictions-filter" className="flex flex-wrap items-center gap-2">
      {leagues.map((league) => (
        <Button
          key={league.id}
          variant={league.id === selectedLeagueId ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleLeagueChange(league.id)}
        >
          <span className="md:hidden">{league.flag} {league.shortName}</span>
          <span className="hidden md:inline">{league.name}</span>
        </Button>
      ))}

      <div className="hidden lg:block w-px h-6 bg-border/50" />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handlePrevGW}
          disabled={!hasPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold min-w-[60px] text-center">
          GW {currentGameweek}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleNextGW}
          disabled={!hasNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant={hideCompleted ? 'default' : 'outline'}
        size="sm"
        className="h-8"
        onClick={handleToggleCompleted}
      >
        {hideCompleted ? (
          <EyeOff className="h-3.5 w-3.5 mr-1.5" />
        ) : (
          <Eye className="h-3.5 w-3.5 mr-1.5" />
        )}
        {hideCompleted ? 'Show Completed' : 'Hide Completed'}
      </Button>
    </div>
  );
}
