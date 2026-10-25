'use client';

import { Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Strategy } from '@/lib/strategy/types';

interface RuntimeControlsProps {
  strategy: Strategy;
}

export function RuntimeControls({ strategy }: RuntimeControlsProps) {
  const isReady = strategy.conditions.length > 0;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Runtime</p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">Execution controls</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="default" disabled={!isReady}>
          <Play className="mr-2 h-4 w-4" />
          Run
        </Button>
        <Button variant="outline" disabled={!isReady}>
          <Pause className="mr-2 h-4 w-4" />
          Pause
        </Button>
        <Button variant="outline" disabled={!isReady}>
          <Square className="mr-2 h-4 w-4" />
          Stop
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-background/40 p-3 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Strategy status</span>
          <span className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${isReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
            {isReady ? 'Ready' : 'Draft'}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Scanner trigger</span>
          <span>Enabled</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Deriv engine</span>
          <span>Connected</span>
        </div>
      </div>
    </div>
  );
}

