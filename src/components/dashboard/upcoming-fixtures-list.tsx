'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Lock, Coins } from 'lucide-react';
import { useCredits } from '@/hooks/use-credits';
import { isFreeForTier, CREDIT_COSTS } from '@/config/pricing';

const UNLOCKED_STORAGE_KEY = 'mypredictify:unlocked';

function getUnlockedSet(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(UNLOCKED_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistUnlocked(id: number) {
  try {
    const set = getUnlockedSet();
    set.add(id);
    localStorage.setItem(UNLOCKED_STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* quota exceeded — non-critical */ }
}

interface FixtureData {
  fixtureId: number;
  league: { id: number; name: string };
  homeTeam: { id: number; name: string; shortCode: string; logo: string };
  awayTeam: { id: number; name: string; shortCode: string; logo: string };
  kickoff: string;
  pred?: {
    fixtureId: number;
    prediction: string;
    predictedScore: string;
    confidence: number;
  };
}

function formatKickoff(kickoff: string): string {
  const d = new Date(kickoff);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function leagueShort(name: string): string {
  const map: Record<string, string> = {
    'Premier League': 'PL',
    'La Liga': 'LL',
    'Bundesliga': 'BL',
    'Serie A': 'SA',
    'Ligue 1': 'L1',
  };
  return map[name] || name.slice(0, 3).toUpperCase();
}

function predLabel(pred: string): string {
  if (pred === 'H') return 'H';
  if (pred === 'A') return 'A';
  return 'D';
}

function FixtureRow({ fixture }: { fixture: FixtureData }) {
  const { tier, deductCredits, hasEnoughCredits } = useCredits();
  const [unlocked, setUnlocked] = useState(false);
  const [deducting, setDeducting] = useState(false);

  const isFree = isFreeForTier(tier, fixture.league.id);

  useEffect(() => {
    if (isFree || getUnlockedSet().has(fixture.fixtureId)) {
      setUnlocked(true);
    }
  }, [isFree, fixture.fixtureId]);

  const handleUnlock = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isFree || unlocked) {
      setUnlocked(true);
      return;
    }

    if (!hasEnoughCredits(CREDIT_COSTS.VIEW_PREDICTION)) return;

    setDeducting(true);
    const result = await deductCredits(
      CREDIT_COSTS.VIEW_PREDICTION,
      `View prediction: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`,
      fixture.league.id
    );
    setDeducting(false);

    if (result.success) {
      persistUnlocked(fixture.fixtureId);
      setUnlocked(true);
    }
  }, [isFree, unlocked, deductCredits, hasEnoughCredits, fixture]);

  const showPred = fixture.pred && unlocked;

  return (
    <Link
      href={`/predictions?league=${fixture.league.id}`}
      className="block py-2 px-1 md:px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
    >
      {/* Row 1: date + league */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
          {formatKickoff(fixture.kickoff)}
        </span>
        <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 h-4">
          {leagueShort(fixture.league.name)}
        </Badge>
        {showPred && fixture.pred && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-auto">
            {predLabel(fixture.pred.prediction)}
          </Badge>
        )}
        {fixture.pred && !unlocked && (
          <button
            onClick={handleUnlock}
            disabled={deducting}
            className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            title={`Unlock prediction (${CREDIT_COSTS.VIEW_PREDICTION} credit)`}
          >
            <Lock className="h-3 w-3" />
            <Coins className="h-3 w-3" />
            <span>{CREDIT_COSTS.VIEW_PREDICTION}</span>
          </button>
        )}
      </div>
      {/* Row 2: teams + score */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 flex-1 min-w-0 justify-end text-right">
          <span className="text-xs md:text-sm font-medium truncate">{fixture.homeTeam.name}</span>
          {fixture.homeTeam.logo && (
            <Image src={fixture.homeTeam.logo} alt={fixture.homeTeam.shortCode} width={18} height={18} className="rounded-sm shrink-0" />
          )}
        </div>

        {showPred && fixture.pred ? (
          <div className="shrink-0 w-12 text-center">
            <span className="text-xs font-bold text-primary">
              {fixture.pred.predictedScore}
            </span>
            <span className="block text-[8px] uppercase text-muted-foreground tracking-wide">Pred</span>
          </div>
        ) : fixture.pred && !unlocked ? (
          <div className="shrink-0 w-12 text-center">
            <span className="text-xs font-bold text-muted-foreground/40 blur-[3px] select-none">
              ?-?
            </span>
            <span className="block text-[8px] uppercase text-muted-foreground/50 tracking-wide">
              <Lock className="h-2.5 w-2.5 inline" />
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground font-medium shrink-0 w-12 text-center">vs</span>
        )}

        <div className="flex items-center gap-1 flex-1 min-w-0">
          {fixture.awayTeam.logo && (
            <Image src={fixture.awayTeam.logo} alt={fixture.awayTeam.shortCode} width={18} height={18} className="rounded-sm shrink-0" />
          )}
          <span className="text-xs md:text-sm font-medium truncate">{fixture.awayTeam.name}</span>
        </div>
      </div>
    </Link>
  );
}

export function UpcomingFixturesList({ fixtures }: { fixtures: FixtureData[] }) {
  return (
    <div className="space-y-0.5">
      {fixtures.map((m) => (
        <FixtureRow key={m.fixtureId} fixture={m} />
      ))}
    </div>
  );
}
