'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Canvas } from './Canvas';
import { PropertyPanel } from './PropertyPanel';
import { Toolbox } from './Toolbox';
import type { Strategy, StrategyConditionType } from '@/lib/strategy/types';

interface BuilderLayoutProps {
  strategy: Strategy;
  onStrategyChange: (nextStrategy: Strategy) => void;
}

const normalizeConditionType = (value: string): StrategyConditionType => {
  const normalized = value.trim();

  const typeMap: Record<string, StrategyConditionType> = {
    IF: 'IF',
    AND: 'AND',
    OR: 'OR',
    BUY: 'BUY',
    SELL: 'SELL',
    WAIT: 'WAIT',
    'Digit Equals': 'Digit Equals',
    'Digit Over': 'Digit Over',
    'Digit Under': 'Digit Under',
    Even: 'Even',
    Odd: 'Odd',
    'Trend Up': 'Trend Up',
    'Trend Down': 'Trend Down',
    Frequency: 'Frequency',
    Martingale: 'Martingale',
    'Stop Loss': 'Stop Loss',
    'Take Profit': 'Take Profit',
    'Scanner Trigger': 'Scanner Trigger',
    'Signal Trigger': 'Signal Trigger',
    'Max Trades': 'Max Trades',
    Cooldown: 'Cooldown',
  };

  return typeMap[normalized] ?? 'IF';
};

export function BuilderLayout({ strategy, onStrategyChange }: BuilderLayoutProps) {
  const updateCondition = (conditionId: string, updates: Partial<Strategy['conditions'][number]>) => {
    onStrategyChange({
      ...strategy,
      conditions: strategy.conditions.map((condition) =>
        condition.id === conditionId ? { ...condition, ...updates } : condition
      ),
    });
  };

  const handleDropBlock = (blockType: string) => {
    const conditionType = normalizeConditionType(blockType);
    const newCondition: Strategy['conditions'][number] = {
      id: `${conditionType.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      type: conditionType,
      label: conditionType,
      description: `${conditionType} condition block`,
    };

    onStrategyChange({
      ...strategy,
      conditions: [...strategy.conditions, newCondition],
    });
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border border-border bg-card/90">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Builder</p>
            <h2 className="text-lg font-semibold text-foreground">{strategy.name}</h2>
          </div>
          <Button variant="outline" size="sm">
            Live sync
          </Button>
        </div>

        <div className="grid gap-0 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
          <Toolbox onDropBlock={handleDropBlock} />
          <Canvas
            conditions={strategy.conditions}
            onDropBlock={handleDropBlock}
            onRemoveCondition={(conditionId) =>
              onStrategyChange({
                ...strategy,
                conditions: strategy.conditions.filter((condition) => condition.id !== conditionId),
              })
            }
            onUpdateCondition={updateCondition}
          />
          <PropertyPanel strategy={strategy} onStrategyChange={onStrategyChange} />
        </div>
      </Card>
    </div>
  );
}
