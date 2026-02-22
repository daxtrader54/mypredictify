'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  Layers,
  CheckCircle,
  CalendarDays,
  Crown,
  Coins,
  Gift,
  Sparkles,
  Workflow,
  FileText,
  Shield,
  HelpCircle,
  Newspaper,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCredits } from '@/hooks/use-credits';
import { useHelpModeStore } from '@/stores/help-mode-store';
import { siteConfig, isAdmin } from '@/config/site';
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
    title: 'Results',
    href: '/results',
    icon: CheckCircle,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
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
    title: 'Markets',
    href: '/polymarket',
    icon: BarChart3,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    title: 'Blog',
    href: '/blog',
    icon: Newspaper,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    title: 'Today',
    href: '/today',
    icon: CalendarDays,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    admin: true,
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { credits, tier, isPro, canRedeemDaily, redeemDailyCredits, loading } = useCredits();
  const helpMode = useHelpModeStore();

  const handleRedeem = async () => {
    await redeemDailyCredits();
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-card to-card/50 overflow-y-auto">
      {/* Logo - only visible in mobile sheet */}
      <div className="flex h-14 items-center border-b border-border/50 px-4 md:hidden">
        <Link href="/" className="flex items-center space-x-2">
          <Logo className="h-9 w-9" />
          <span className="font-bold text-xl">{siteConfig.name}</span>
        </Link>
      </div>

      {/* Credits section */}
      {session && (
        <div className="px-2 py-1.5 border-b border-border/50">
          <div data-tour="sidebar-credits" className="flex items-center justify-between rounded-md bg-yellow-500/5 border border-yellow-500/15 px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500 shrink-0" />
              <span className="font-bold text-sm">
                {loading ? '...' : credits.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">credits</span>
            </div>
            <Badge
              variant={isPro ? 'default' : 'secondary'}
              className={cn(
                "text-[10px] px-1.5 py-0",
                isPro && "bg-primary/20 text-primary border-primary/30"
              )}
            >
              {tier.toUpperCase()}
            </Badge>
          </div>
          {canRedeemDaily && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1 h-7 text-xs text-yellow-500 hover:bg-yellow-500/10"
              onClick={handleRedeem}
            >
              <Gift className="h-3 w-3 mr-1.5" />
              Claim +10 Daily
            </Button>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav data-tour="sidebar-nav" className="flex-1 space-y-0.5 p-2">
        <p className="px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Main Menu
        </p>
        {navItems
          .filter((item) => !item.admin || isAdmin(session?.user?.email))
          .map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-1 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <div className={cn(
                'h-7 w-7 rounded-md flex items-center justify-center transition-colors',
                isActive ? 'bg-primary-foreground/20' : item.bgColor
              )}>
                <item.icon className={cn('h-3.5 w-3.5', isActive ? 'text-primary-foreground' : item.color)} />
              </div>
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Help mode toggle — for mobile access */}
      <div className="px-2 pb-1">
        <button
          onClick={() => { helpMode.toggle(); onNavigate?.(); }}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full rounded-md px-3 py-1 text-xs font-semibold transition-colors",
            helpMode.isActive
              ? "border border-green-500/30 bg-green-500/15 text-green-500"
              : "border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
          )}
        >
          {helpMode.isActive && (
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
          <HelpCircle className="h-3.5 w-3.5" />
          {helpMode.isActive ? 'Help ON' : 'Help Mode'}
        </button>
      </div>

      <Separator className="opacity-50" />

      {/* Leagues section */}
      <div data-tour="sidebar-leagues" className="p-2">
        <p className="px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
          Leagues
        </p>
        <div className="space-y-0.5">
          {LEAGUES.map((league) => {
            const leagueHref = `/predictions?league=${league.id}`;
            const isActive = pathname === leagueHref;

            return (
              <Link
                key={league.id}
                href={leagueHref}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1 text-sm transition-colors',
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{league.shortName}</span>
                <span className="truncate">{league.name}</span>
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
