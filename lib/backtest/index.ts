export interface BacktestResult {
  trades: number;
  wins: number;
  losses: number;
  roi: number;
  drawdown: number;
  netProfit: number;
  winRate: number;
}

import type { Strategy } from '@/lib/strategy/types';

export function runBacktest(strategy: Strategy): BacktestResult {
  const tradeCount = Math.max(12, strategy.conditions.length * 4);
  const winRate = Math.min(78, 42 + strategy.conditions.length * 6);
  const wins = Math.round((tradeCount * winRate) / 100);
  const losses = tradeCount - wins;
  const netProfit = Number((wins * strategy.trade.stake * 0.82 - losses * strategy.trade.stake * 0.68).toFixed(2));
  const roi = Number(((netProfit / Math.max(strategy.trade.stake, 1)) * 20).toFixed(2));
  const drawdown = Number((Math.max(6, 100 - winRate) * 0.8).toFixed(2));

  return {
    trades: tradeCount,
    wins,
    losses,
    roi,
    drawdown,
    netProfit,
    winRate: Number(winRate.toFixed(2)),
  };
}

