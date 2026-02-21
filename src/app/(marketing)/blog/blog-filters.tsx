'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const POST_TYPES = [
  { value: undefined, label: 'All' },
  { value: 'preview', label: 'Previews' },
  { value: 'review', label: 'Reviews' },
  { value: 'weekly-roundup', label: 'Roundups' },
  { value: 'analysis', label: 'Analysis' },
] as const;

interface BlogFiltersProps {
  activeType?: string;
  activeLeagueId?: number;
  leagues: Array<{ id: number; name: string; shortName: string; flag: string }>;
}

export function BlogFilters({ activeType, activeLeagueId, leagues }: BlogFiltersProps) {
  const router = useRouter();

  const buildUrl = (type?: string, league?: number) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (league) params.set('league', String(league));
    const qs = params.toString();
    return `/blog${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-3 mb-8">
      {/* Type tabs */}
      <div className="flex gap-1 flex-wrap">
        {POST_TYPES.map((t) => (
          <Button
            key={t.label}
            variant={activeType === t.value ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => router.push(buildUrl(t.value, activeLeagueId))}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* League filter */}
      <div className="flex gap-1 flex-wrap">
        <Button
          variant={activeLeagueId === undefined ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => router.push(buildUrl(activeType, undefined))}
        >
          All Leagues
        </Button>
        {leagues.map((league) => (
          <Button
            key={league.id}
            variant={activeLeagueId === league.id ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => router.push(buildUrl(activeType, league.id))}
          >
            {league.flag} {league.shortName}
          </Button>
        ))}
      </div>
    </div>
  );
}
