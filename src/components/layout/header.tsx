'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Menu, LogOut, User, CreditCard, Coins, TrendingUp, Layers, Crown, Target, LayoutDashboard, BookOpen, HelpCircle, Newspaper, BarChart3 } from 'lucide-react';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from './sidebar';
import { useCredits } from '@/hooks/use-credits';
import { useHelpModeStore } from '@/stores/help-mode-store';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

const authenticatedNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/predictions', label: 'Predictions', icon: Target },
  { href: '/value-bets', label: 'Value Bets', icon: TrendingUp },
  { href: '/acca-builder', label: 'ACCA Builder', icon: Layers },
  { href: '/polymarket', label: 'Markets', icon: BarChart3 },
  { href: '/blog', label: 'Blog', icon: Newspaper },
];

const unauthenticatedNavItems = [
  { href: '/predictions', label: 'Predictions', icon: Target },
  { href: '/value-bets', label: 'Value Bets', icon: TrendingUp },
  { href: '/acca-builder', label: 'ACCA Builder', icon: Layers },
  { href: '/polymarket', label: 'Markets', icon: BarChart3 },
  { href: '/blog', label: 'Blog', icon: Newspaper },
  { href: '/pricing', label: 'Pricing', icon: Crown },
];

export function Header() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: session, status } = useSession();
  const { credits, tier, loading: creditsLoading } = useCredits();
  const helpMode = useHelpModeStore();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        {/* Mobile menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-2">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Logo className="h-9 w-9" />
          <span className="font-bold text-xl hidden sm:inline-block">{siteConfig.name}</span>
        </Link>

        {/* Desktop nav — centered */}
        <nav className="hidden md:flex items-center space-x-1 flex-1 justify-center">
          {(session ? authenticatedNavItems : unauthenticatedNavItems).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center space-x-3 ml-auto md:ml-0">
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : session?.user ? (
            <>
              {/* Help mode toggle */}
              <button
                onClick={helpMode.toggle}
                className={cn(
                  "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  helpMode.isActive
                    ? "bg-green-500/15 text-green-500 border border-green-500/30"
                    : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted hover:text-foreground"
                )}
              >
                {helpMode.isActive && (
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
                <HelpCircle className="h-3.5 w-3.5" />
                {helpMode.isActive ? 'Help ON' : 'Help'}
              </button>

              {/* Credits display */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <div className="h-6 w-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Coins className="h-3.5 w-3.5 text-yellow-500" />
                </div>
                <span className="text-sm font-semibold">
                  {creditsLoading ? '...' : credits.toLocaleString()}
                </span>
                <Badge
                  variant={tier === 'free' ? 'secondary' : 'default'}
                  className={cn(
                    "text-xs",
                    tier !== 'free' && "bg-primary/20 text-primary border-primary/30"
                  )}
                >
                  {tier.toUpperCase()}
                </Badge>
              </div>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-border hover:ring-primary/50 transition-all">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {session.user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/subscription" className="flex items-center cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Subscription
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => signIn('google')} className="font-medium">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
