export type DurationUnit = 'ticks';

export type StrategyConditionType =
  | 'IF'
  | 'AND'
  | 'OR'
  | 'BUY'
  | 'SELL'
  | 'WAIT'
  | 'Digit Equals'
  | 'Digit Over'
  | 'Digit Under'
  | 'Even'
  | 'Odd'
  | 'Trend Up'
  | 'Trend Down'
  | 'Frequency'
  | 'Martingale'
  | 'Stop Loss'
  | 'Take Profit'
  | 'Scanner Trigger'
  | 'Signal Trigger'
  | 'Max Trades'
  | 'Cooldown';

export interface Condition {
  id: string;
  type: StrategyConditionType;
  label: string;
  description?: string;
  value?: string | number;
}

export interface RiskRules {
  stopLoss: number;
  takeProfit: number;
  maxTrades: number;
  dailyLossLimit: number;
  cooldown: number;
  martingale: boolean;
  antiMartingale: boolean;
  fixedStake: boolean;
}

export interface Strategy {
  id: string;
  name: string;
  market: string;
  contractType: string;
  trade: {
    stake: number;
    duration: number;
    durationUnit: DurationUnit;
  };
  conditions: Condition[];
  risk: RiskRules;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface StrategyTemplate extends Strategy {
  kind: 'starter';
}

