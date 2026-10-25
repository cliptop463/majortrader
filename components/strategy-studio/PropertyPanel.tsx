'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Strategy } from '@/lib/strategy/types';

interface PropertyPanelProps {
  strategy: Strategy;
  onStrategyChange: (nextStrategy: Strategy) => void;
}

export function PropertyPanel({ strategy, onStrategyChange }: PropertyPanelProps) {
  return (
    <aside className="border-l border-border bg-muted/20 p-3">
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Properties</p>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-background p-3">
          <label className="block text-xs text-muted-foreground">
            Strategy name
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0"
              value={strategy.name}
              onChange={(event) => onStrategyChange({ ...strategy, name: event.target.value })}
            />
          </label>

          <label className="block text-xs text-muted-foreground">
            Market
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0"
              value={strategy.market}
              onChange={(event) => onStrategyChange({ ...strategy, market: event.target.value.toUpperCase() })}
            />
          </label>

          <label className="block text-xs text-muted-foreground">
            Contract type
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0"
              value={strategy.contractType}
              onChange={(event) => onStrategyChange({ ...strategy, contractType: event.target.value })}
            >
              <option value="DIGITDIFF">Digit Differ</option>
              <option value="DIGITMATCH">Digit Match</option>
              <option value="DIGITOVER">Digit Over</option>
              <option value="DIGITUNDER">Digit Under</option>
              <option value="DIGITEVEN">Even</option>
              <option value="DIGITODD">Odd</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-muted-foreground">
              Stake
              <input
                type="number"
                min={0.1}
                step={0.1}
                className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0"
                value={strategy.trade.stake}
                onChange={(event) =>
                  onStrategyChange({
                    ...strategy,
                    trade: { ...strategy.trade, stake: Number(event.target.value) || 1 },
                  })
                }
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Duration
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0"
                value={strategy.trade.duration}
                onChange={(event) =>
                  onStrategyChange({
                    ...strategy,
                    trade: { ...strategy.trade, duration: Number(event.target.value) || 1 },
                  })
                }
              />
            </label>
          </div>
        </div>

        <Card className="border border-border bg-background p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Risk</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stop loss</span>
              <span>{strategy.risk.stopLoss}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Take profit</span>
              <span>{strategy.risk.takeProfit}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Max trades</span>
              <span>{strategy.risk.maxTrades}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Daily loss</span>
              <span>{strategy.risk.dailyLossLimit}%</span>
            </div>
          </div>
        </Card>
      </div>
    </aside>
  );
}

