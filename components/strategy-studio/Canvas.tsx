'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Strategy } from '@/lib/strategy/types';

interface CanvasProps {
  conditions: Strategy['conditions'];
  onDropBlock: (blockType: string) => void;
  onRemoveCondition: (conditionId: string) => void;
  onUpdateCondition: (conditionId: string, updates: Partial<Strategy['conditions'][number]>) => void;
}

const blockClasses: Record<string, string> = {
  IF: 'border-primary/60 bg-primary/10 text-primary-foreground',
  BUY: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200',
  SELL: 'border-rose-500/60 bg-rose-500/10 text-rose-200',
  WAIT: 'border-amber-500/60 bg-amber-500/10 text-amber-200',
  AND: 'border-blue-500/60 bg-blue-500/10 text-blue-200',
  OR: 'border-violet-500/60 bg-violet-500/10 text-violet-200',
  default: 'border-border bg-card text-foreground',
};

export function Canvas({ conditions, onDropBlock, onRemoveCondition, onUpdateCondition }: CanvasProps) {
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const blockType = event.dataTransfer.getData('text/plain') || 'IF';
    onDropBlock(blockType);
  };

  return (
    <div className="min-h-[420px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%)] p-4">
      <div
        className="flex min-h-[380px] flex-col gap-3 rounded-2xl border border-dashed border-border bg-background/40 p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between pb-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Canvas</p>
            <p className="text-sm text-muted-foreground">Drag blocks here or click them from the toolbox</p>
          </div>
          <span className="rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {conditions.length} blocks
          </span>
        </div>

        {conditions.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            Drop a strategy block to begin.
          </div>
        ) : (
          conditions.map((condition) => (
            <div
              key={condition.id}
              className={cn(
                'group flex items-center justify-between rounded-xl border px-3 py-3 shadow-sm backdrop-blur-sm',
                blockClasses[condition.type as keyof typeof blockClasses] ?? blockClasses.default
              )}
            >
              <div className="space-y-1">
                <div className="text-sm font-semibold">{condition.label}</div>
                <div className="text-[11px] opacity-80">{condition.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateCondition(condition.id, { label: `${condition.label}` })}
                  className="rounded-md border border-border/60 bg-background/40 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground"
                >
                  edit
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveCondition(condition.id)}
                  className="rounded-md border border-border/60 bg-background/40 p-1.5 text-foreground"
                  aria-label={`Remove ${condition.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

