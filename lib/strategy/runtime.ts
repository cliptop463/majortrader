import type {
  ExecutionPhase,
  RiskRules,
  RiskSessionState,
  RuntimeStatus,
  Strategy,
  TradeRecord,
} from './types';
import { canExecuteTrade } from './riskManager';

export interface RuntimeSnapshot {
  status: 'ready' | 'warning' | 'paused';
  signal: string;
  riskLimit: number;
}

export function evaluateRuntime(
  strategy: Strategy,
  session?: RiskSessionState
): RuntimeSnapshot {
  const hasValidConditions = strategy.conditions.length > 0;
  const riskLimit = strategy.risk.dailyLossLimit ?? 20;

  let status: 'ready' | 'warning' | 'paused' = hasValidConditions ? 'ready' : 'warning';

  if (session && strategy.risk) {
    const check = canExecuteTrade(strategy.risk, session);
    if (!check.allowed && check.limitReached) {
      status = 'warning';
    }
  }

  return {
    status,
    signal: strategy.conditions.some((condition) => condition.type === 'BUY') ? 'BUY' : 'WAIT',
    riskLimit,
  };
}

export type RuntimeAction =
  | { type: 'RUN'; isConnected: boolean; isAuthenticated: boolean }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'LIMIT_REACHED'; reason: string }
  | { type: 'RESET' };

export interface TransitionResult {
  status: RuntimeStatus;
  phase: ExecutionPhase;
  error?: string;
  policyNote?: string;
}

/**
 * Pure runtime state transition evaluator.
 *
 * Enforces:
 * - RUN: requires explicit user action, WebSocket connected, and authenticated session.
 * - PAUSE: stops accepting new entries while safely tracking any open contract.
 * - STOP: stops new entries and follows policy to allow open contract to settle without entering new ones.
 * - LIMIT_REACHED: transitions to limit_reached and halts new trade generation.
 */
export function transitionRuntime(
  currentStatus: RuntimeStatus,
  action: RuntimeAction,
  hasOpenContract: boolean = false
): TransitionResult {
  switch (action.type) {
    case 'RUN': {
      if (!action.isConnected) {
        return {
          status: currentStatus,
          phase: 'idle',
          error: 'Cannot start strategy: Deriv WebSocket is disconnected.',
        };
      }
      if (!action.isAuthenticated) {
        return {
          status: currentStatus,
          phase: 'idle',
          error: 'Cannot start strategy: Authenticated Deriv session is required for live execution.',
        };
      }

      return {
        status: 'running',
        phase: hasOpenContract ? 'open_contract' : 'scanning',
        policyNote: 'Strategy runtime started. Scanning volatility indices for DIGITMATCH signals.',
      };
    }

    case 'PAUSE': {
      if (currentStatus !== 'running') {
        return {
          status: currentStatus,
          phase: 'idle',
          error: 'Cannot pause: Strategy is not currently running.',
        };
      }
      return {
        status: 'paused',
        phase: hasOpenContract ? 'open_contract' : 'halted',
        policyNote: hasOpenContract
          ? 'Strategy paused. Safe tracking active open contract until settlement; no new trades will be initiated.'
          : 'Strategy paused. Scanning halted.',
      };
    }

    case 'RESUME': {
      if (currentStatus !== 'paused') {
        return {
          status: currentStatus,
          phase: 'idle',
          error: 'Cannot resume: Strategy is not paused.',
        };
      }
      return {
        status: 'running',
        phase: hasOpenContract ? 'open_contract' : 'scanning',
        policyNote: 'Strategy resumed. Continuing execution cycle.',
      };
    }

    case 'STOP': {
      return {
        status: 'stopped',
        phase: hasOpenContract ? 'open_contract' : 'halted',
        policyNote: hasOpenContract
          ? 'Strategy stopped. New entries halted; monitoring current open contract safely to settlement.'
          : 'Strategy stopped. All scanning and execution halted.',
      };
    }

    case 'LIMIT_REACHED': {
      return {
        status: 'limit_reached',
        phase: 'halted',
        policyNote: `Risk rule triggered: ${action.reason}. Execution halted.`,
      };
    }

    case 'RESET': {
      return {
        status: 'idle',
        phase: 'idle',
        policyNote: 'Strategy runtime reset to idle.',
      };
    }

    default:
      return {
        status: currentStatus,
        phase: 'idle',
      };
  }
}

/**
 * Parses and computes settlement results from a closed contract payload.
 */
export function settleTradeContract(contract: {
  contract_id: number;
  status: string;
  profit: string | number;
  payout?: string | number;
  buy_price?: string | number;
}): { isWin: boolean; profit: number; payout: number; buyPrice: number } {
  const profitNum = typeof contract.profit === 'string' ? parseFloat(contract.profit) : contract.profit;
  const safeProfit = Number.isFinite(profitNum) ? Number(profitNum.toFixed(2)) : 0;

  const payoutNum = typeof contract.payout === 'string' ? parseFloat(contract.payout) : contract.payout ?? 0;
  const safePayout = Number.isFinite(payoutNum) ? Number(payoutNum.toFixed(2)) : 0;

  const buyPriceNum = typeof contract.buy_price === 'string' ? parseFloat(contract.buy_price) : contract.buy_price ?? 0;
  const safeBuyPrice = Number.isFinite(buyPriceNum) ? Number(buyPriceNum.toFixed(2)) : 0;

  // A contract is won if status is 'won' or profit > 0
  const isWin = contract.status === 'won' || safeProfit > 0;

  return {
    isWin,
    profit: safeProfit,
    payout: safePayout,
    buyPrice: safeBuyPrice,
  };
}
