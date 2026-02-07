'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  Layers,
  History,
  Crown,
  Coins,
  Gift,
  Sparkles,
  Workflow,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCredits } from '@/hooks/use-credits';
import { siteConfig, ADMIN_EMAIL } from '@/config/site';
import { LEAGUES } from '@/config/leagues';
import { Logo } from './logo';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Predictions',
    href: '/predictions',
    icon: Target,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Value Bets',
    href: '/value-bets',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'ACCA Builder',
    href: '/acca-builder',
    icon: Layers,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'Pipeline',
    href: '/pipeline',
    icon: Workflow,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    admin: true,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: FileText,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    admin: true,
  },
  {
    title: 'History',
    href: '/history',
    icon: History,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { credits, tier, isPro, canRedeemDaily, redeemDailyCredits, loading } = useCredits();

  const handleRedeem = async () => {
    await redeemDailyCredits();
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-card to-card/50 overflow-y-auto">
      {/* Logo - only visible in mobile sheet */}
      <div className="flex h-16 items-center border-b border-border/50 px-4 md:hidden">
        <Link href="/" className="flex items-center space-x-2">
          <Logo className="h-9 w-9" />
          <span className="font-bold text-xl">{siteConfig.name}</span>
        </Link>
      </div>

      {/* Credits section */}
      {session && (
        <div className="p-4 border-b border-border/50">
          <div className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-transparent p-4 border border-yellow-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <span className="font-bold text-lg">
                    {loading ? '...' : credits.toLocaleString()}
                  </span>
                  <p className="text-xs text-muted-foreground">Credits</p>
                </div>
              </div>
              <Badge
                variant={isPro ? 'default' : 'secondary'}
                className={cn(
                  isPro && "bg-primary/20 text-primary border-primary/30"
                )}
              >
                {isPro && <Crown className="h-3 w-3 mr-1" />}
                {tier.toUpperCase()}
              </Badge>
            </div>
            {canRedeemDaily && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-yellow-500/30 hover:bg-yellow-500/10"
                onClick={handleRedeem}
              >
                <Gift className="h-4 w-4 mr-2 text-yellow-500" />
                Claim +10 Daily Credits
              </Button>
            )}
            {tier === 'free' && !canRedeemDaily && (
              <p className="text-xs text-muted-foreground text-center">
                +10 daily bonus available tomorrow
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Main Menu
        </p>
        {navItems
          .filter((item) => !item.admin || session?.user?.email === ADMIN_EMAIL)
          .map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
                isActive ? 'bg-primary-foreground/20' : item.bgColor
              )}>
                <item.icon className={cn('h-4 w-4', isActive ? 'text-primary-foreground' : item.color)} />
              </div>
              {item.title}
            </Link>
          );
        })}
      </nav>

      <Separator className="opacity-50" />

      {/* Leagues section */}
      <div className="p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Leagues
        </p>
        <div className="space-y-1">
          {LEAGUES.map((league) => {
            const isLocked = league.tier === 'gold' && tier !== 'gold';
            const leagueHref = `/predictions?league=${league.id}`;
            const isActive = pathname === leagueHref;

            return (
              <Link
                key={league.id}
                href={isLocked ? '/pricing' : leagueHref}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  isLocked && 'opacity-50'
                )}
              >
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{league.shortName}</span>
                <span className="truncate">{league.name}</span>
                {isLocked && (
                  <Crown className="ml-auto h-3 w-3 text-yellow-500" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Upgrade CTA */}
      {tier === 'free' && session && (
        <div className="p-4 border-t border-border/50">
          <Link href="/pricing" onClick={onNavigate}>
            <div className="rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-4 border border-primary/20 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Upgrade to Pro</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Unlock all leagues, value bets, and unlimited AI features
              </p>
              <Button className="w-full" size="sm">
                <Crown className="h-4 w-4 mr-2" />
                View Plans
              </Button>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
