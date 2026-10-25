'use client';

import { Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Strategy } from '@/lib/strategy/types';

interface StrategyCardProps {
  strategy: Strategy;
  active?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function StrategyCard({ strategy, active = false, onSelect, onDelete }: StrategyCardProps) {
  return (
    <Card
      className={`cursor-pointer border p-3 transition ${
        active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background hover:border-primary/40'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{strategy.name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{strategy.market}</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          aria-label={`Delete ${strategy.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{strategy.contractType}</span>
        <span>{strategy.trade.stake} USD</span>
      </div>
      <div className="mt-3 flex gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="rounded-full border border-border bg-muted px-2 py-1">{strategy.conditions.length} blocks</span>
        <span className="rounded-full border border-border bg-muted px-2 py-1">{strategy.risk.maxTrades} max</span>
      </div>
    </Card>
  );
}

