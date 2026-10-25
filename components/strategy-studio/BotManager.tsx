'use client';

import { FilePenLine, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StrategyCard } from './StrategyCard';
import type { Strategy } from '@/lib/strategy/types';

interface BotManagerProps {
  strategies: Strategy[];
  selectedStrategyId: string | null;
  onSelect: (strategy: Strategy) => void;
  onCreate: (template?: Strategy) => void;
  onDelete: (id: string) => void;
  templateOptions: Strategy[];
}

export function BotManager({ strategies, selectedStrategyId, onSelect, onCreate, onDelete, templateOptions }: BotManagerProps) {
  return (
    <aside className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">My Strategies</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Strategy collection</h3>
        </div>
        <Button variant="outline" size="sm" onClick={() => onCreate()}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>

      <div className="space-y-3">
        {strategies.length === 0 ? (
          <Card className="border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
            No saved strategies yet. Create your first bot.
          </Card>
        ) : (
          strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              active={strategy.id === selectedStrategyId}
              onSelect={() => onSelect(strategy)}
              onDelete={() => onDelete(strategy.id)}
            />
          ))
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <FilePenLine className="h-3.5 w-3.5" />
            Templates
          </div>
        </div>
        <div className="space-y-2">
          {templateOptions.slice(0, 3).map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onCreate(template)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition hover:border-primary/50 hover:bg-primary/5"
            >
              <span>{template.name}</span>
              <span className="text-muted-foreground">→</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

