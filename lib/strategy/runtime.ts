import type { Strategy } from './types';

export interface RuntimeSnapshot {
  status: 'ready' | 'warning' | 'paused';
  signal: string;
  riskLimit: number;
}

export function evaluateRuntime(strategy: Strategy): RuntimeSnapshot {
  const hasValidConditions = strategy.conditions.length > 0;
  const riskLimit = strategy.risk.dailyLossLimit ?? 20;

  return {
    status: hasValidConditions ? 'ready' : 'warning',
    signal: strategy.conditions.some((condition) => condition.type === 'BUY') ? 'BUY' : 'WAIT',
    riskLimit,
  };
}

