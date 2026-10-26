import { describe, expect, it } from 'vitest';
import {
  canExecuteTrade,
  initialRiskSessionState,
  updateSessionAfterSettlement,
  validateStake,
} from '../riskManager';
import type { RiskRules, RiskSessionState } from '../types';

describe('riskManager', () => {
  const defaultRisk: RiskRules = {
    stopLoss: 10,
    takeProfit: 25,
    maxTrades: 5,
    dailyLossLimit: 15,
    cooldown: 4,
    martingale: false,
    antiMartingale: false,
    fixedStake: true,
  };

  describe('canExecuteTrade', () => {
    it('permits trade when session is within risk limits and no contract is open', () => {
      const session = initialRiskSessionState();
      const result = canExecuteTrade(defaultRisk, session);
      expect(result.allowed).toBe(true);
    });

    it('enforces single open contract policy: rejects when a contract is already open', () => {
      const session: RiskSessionState = {
        ...initialRiskSessionState(),
        hasOpenContract: true,
      };
      const result = canExecuteTrade(defaultRisk, session);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Only one contract is permitted at a time');
    });

    it('enforces maximum trades limit', () => {
      const session: RiskSessionState = {
        ...initialRiskSessionState(),
        totalTrades: 5,
      };
      const result = canExecuteTrade(defaultRisk, session);
      expect(result.allowed).toBe(false);
      expect(result.limitReached).toBe('max_trades');
      expect(result.reason).toContain('Maximum session trade count reached');
    });

    it('enforces take-profit limit', () => {
      const session: RiskSessionState = {
        ...initialRiskSessionState(),
        netProfit: 26.5,
      };
      const result = canExecuteTrade(defaultRisk, session);
      expect(result.allowed).toBe(false);
      expect(result.limitReached).toBe('take_profit');
      expect(result.reason).toContain('Take-profit target reached');
    });

    it('enforces stop-loss limit', () => {
      const session: RiskSessionState = {
        ...initialRiskSessionState(),
        netProfit: -10.0,
      };
      const result = canExecuteTrade(defaultRisk, session);
      expect(result.allowed).toBe(false);
      expect(result.limitReached).toBe('stop_loss');
      expect(result.reason).toContain('Stop-loss limit reached');
    });

    it('enforces cooldown period between trades', () => {
      const now = 50_000;
      const session: RiskSessionState = {
        ...initialRiskSessionState(),
        cooldownUntil: now + 3000,
      };

      const inCooldown = canExecuteTrade(defaultRisk, session, now);
      expect(inCooldown.allowed).toBe(false);
      expect(inCooldown.reason).toContain('Cooldown active');

      const afterCooldown = canExecuteTrade(defaultRisk, session, now + 4000);
      expect(afterCooldown.allowed).toBe(true);
    });
  });

  describe('updateSessionAfterSettlement', () => {
    it('updates session for winning trade and resets hasOpenContract', () => {
      const initial: RiskSessionState = {
        totalTrades: 1,
        wins: 0,
        losses: 1,
        netProfit: -1.0,
        hasOpenContract: true,
        lastTradeEndedAt: null,
        cooldownUntil: null,
      };

      const now = 100_000;
      const updated = updateSessionAfterSettlement(initial, { profit: 8.09, isWin: true }, now, 5);

      expect(updated.totalTrades).toBe(2);
      expect(updated.wins).toBe(1);
      expect(updated.losses).toBe(1);
      expect(updated.netProfit).toBe(7.09);
      expect(updated.hasOpenContract).toBe(false);
      expect(updated.lastTradeEndedAt).toBe(now);
      expect(updated.cooldownUntil).toBe(now + 5000);
    });

    it('updates session for losing trade without increasing stake or applying martingale', () => {
      const initial: RiskSessionState = {
        totalTrades: 2,
        wins: 1,
        losses: 1,
        netProfit: 7.09,
        hasOpenContract: true,
        lastTradeEndedAt: null,
        cooldownUntil: null,
      };

      const now = 120_000;
      const updated = updateSessionAfterSettlement(initial, { profit: -1.0, isWin: false }, now, 2);

      expect(updated.totalTrades).toBe(3);
      expect(updated.wins).toBe(1);
      expect(updated.losses).toBe(2);
      expect(updated.netProfit).toBe(6.09);
      expect(updated.hasOpenContract).toBe(false);
      expect(updated.cooldownUntil).toBe(now + 2000);
    });
  });

  describe('validateStake', () => {
    it('accepts valid stake', () => {
      const result = validateStake(5);
      expect(result.valid).toBe(true);
      expect(result.stake).toBe(5);
    });

    it('rejects zero, negative, or invalid stake', () => {
      expect(validateStake(0).valid).toBe(false);
      expect(validateStake(-2).valid).toBe(false);
      expect(validateStake(NaN).valid).toBe(false);
      expect(validateStake(0.1, 0.35).valid).toBe(false);
    });
  });
});
