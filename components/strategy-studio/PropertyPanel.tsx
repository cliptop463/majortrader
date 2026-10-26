'use client';

import { Card } from '@/components/ui/card';
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
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              value={strategy.name}
              onChange={(event) => onStrategyChange({ ...strategy, name: event.target.value })}
            />
          </label>

          <label className="block text-xs text-muted-foreground">
            Market
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              value={strategy.market}
              onChange={(event) => onStrategyChange({ ...strategy, market: event.target.value.toUpperCase() })}
            />
          </label>

          <label className="block text-xs text-muted-foreground">
            Contract type
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
              value={strategy.contractType}
              onChange={(event) => onStrategyChange({ ...strategy, contractType: event.target.value })}
            >
              <option value="DIGITMATCH">Digit Match</option>
              <option value="DIGITDIFF">Digit Differ</option>
              <option value="DIGITOVER">Digit Over</option>
              <option value="DIGITUNDER">Digit Under</option>
              <option value="DIGITEVEN">Even</option>
              <option value="DIGITODD">Odd</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-muted-foreground">
              Stake ($)
              <input
                type="number"
                min={0.35}
                step={0.5}
                className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                value={strategy.trade.stake}
                onChange={(event) =>
                  onStrategyChange({
                    ...strategy,
                    trade: { ...strategy.trade, stake: Math.max(0.35, Number(event.target.value) || 1) },
                  })
                }
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Duration (ticks)
              <input
                type="number"
                min={1}
                max={10}
                className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary"
                value={strategy.trade.duration}
                onChange={(event) =>
                  onStrategyChange({
                    ...strategy,
                    trade: { ...strategy.trade, duration: Math.max(1, Number(event.target.value) || 1) },
                  })
                }
              />
            </label>
          </div>
        </div>

        <Card className="border border-border bg-background p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Risk Limits</p>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Fixed Stake</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Stop loss ($)</span>
              <input
                type="number"
                min={1}
                step={1}
                className="w-20 rounded border border-border bg-muted/30 px-2 py-1 text-right text-xs font-semibold text-rose-500"
                value={strategy.risk.stopLoss}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategy,
                    risk: { ...strategy.risk, stopLoss: Math.max(1, Number(e.target.value) || 1) },
                  })
                }
              />
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Take profit ($)</span>
              <input
                type="number"
                min={1}
                step={1}
                className="w-20 rounded border border-border bg-muted/30 px-2 py-1 text-right text-xs font-semibold text-emerald-500"
                value={strategy.risk.takeProfit}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategy,
                    risk: { ...strategy.risk, takeProfit: Math.max(1, Number(e.target.value) || 1) },
                  })
                }
              />
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Max trades</span>
              <input
                type="number"
                min={1}
                max={100}
                className="w-20 rounded border border-border bg-muted/30 px-2 py-1 text-right text-xs font-semibold text-foreground"
                value={strategy.risk.maxTrades}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategy,
                    risk: { ...strategy.risk, maxTrades: Math.max(1, Number(e.target.value) || 1) },
                  })
                }
              />
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Cooldown (sec)</span>
              <input
                type="number"
                min={1}
                max={60}
                className="w-20 rounded border border-border bg-muted/30 px-2 py-1 text-right text-xs font-semibold text-foreground"
                value={strategy.risk.cooldown}
                onChange={(e) =>
                  onStrategyChange({
                    ...strategy,
                    risk: { ...strategy.risk, cooldown: Math.max(1, Number(e.target.value) || 1) },
                  })
                }
              />
            </label>
          </div>
        </Card>
      </div>
    </aside>
  );
}
