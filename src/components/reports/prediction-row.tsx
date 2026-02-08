import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles } from 'lucide-react';

interface PredictionData {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league?: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedScore: string;
  prediction: string;
  confidence: number;
  explanation: string;
}

interface PredictionRowProps {
  prediction: PredictionData;
  result?: { home: number; away: number };
}

function getResultAccuracy(
  prediction: PredictionData,
  result?: { home: number; away: number }
): 'correct-score' | 'correct-result' | 'incorrect' | null {
  if (!result) return null;
  const [predHome, predAway] = prediction.predictedScore.split('-').map((s) => parseInt(s.trim()));
  if (predHome === result.home && predAway === result.away) return 'correct-score';
  const actualResult = result.home > result.away ? 'H' : result.away > result.home ? 'A' : 'D';
  if (prediction.prediction === actualResult) return 'correct-result';
  return 'incorrect';
}

export function PredictionRow({ prediction: p, result }: PredictionRowProps) {
  const predLabel = p.prediction === 'H' ? 'Home' : p.prediction === 'D' ? 'Draw' : 'Away';
  const accuracy = getResultAccuracy(p, result);

  const confidenceColor =
    p.confidence >= 0.7 ? 'text-green-500 bg-green-500/10' :
    p.confidence >= 0.5 ? 'text-yellow-500 bg-yellow-500/10' :
    'text-orange-500 bg-orange-500/10';

  const rowBorder = accuracy === 'correct-score'
    ? 'border-amber-500/50 bg-amber-500/5'
    : accuracy === 'correct-result'
      ? 'border-green-500/50 bg-green-500/5'
      : accuracy === 'incorrect'
        ? 'border-red-500/40 bg-red-500/5'
        : 'border-border/50';

  return (
    <div className={cn("flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition", rowBorder)}>
      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{p.homeTeam}</span>
          <span className="text-xs text-muted-foreground">vs</span>
          <span className="font-medium text-sm truncate">{p.awayTeam}</span>
        </div>
        {p.league && (
          <p className="text-xs text-muted-foreground mt-0.5">{p.league}</p>
        )}
      </div>

      {/* Probabilities */}
      <div className="hidden md:flex items-center gap-3 text-xs">
        <div className="text-center w-12">
          <p className="font-mono font-medium text-blue-500">
            {(p.homeWinProb * 100).toFixed(0)}%
          </p>
          <p className="text-muted-foreground">H</p>
        </div>
        <div className="text-center w-12">
          <p className="font-mono font-medium text-gray-400">
            {(p.drawProb * 100).toFixed(0)}%
          </p>
          <p className="text-muted-foreground">D</p>
        </div>
        <div className="text-center w-12">
          <p className="font-mono font-medium text-red-500">
            {(p.awayWinProb * 100).toFixed(0)}%
          </p>
          <p className="text-muted-foreground">A</p>
        </div>
      </div>

      {/* Predicted score */}
      <div className="text-center">
        <p className="font-mono font-bold text-sm">{p.predictedScore}</p>
        <p className="text-xs text-muted-foreground">Pred</p>
      </div>

      {/* Actual score */}
      {result && (
        <div className="text-center">
          <p className={cn(
            "font-mono font-bold text-sm",
            accuracy === 'correct-score' ? 'text-amber-400' :
            accuracy === 'correct-result' ? 'text-green-400' :
            'text-red-400'
          )}>
            {result.home}-{result.away}
          </p>
          <p className="text-xs text-muted-foreground">FT</p>
        </div>
      )}

      {/* Prediction */}
      <Badge
        variant={p.prediction === 'H' ? 'default' : p.prediction === 'A' ? 'destructive' : 'secondary'}
        className="w-16 justify-center"
      >
        {predLabel}
      </Badge>

      {/* Confidence */}
      <div className={cn('px-2 py-1 rounded-full text-xs font-medium', confidenceColor)}>
        {(p.confidence * 100).toFixed(0)}%
      </div>

      {/* Result accuracy icon */}
      {accuracy && (
        <div className="shrink-0">
          {accuracy === 'correct-score' ? (
            <Sparkles className="h-4 w-4 text-amber-400" />
          ) : accuracy === 'correct-result' ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <X className="h-4 w-4 text-red-400" />
          )}
        </div>
      )}
    </div>
  );
}
