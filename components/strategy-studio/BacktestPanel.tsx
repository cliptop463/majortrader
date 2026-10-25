'use client';

import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { runBacktest } from '@/lib/backtest';
import type { Strategy } from '@/lib/strategy/types';

interface BacktestPanelProps {
  strategy: Strategy;
}

export function BacktestPanel({ strategy }: BacktestPanelProps) {
  const result = runBacktest(strategy);

  return (
    <Card className="space-y-4 border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Backtest</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Performance overview</h3>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <BarChart3 className="h-4 w-4" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-muted-foreground">Win rate</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{result.winRate}%</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-muted-foreground">Net profit</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{result.netProfit.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-muted-foreground">Drawdown</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{result.drawdown.toFixed(2)}%</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-muted-foreground">ROI</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{result.roi.toFixed(2)}%</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Wins</span>
            <span>{result.wins}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(10, result.winRate)}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Losses</span>
            <span>{result.losses}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.max(8, 100 - result.winRate)}%` }} />
          </div>
        </div>
      </div>
    </Card>
  );
}

