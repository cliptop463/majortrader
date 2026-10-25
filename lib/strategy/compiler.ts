import type { Strategy } from './types';

export interface CompiledStrategy {
  strategyId: string;
  conditions: Array<{ id: string; type: string; label: string; rules: Record<string, unknown> }>;
  buySignal: boolean;
}

export function compileStrategy(strategy: Strategy): CompiledStrategy {
  return {
    strategyId: strategy.id,
    conditions: strategy.conditions.map((condition) => ({
      id: condition.id,
      type: condition.type,
      label: condition.label,
      rules: { description: condition.description ?? '' },
    })),
    buySignal: strategy.conditions.some((condition) => condition.type === 'BUY' || condition.type === 'Signal Trigger'),
  };
}

