import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_SIGNAL_AGE_MS,
  SignalDeduplicator,
  validateSignal,
} from '../signalValidator';
import type { ScannerSignal } from '../types';

describe('signalValidator', () => {
  const createValidSignal = (overrides?: Partial<ScannerSignal>): ScannerSignal => ({
    id: 'sig-test-1',
    symbol: 'R_100',
    contractType: 'DIGITMATCH',
    digit: 7,
    direction: 'MATCHES',
    heuristicScore: 78.5,
    agree: 3,
    eligible: 6,
    timestamp: Date.now(),
    ...overrides,
  });

  describe('validateSignal', () => {
    it('accepts valid DIGITMATCH volatility signal', () => {
      const now = Date.now();
      const valid = createValidSignal({ timestamp: now - 1000 });
      const result = validateSignal(valid, { now });

      expect(result.valid).toBe(true);
      expect(result.signal).toBeDefined();
      expect(result.signal?.symbol).toBe('R_100');
      expect(result.signal?.contractType).toBe('DIGITMATCH');
      expect(result.signal?.digit).toBe(7);
      expect(result.signal?.heuristicScore).toBe(78.5);
    });

    it('accepts 1HZ volatility indices (e.g. 1HZ10V, 1HZ100V)', () => {
      const valid = createValidSignal({ symbol: '1HZ50V' });
      const result = validateSignal(valid);
      expect(result.valid).toBe(true);
      expect(result.signal?.symbol).toBe('1HZ50V');
    });

    it('rejects invalid or non-volatility symbols', () => {
      expect(validateSignal(createValidSignal({ symbol: 'forex_eurusd' })).valid).toBe(false);
      expect(validateSignal(createValidSignal({ symbol: '<script>' })).valid).toBe(false);
      expect(validateSignal(createValidSignal({ symbol: '' })).valid).toBe(false);
    });

    it('rejects non-DIGITMATCH contract types', () => {
      const result = validateSignal({
        ...createValidSignal(),
        contractType: 'DIGITDIFF',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Only "DIGITMATCH" is permitted');
    });

    it('rejects non-MATCHES direction', () => {
      const result = validateSignal({
        ...createValidSignal(),
        direction: 'DIFFERS',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expected "MATCHES"');
    });

    it('rejects digits outside 0-9 or non-integers', () => {
      expect(validateSignal(createValidSignal({ digit: -1 })).valid).toBe(false);
      expect(validateSignal(createValidSignal({ digit: 10 })).valid).toBe(false);
      expect(validateSignal(createValidSignal({ digit: 3.5 })).valid).toBe(false);
      expect(validateSignal(createValidSignal({ digit: NaN })).valid).toBe(false);
    });

    it('rejects invalid heuristic scores', () => {
      expect(validateSignal(createValidSignal({ heuristicScore: -5 })).valid).toBe(false);
      expect(validateSignal(createValidSignal({ heuristicScore: 105 })).valid).toBe(false);
      expect(validateSignal(createValidSignal({ heuristicScore: NaN })).valid).toBe(false);
    });

    it('rejects expired signals older than maxAgeMs', () => {
      const now = 100_000;
      const expiredSignal = createValidSignal({
        timestamp: now - (DEFAULT_MAX_SIGNAL_AGE_MS + 5000),
      });

      const result = validateSignal(expiredSignal, { now });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Signal expired');
    });

    it('rejects future timestamps beyond clock drift', () => {
      const now = 100_000;
      const futureSignal = createValidSignal({ timestamp: now + 10_000 });
      const result = validateSignal(futureSignal, { now });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('rejects non-object payloads', () => {
      expect(validateSignal(null).valid).toBe(false);
      expect(validateSignal(undefined).valid).toBe(false);
      expect(validateSignal('string-signal').valid).toBe(false);
      expect(validateSignal(42).valid).toBe(false);
    });
  });

  describe('SignalDeduplicator', () => {
    it('detects duplicate signals within duplicate window', () => {
      const deduplicator = new SignalDeduplicator();
      const signal = createValidSignal({ symbol: 'R_100', digit: 4 });
      const t0 = 10_000;

      expect(deduplicator.isDuplicate(signal, 60_000, t0)).toBe(false);

      deduplicator.recordExecution(signal, t0);

      // Same signal 10 seconds later: should be duplicate
      expect(deduplicator.isDuplicate(signal, 60_000, t0 + 10_000)).toBe(true);

      // Same symbol different digit: NOT duplicate
      const diffDigitSignal = createValidSignal({ symbol: 'R_100', digit: 5 });
      expect(deduplicator.isDuplicate(diffDigitSignal, 60_000, t0 + 10_000)).toBe(false);

      // Different symbol same digit: NOT duplicate
      const diffSymbolSignal = createValidSignal({ symbol: 'R_50', digit: 4 });
      expect(deduplicator.isDuplicate(diffSymbolSignal, 60_000, t0 + 10_000)).toBe(false);

      // After duplicate window (65 seconds later): NO longer duplicate
      expect(deduplicator.isDuplicate(signal, 60_000, t0 + 65_000)).toBe(false);
    });

    it('clears all cached executions on clear()', () => {
      const deduplicator = new SignalDeduplicator();
      const signal = createValidSignal({ symbol: 'R_10', digit: 2 });
      deduplicator.recordExecution(signal, 5000);

      expect(deduplicator.isDuplicate(signal, 60_000, 6000)).toBe(true);
      deduplicator.clear();
      expect(deduplicator.isDuplicate(signal, 60_000, 6000)).toBe(false);
      expect(deduplicator.size()).toBe(0);
    });
  });
});
