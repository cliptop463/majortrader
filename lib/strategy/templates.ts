import type { Strategy } from './types';

export const STRATEGY_TEMPLATES: Strategy[] = [
  {
    id: 'template-matches-consensus',
    name: 'Matches Digit Consensus',
    market: 'R_100',
    contractType: 'DIGITMATCH',
    trade: { stake: 1, duration: 1, durationUnit: 'ticks' },
    conditions: [
      { id: 'template-m1', type: 'Scanner Trigger', label: 'Scanner Trigger', description: 'Consensus MATCHES signal on continuous volatility index' },
      { id: 'template-m2', type: 'IF', label: 'IF', description: 'Statistical consensus heuristic >= 50' },
      { id: 'template-m3', type: 'BUY', label: 'BUY', description: 'Place DIGITMATCH order with fixed stake' },
    ],
    risk: {
      stopLoss: 5,
      takeProfit: 15,
      maxTrades: 5,
      dailyLossLimit: 20,
      cooldown: 3,
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
    id: 'template-digit-differ',
    name: 'Digit Differ',
    market: 'VOL100IDX',
    contractType: 'DIGITDIFF',
    trade: { stake: 1, duration: 1, durationUnit: 'ticks' },
    conditions: [
      { id: 'template-1', type: 'Scanner Trigger', label: 'Scanner Trigger', description: 'Digit 7 frequency above 18%' },
      { id: 'template-2', type: 'IF', label: 'IF', description: 'Frequency condition is true' },
      { id: 'template-3', type: 'BUY', label: 'BUY', description: 'Place DIGITDIFF contract' },
    ],
    risk: {
      stopLoss: 4,
      takeProfit: 10,
      maxTrades: 5,
      dailyLossLimit: 20,
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
    id: 'template-even-odd',
    name: 'Even Odd',
    market: 'VOL100IDX',
    contractType: 'DIGITEVEN',
    trade: { stake: 1, duration: 1, durationUnit: 'ticks' },
    conditions: [
      { id: 'template-4', type: 'Even', label: 'Even', description: 'Trigger on even digit' },
      { id: 'template-5', type: 'Signal Trigger', label: 'Signal Trigger', description: 'Even trend filter' },
      { id: 'template-6', type: 'BUY', label: 'BUY', description: 'Enter even contract' },
    ],
    risk: {
      stopLoss: 5,
      takeProfit: 12,
      maxTrades: 7,
      dailyLossLimit: 25,
      cooldown: 3,
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
    id: 'template-rise-fall',
    name: 'Rise Fall Sniper',
    market: 'VOL100IDX',
    contractType: 'DIGITOVER',
    trade: { stake: 2, duration: 1, durationUnit: 'ticks' },
    conditions: [
      { id: 'template-7', type: 'Trend Up', label: 'Trend Up', description: 'Market is rising' },
      { id: 'template-8', type: 'Frequency', label: 'Frequency', description: 'Frequency > 22%' },
      { id: 'template-9', type: 'BUY', label: 'BUY', description: 'Open high probability trade' },
    ],
    risk: {
      stopLoss: 6,
      takeProfit: 15,
      maxTrades: 6,
      dailyLossLimit: 30,
      cooldown: 2,
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

export function getStrategyTemplates(): Strategy[] {
  return STRATEGY_TEMPLATES.map((template) => ({
    ...template,
    metadata: {
      createdAt: template.metadata.createdAt,
      updatedAt: template.metadata.updatedAt,
    },
  }));
}
