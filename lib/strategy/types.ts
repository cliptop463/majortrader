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

/**
 * Validated scanner signal received from digit consensus analysis.
 */
export interface ScannerSignal {
  id: string;
  symbol: string;
  contractType: 'DIGITMATCH';
  digit: number;
  direction: 'MATCHES';
  heuristicScore: number;
  agree: number;
  eligible: number;
  timestamp: number;
}

/**
 * Session tracking for risk management and performance stats.
 */
export interface RiskSessionState {
  totalTrades: number;
  wins: number;
  losses: number;
  netProfit: number;
  hasOpenContract: boolean;
  lastTradeEndedAt: number | null;
  cooldownUntil: number | null;
}

export type RuntimeStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'limit_reached';

export type ExecutionPhase =
  | 'idle'
  | 'scanning'
  | 'signal_detected'
  | 'proposing'
  | 'purchasing'
  | 'open_contract'
  | 'settling'
  | 'cooldown'
  | 'halted';

export interface TradeRecord {
  id: string;
  timestamp: number;
  symbol: string;
  contractType: 'DIGITMATCH';
  digit: number;
  stake: number;
  payout: number;
  profit: number;
  status: 'won' | 'lost' | 'open' | 'failed';
  contractId?: number;
  proposalId?: string;
  heuristicScore: number;
  message?: string;
}

export interface RuntimeEventLog {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}
