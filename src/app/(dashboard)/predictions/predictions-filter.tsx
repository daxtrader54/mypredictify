'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { League } from '@/config/leagues';

interface PredictionsFilterProps {
  selectedLeagueId: number;
  leagues: League[];
  currentGameweek: number;
  availableGameweeks: number[];
}

export function PredictionsFilter({
  selectedLeagueId,
  leagues,
  currentGameweek,
  availableGameweeks,
}: PredictionsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sortedGWs = [...availableGameweeks].sort((a, b) => a - b);
  const currentIdx = sortedGWs.indexOf(currentGameweek);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < sortedGWs.length - 1;

  const navigate = (leagueId: number, gw: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('league', leagueId.toString());
    params.set('gw', gw.toString());
    router.push(`/predictions?${params.toString()}`);
  };

  const handleLeagueChange = (leagueId: number) => {
    navigate(leagueId, currentGameweek);
  };

  const handlePrevGW = () => {
    if (hasPrev) navigate(selectedLeagueId, sortedGWs[currentIdx - 1]);
  };

  const handleNextGW = () => {
    if (hasNext) navigate(selectedLeagueId, sortedGWs[currentIdx + 1]);
  };

  return (
    <div className="space-y-3">
      {/* League selector */}
      <div className="flex flex-wrap gap-2">
        {leagues.map((league) => (
          <Button
            key={league.id}
            variant={league.id === selectedLeagueId ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleLeagueChange(league.id)}
          >
            {league.shortName}
          </Button>
        ))}
      </div>

      {/* Gameweek navigator */}
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
        <span className="text-sm font-semibold min-w-[80px] text-center">
          Gameweek {currentGameweek}
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
    </div>
  );
}
