'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, Receipt, Copy } from 'lucide-react';
import { useAccaStore } from '@/stores/acca-store';
import { ShareForCreditsButton } from '@/components/share/share-for-credits-button';

export function BetSlip() {
  const { selections, removeSelection, getCombinedOdds } = useAccaStore();
  const combinedOdds = getCombinedOdds();

  const formatSlipText = () => {
    const text = selections
      .map((s) => `${s.homeTeam} vs ${s.awayTeam}: ${s.selection} @ ${s.odds.toFixed(2)}`)
      .join('\n');
    return `${text}\n\nCombined Odds: ${combinedOdds.toFixed(2)}\n\nBuilt with MyPredictify`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formatSlipText());
  };

  if (selections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            Bet Slip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Your bet slip is empty</p>
            <p className="text-sm mt-1">Select matches to build your ACCA</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5" />
            Bet Slip ({selections.length})
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
            <ShareForCreditsButton
              contentType="acca"
              contentId={selections.map((s) => s.fixtureId).join('-')}
              shareText={`${selections.length}-fold ACCA @ ${combinedOdds.toFixed(2)}`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="p-4 space-y-3">
            {selections.map((selection, index) => (
              <div key={`${selection.fixtureId}-${selection.market}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {selection.homeTeam} vs {selection.awayTeam}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selection.kickoff), 'EEE, d MMM HH:mm')}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-primary">{selection.selection}</span>
                      <span className="font-bold">{selection.odds.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeSelection(selection.fixtureId, selection.market)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {index < selections.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="font-medium">Combined Odds</span>
            <span className="text-2xl font-bold text-primary">
              {combinedOdds.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
