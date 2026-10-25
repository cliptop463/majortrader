'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Canvas } from './Canvas';
import { PropertyPanel } from './PropertyPanel';
import { Toolbox } from './Toolbox';
import type { Strategy } from '@/lib/strategy/types';

interface BuilderLayoutProps {
  strategy: Strategy;
  onStrategyChange: (nextStrategy: Strategy) => void;
}

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
    const newCondition = {
      id: `${blockType.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      type: blockType,
      label: blockType,
      description: `${blockType} condition block`,
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

