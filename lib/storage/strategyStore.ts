import type { Strategy } from '@/lib/strategy/types';

const STORAGE_KEY = 'majortrader.strategy-studio.strategies';

const seedStrategies: Strategy[] = [
  {
    id: 'seed-digit-hunter',
    name: 'Digit Hunter',
    market: 'VOL100IDX',
    contractType: 'DIGITDIFF',
    trade: { stake: 1, duration: 1, durationUnit: 'ticks' },
    conditions: [
      { id: 'seed-1', type: 'Scanner Trigger', label: 'Scanner Trigger', description: 'Digit 7 frequency > 18%' },
      { id: 'seed-2', type: 'IF', label: 'IF', description: 'Conditions align' },
      { id: 'seed-3', type: 'BUY', label: 'BUY', description: 'Open trade' },
    ],
    risk: {
      stopLoss: 6,
      takeProfit: 12,
      maxTrades: 5,
      dailyLossLimit: 25,
      cooldown: 2,
      martingale: false,
      antiMartingale: false,
      fixedStake: true,
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'seed-trend-catcher',
    name: 'Trend Catcher',
    market: 'VOL50IDX',
    contractType: 'DIGITOVER',
    trade: { stake: 2, duration: 1, durationUnit: 'ticks' },
    conditions: [
      { id: 'seed-4', type: 'Trend Up', label: 'Trend Up', description: 'Bullish momentum' },
      { id: 'seed-5', type: 'BUY', label: 'BUY', description: 'Enter trade' },
    ],
    risk: {
      stopLoss: 5,
      takeProfit: 14,
      maxTrades: 4,
      dailyLossLimit: 20,
      cooldown: 3,
      martingale: false,
      antiMartingale: true,
      fixedStake: true,
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

export function loadStrategies(): Strategy[] {
  if (typeof window === 'undefined') {
    return seedStrategies;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedStrategies;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedStrategies;
  } catch {
    return seedStrategies;
  }
}

export function saveStrategies(strategies: Strategy[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
}

