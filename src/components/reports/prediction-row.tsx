import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
}

export function PredictionRow({ prediction: p }: PredictionRowProps) {
  const predLabel = p.prediction === 'H' ? 'Home' : p.prediction === 'D' ? 'Draw' : 'Away';

  const confidenceColor =
    p.confidence >= 0.7 ? 'text-green-500 bg-green-500/10' :
    p.confidence >= 0.5 ? 'text-yellow-500 bg-yellow-500/10' :
    'text-orange-500 bg-orange-500/10';

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition">
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
        <p className="text-xs text-muted-foreground">Score</p>
      </div>

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
    </div>
  );
}
