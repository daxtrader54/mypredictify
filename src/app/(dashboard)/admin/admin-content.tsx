'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Coins,
  Crown,
  ExternalLink,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  tier: 'free' | 'pro' | 'gold';
  credits: number;
  hasApiAccess: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  dailyCreditsLastReset: string;
  monthlyCreditsLastReset: string;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  pages: number;
}

const TIER_COLORS: Record<string, string> = {
  free: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

export function AdminContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: UsersResponse = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleTierChange = async (userId: string, newTier: 'free' | 'pro' | 'gold') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      if (selectedUser?.id === userId) setSelectedUser(updated);
    } catch {
      alert('Failed to update tier');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCredits = async (userId: string, amount: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: creditReason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      setCreditAmount('');
      setCreditReason('');
      // Refresh the user
      const userRes = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`);
      if (userRes.ok) {
        const updated = await userRes.json();
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
        if (selectedUser?.id === userId) setSelectedUser(updated);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update credits');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-red-500" />
        <h1 className="text-xl font-bold">Admin — User Management</h1>
        <Badge variant="outline" className="ml-auto">{total} users</Badge>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or Stripe ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setSearch(''); setPage(1); }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </form>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Tier</TableHead>
                  <TableHead className="text-center">Credits</TableHead>
                  <TableHead className="text-center">Stripe</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedUser(user)}
                    >
                      <TableCell className="font-mono text-sm">{user.email}</TableCell>
                      <TableCell className="text-sm">{user.name || '—'}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={TIER_COLORS[user.tier]}>
                          {user.tier.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {user.credits.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.stripeCustomerId ? (
                          <Badge variant="outline" className="text-xs">
                            Linked
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User detail dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              User Details
              {selectedUser && (
                <Badge className={TIER_COLORS[selectedUser.tier]}>
                  {selectedUser.tier.toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Email</div>
                <div className="font-mono">{selectedUser.email}</div>
                <div className="text-muted-foreground">Name</div>
                <div>{selectedUser.name || '—'}</div>
                <div className="text-muted-foreground">Credits</div>
                <div className="font-bold">{selectedUser.credits.toLocaleString()}</div>
                <div className="text-muted-foreground">Joined</div>
                <div>{formatDate(selectedUser.createdAt)}</div>
                <div className="text-muted-foreground">Last updated</div>
                <div>{formatDate(selectedUser.updatedAt)}</div>
                {selectedUser.stripeCustomerId && (
                  <>
                    <div className="text-muted-foreground">Stripe Customer</div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{selectedUser.stripeCustomerId}</span>
                      <a
                        href={`https://dashboard.stripe.com/customers/${selectedUser.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </>
                )}
                {selectedUser.stripeSubscriptionId && (
                  <>
                    <div className="text-muted-foreground">Subscription</div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{selectedUser.stripeSubscriptionId}</span>
                      <a
                        href={`https://dashboard.stripe.com/subscriptions/${selectedUser.stripeSubscriptionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </>
                )}
              </div>

              {/* Tier change */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    Change Tier
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {(['free', 'pro', 'gold'] as const).map((t) => (
                      <Button
                        key={t}
                        variant={selectedUser.tier === t ? 'default' : 'outline'}
                        size="sm"
                        disabled={actionLoading || selectedUser.tier === t}
                        onClick={() => handleTierChange(selectedUser.id, t)}
                      >
                        {t.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Credits management */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    Manage Credits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      className="w-24"
                    />
                    <Input
                      placeholder="Reason (optional)"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading || !creditAmount}
                      onClick={() => handleCredits(selectedUser.id, Math.abs(Number(creditAmount)))}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading || !creditAmount}
                      onClick={() => handleCredits(selectedUser.id, -Math.abs(Number(creditAmount)))}
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleCredits(selectedUser.id, 100)}
                    >
                      +100
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleCredits(selectedUser.id, 500)}
                    >
                      +500
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
