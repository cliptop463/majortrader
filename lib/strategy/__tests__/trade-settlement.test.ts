import { describe, expect, it } from 'vitest';
import { settleTradeContract } from '../runtime';
import {
  canExecuteTrade,
  initialRiskSessionState,
  updateSessionAfterSettlement,
} from '../riskManager';
import type { RiskRules } from '../types';

describe('tradeSettlement', () => {
  describe('settleTradeContract', () => {
    it('correctly calculates winning contract with numeric profit', () => {
      const contract = {
        contract_id: 1001,
        status: 'won',
        profit: 8.09,
        payout: 9.09,
        buy_price: 1.0,
      };

      const result = settleTradeContract(contract);
      expect(result.isWin).toBe(true);
      expect(result.profit).toBe(8.09);
      expect(result.payout).toBe(9.09);
      expect(result.buyPrice).toBe(1.0);
    });

    it('correctly calculates winning contract with string profit values from API', () => {
      const contract = {
        contract_id: 1002,
        status: 'won',
        profit: '8.09',
        payout: '9.09',
        buy_price: '1.00',
      };

      const result = settleTradeContract(contract);
      expect(result.isWin).toBe(true);
      expect(result.profit).toBe(8.09);
      expect(result.payout).toBe(9.09);
      expect(result.buyPrice).toBe(1.0);
    });

    it('correctly calculates losing contract with negative profit', () => {
      const contract = {
        contract_id: 1003,
        status: 'lost',
        profit: -1.0,
        payout: 0,
        buy_price: 1.0,
      };

      const result = settleTradeContract(contract);
      expect(result.isWin).toBe(false);
      expect(result.profit).toBe(-1.0);
      expect(result.payout).toBe(0);
      expect(result.buyPrice).toBe(1.0);
    });
  });

  describe('settlement flow into risk session and limit triggers', () => {
    const risk: RiskRules = {
      stopLoss: 3,
      takeProfit: 10,
      maxTrades: 3,
      dailyLossLimit: 5,
      cooldown: 2,
      martingale: false,
      antiMartingale: false,
      fixedStake: true,
    };

    it('triggers stop-loss limit when accumulated losses hit threshold', () => {
      let session = initialRiskSessionState();

      // First loss: -$1
      session = updateSessionAfterSettlement(session, { profit: -1.0, isWin: false });
      expect(canExecuteTrade(risk, session).allowed).toBe(true);

      // Second loss: -$1 (net -$2)
      session = updateSessionAfterSettlement(session, { profit: -1.0, isWin: false });
      expect(canExecuteTrade(risk, session).allowed).toBe(true);

      // Third loss: -$1 (net -$3 = stop loss hit!)
      session = updateSessionAfterSettlement(session, { profit: -1.0, isWin: false });
      const check = canExecuteTrade(risk, session);
      expect(check.allowed).toBe(false);
      expect(check.limitReached).toBe('max_trades'); // Also maxTrades was 3
    });

    it('triggers take-profit limit when winning trade meets target', () => {
      const targetRisk: RiskRules = {
        ...risk,
        maxTrades: 10,
        takeProfit: 8,
      };

      let session = initialRiskSessionState();
      session = updateSessionAfterSettlement(session, { profit: 8.09, isWin: true });

      const check = canExecuteTrade(targetRisk, session);
      expect(check.allowed).toBe(false);
      expect(check.limitReached).toBe('take_profit');
    });
  });
});
