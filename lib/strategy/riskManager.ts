import type { RiskRules, RiskSessionState } from './types';

/**
 * Returns a fresh, clean risk session state for the runtime.
 */
export function initialRiskSessionState(): RiskSessionState {
  return {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    netProfit: 0,
    hasOpenContract: false,
    lastTradeEndedAt: null,
    cooldownUntil: null,
  };
}

export interface TradePermissionResult {
  allowed: boolean;
  reason?: string;
  limitReached?: 'take_profit' | 'stop_loss' | 'max_trades';
}

/**
 * Validates whether a new trade can be executed under the current risk rules and session state.
 *
 * Rules:
 * - Single open contract: exactly 1 open contract permitted at a time.
 * - Take-Profit limit: stops execution when session net profit reaches or exceeds the target.
 * - Stop-Loss limit: stops execution when session net loss reaches or exceeds the threshold.
 * - Max trades limit: stops execution when the maximum session trades have been executed.
 * - Cooldown: enforces a waiting period between settled trades.
 * - Fixed stake: stake is never increased automatically (Martingale is strictly prohibited).
 */
export function canExecuteTrade(
  risk: RiskRules,
  session: RiskSessionState,
  currentTime: number = Date.now()
): TradePermissionResult {
  // 1. Single open contract rule
  if (session.hasOpenContract) {
    return {
      allowed: false,
      reason: 'Another contract is currently open. Only one contract is permitted at a time.',
    };
  }

  // 2. Max trades limit
  if (risk.maxTrades > 0 && session.totalTrades >= risk.maxTrades) {
    return {
      allowed: false,
      reason: `Maximum session trade count reached (${session.totalTrades}/${risk.maxTrades}).`,
      limitReached: 'max_trades',
    };
  }

  // 3. Take-profit limit
  if (risk.takeProfit > 0 && session.netProfit >= risk.takeProfit) {
    return {
      allowed: false,
      reason: `Take-profit target reached (+${session.netProfit.toFixed(2)} >= ${risk.takeProfit.toFixed(2)}).`,
      limitReached: 'take_profit',
    };
  }

  // 4. Stop-loss limit (evaluates stopLoss and dailyLossLimit)
  const lossThreshold = Math.min(
    risk.stopLoss > 0 ? risk.stopLoss : Infinity,
    risk.dailyLossLimit > 0 ? risk.dailyLossLimit : Infinity
  );

  if (lossThreshold !== Infinity && session.netProfit <= -lossThreshold) {
    return {
      allowed: false,
      reason: `Stop-loss limit reached (${session.netProfit.toFixed(2)} <= -${lossThreshold.toFixed(2)}).`,
      limitReached: 'stop_loss',
    };
  }

  // 5. Cooldown check
  if (session.cooldownUntil && currentTime < session.cooldownUntil) {
    const remainingSec = Math.max(1, Math.ceil((session.cooldownUntil - currentTime) / 1000));
    return {
      allowed: false,
      reason: `Cooldown active: ${remainingSec}s remaining before next scan entry.`,
    };
  }

  return { allowed: true };
}

/**
 * Updates risk session state after a trade settlements.
 * Fixed stake is strictly preserved: no Martingale or automatic stake progression is applied.
 */
export function updateSessionAfterSettlement(
  session: RiskSessionState,
  result: { profit: number; isWin: boolean },
  settlementTime: number = Date.now(),
  cooldownSeconds: number = 0
): RiskSessionState {
  const cooldownMs = Math.max(0, cooldownSeconds) * 1000;

  return {
    totalTrades: session.totalTrades + 1,
    wins: session.wins + (result.isWin ? 1 : 0),
    losses: session.losses + (result.isWin ? 0 : 1),
    netProfit: Number((session.netProfit + result.profit).toFixed(2)),
    hasOpenContract: false,
    lastTradeEndedAt: settlementTime,
    cooldownUntil: cooldownMs > 0 ? settlementTime + cooldownMs : null,
  };
}

/**
 * Validates a user-configured trade stake.
 * Must be a positive finite number greater than or equal to minimum allowed stake.
 */
export function validateStake(
  stake: number,
  minAllowedStake: number = 0.35
): { valid: boolean; stake: number; error?: string } {
  if (typeof stake !== 'number' || !Number.isFinite(stake) || isNaN(stake)) {
    return { valid: false, stake: minAllowedStake, error: 'Stake must be a valid number.' };
  }

  if (stake <= 0) {
    return { valid: false, stake: minAllowedStake, error: 'Stake must be greater than zero.' };
  }

  if (stake < minAllowedStake) {
    return {
      valid: false,
      stake: minAllowedStake,
      error: `Stake cannot be lower than the minimum allowed (${minAllowedStake}).`,
    };
  }

  return { valid: true, stake: Number(stake.toFixed(2)) };
}
