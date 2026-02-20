'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Lock, Coins, Target, Globe, Trophy } from 'lucide-react';
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

function persistUnlockedBatch(ids: number[]) {
  try {
    const set = getUnlockedSet();
    ids.forEach((id) => set.add(id));
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

interface FixtureRowProps {
  fixture: FixtureData;
  unlocked: boolean;
  onLockClick: (fixture: FixtureData) => void;
}

function FixtureRow({ fixture, unlocked, onLockClick }: FixtureRowProps) {
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLockClick(fixture);
            }}
            className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            title="Unlock prediction"
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

export function UpcomingFixturesList({ fixtures, allGameweekFixtureIds }: { fixtures: FixtureData[]; allGameweekFixtureIds?: number[] }) {
  const { tier, deductCredits, hasEnoughCredits } = useCredits();
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<FixtureData | null>(null);
  const [deducting, setDeducting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // On mount, load unlocked state from localStorage + tier
  useEffect(() => {
    const stored = getUnlockedSet();
    const initial = new Set<number>();
    fixtures.forEach((f) => {
      if (isFreeForTier(tier, f.league.id) || stored.has(f.fixtureId)) {
        initial.add(f.fixtureId);
      }
    });
    setUnlockedIds(initial);
  }, [fixtures, tier]);

  const handleLockClick = useCallback((fixture: FixtureData) => {
    setSelectedFixture(fixture);
    setError(null);
    setModalOpen(true);
  }, []);

  const unlockFixtures = useCallback(async (
    ids: number[],
    cost: number,
    reason: string,
    key: string
  ) => {
    setError(null);

    if (!hasEnoughCredits(cost)) {
      setError('Not enough credits');
      return;
    }

    setDeducting(key);
    const result = await deductCredits(cost, reason);
    setDeducting(null);

    if (result.success) {
      persistUnlockedBatch(ids);
      setUnlockedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setModalOpen(false);
    } else {
      setError(result.error || 'Failed to deduct credits');
    }
  }, [deductCredits, hasEnoughCredits]);

  const handleRevealOne = useCallback(() => {
    if (!selectedFixture) return;
    unlockFixtures(
      [selectedFixture.fixtureId],
      CREDIT_COSTS.VIEW_PREDICTION,
      `View prediction: ${selectedFixture.homeTeam.name} vs ${selectedFixture.awayTeam.name}`,
      'one'
    );
  }, [selectedFixture, unlockFixtures]);

  const handleRevealLeague = useCallback(() => {
    if (!selectedFixture) return;
    const leagueIds = fixtures
      .filter((f) => f.pred && f.league.id === selectedFixture.league.id && !unlockedIds.has(f.fixtureId))
      .map((f) => f.fixtureId);
    unlockFixtures(
      leagueIds,
      CREDIT_COSTS.REVEAL_LEAGUE_DASHBOARD,
      `Reveal all ${selectedFixture.league.name} predictions`,
      'league'
    );
  }, [selectedFixture, fixtures, unlockedIds, unlockFixtures]);

  const handleRevealAll = useCallback(() => {
    // Use allGameweekFixtureIds (all leagues) if available, not just displayed fixtures
    const allIds = allGameweekFixtureIds || fixtures.map((f) => f.fixtureId);
    unlockFixtures(
      allIds,
      CREDIT_COSTS.REVEAL_ALL_DASHBOARD,
      `Reveal all dashboard predictions`,
      'all'
    );
  }, [allGameweekFixtureIds, fixtures, unlockFixtures]);

  const leagueLockedCount = selectedFixture
    ? fixtures.filter((f) => f.pred && f.league.id === selectedFixture.league.id && !unlockedIds.has(f.fixtureId)).length
    : 0;

  // When allGameweekFixtureIds is provided, count all locked IDs across the whole GW
  const totalLockedCount = allGameweekFixtureIds
    ? allGameweekFixtureIds.filter((id) => !unlockedIds.has(id)).length
    : fixtures.filter((f) => f.pred && !unlockedIds.has(f.fixtureId)).length;

  return (
    <>
      <div className="space-y-0.5">
        {fixtures.map((m) => (
          <FixtureRow
            key={m.fixtureId}
            fixture={m}
            unlocked={unlockedIds.has(m.fixtureId)}
            onLockClick={handleLockClick}
          />
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Unlock Predictions</DialogTitle>
            {selectedFixture && (
              <DialogDescription>
                {selectedFixture.homeTeam.name} vs {selectedFixture.awayTeam.name}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2">
            {/* Option 1: This match */}
            <Button
              variant="outline"
              className="w-full justify-between h-auto py-3 px-4"
              onClick={handleRevealOne}
              disabled={deducting !== null}
            >
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-sm font-medium">This match</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Coins className="h-3 w-3" />
                <span className="font-semibold">{CREDIT_COSTS.VIEW_PREDICTION}</span>
                {deducting === 'one' && <span className="ml-1 animate-pulse">...</span>}
              </div>
            </Button>

            {/* Option 2: All from this league */}
            {selectedFixture && leagueLockedCount > 1 && (
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-3 px-4"
                onClick={handleRevealLeague}
                disabled={deducting !== null}
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="text-left">
                    <span className="text-sm font-medium block">All {selectedFixture.league.name}</span>
                    <span className="text-[11px] text-muted-foreground">{leagueLockedCount} matches</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Coins className="h-3 w-3" />
                  <span className="font-semibold">{CREDIT_COSTS.REVEAL_LEAGUE_DASHBOARD}</span>
                  {deducting === 'league' && <span className="ml-1 animate-pulse">...</span>}
                </div>
              </Button>
            )}

            {/* Option 3: All leagues */}
            {totalLockedCount > 1 && (
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-3 px-4"
                onClick={handleRevealAll}
                disabled={deducting !== null}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="text-left">
                    <span className="text-sm font-medium block">All leagues</span>
                    <span className="text-[11px] text-muted-foreground">{totalLockedCount} matches</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Coins className="h-3 w-3" />
                  <span className="font-semibold">{CREDIT_COSTS.REVEAL_ALL_DASHBOARD}</span>
                  {deducting === 'all' && <span className="ml-1 animate-pulse">...</span>}
                </div>
              </Button>
            )}

            {error && (
              <p className="text-xs text-destructive text-center pt-1">{error}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
