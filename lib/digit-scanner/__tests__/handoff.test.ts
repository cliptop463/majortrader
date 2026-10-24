import { describe, expect, it } from 'vitest';
import {
  buildTradeHandoffUrl,
  HANDOFF_PARAMS,
  parseTradeHandoff,
} from '../handoff';

describe('handoff', () => {
  it('exports HANDOFF_PARAMS containing mode, digit, and from', () => {
    expect(HANDOFF_PARAMS).toEqual(['mode', 'digit', 'from']);
  });

  describe('buildTradeHandoffUrl and parseTradeHandoff round-trip', () => {
    it('round-trips MATCHES direction to DIGITMATCH', () => {
      const url = buildTradeHandoffUrl({
        symbol: 'R_100',
        direction: 'MATCHES',
        digit: 7,
      });

      expect(url).toBe('/?symbol=R_100&mode=DIGITMATCH&digit=7&from=scanner');

      const parsed = parseTradeHandoff(url.replace('/', ''));
      expect(parsed).toEqual({
        symbol: 'R_100',
        mode: 'DIGITMATCH',
        digit: 7,
      });
    });

    it('round-trips DIFFERS direction to DIGITDIFF', () => {
      const url = buildTradeHandoffUrl({
        symbol: '1HZ50V',
        direction: 'DIFFERS',
        digit: 0,
      });

      expect(url).toBe('/?symbol=1HZ50V&mode=DIGITDIFF&digit=0&from=scanner');

      const parsed = parseTradeHandoff(url.replace('/', ''));
      expect(parsed).toEqual({
        symbol: '1HZ50V',
        mode: 'DIGITDIFF',
        digit: 0,
      });
    });
  });

  describe('buildTradeHandoffUrl validation', () => {
    it('rejects digit 10, -1, 2.5, and NaN with RangeError', () => {
      expect(() =>
        buildTradeHandoffUrl({ symbol: 'R_100', direction: 'MATCHES', digit: 10 })
      ).toThrow(RangeError);

      expect(() =>
        buildTradeHandoffUrl({ symbol: 'R_100', direction: 'MATCHES', digit: -1 })
      ).toThrow(RangeError);

      expect(() =>
        buildTradeHandoffUrl({ symbol: 'R_100', direction: 'MATCHES', digit: 2.5 })
      ).toThrow(RangeError);

      expect(() =>
        buildTradeHandoffUrl({ symbol: 'R_100', direction: 'MATCHES', digit: NaN })
      ).toThrow(RangeError);
    });

    it('rejects invalid symbols', () => {
      expect(() =>
        buildTradeHandoffUrl({ symbol: '<script>', direction: 'MATCHES', digit: 5 })
      ).toThrow(RangeError);

      expect(() =>
        buildTradeHandoffUrl({ symbol: '', direction: 'MATCHES', digit: 5 })
      ).toThrow(RangeError);

      expect(() =>
        buildTradeHandoffUrl({
          symbol: 'very_long_symbol_name_that_exceeds_thirty_two_characters_limit',
          direction: 'MATCHES',
          digit: 5,
        })
      ).toThrow(RangeError);
    });

    it('rejects unknown directions', () => {
      expect(() =>
        buildTradeHandoffUrl({
          symbol: 'R_100',
          direction: 'OVER' as any,
          digit: 5,
        })
      ).toThrow(RangeError);
    });
  });

  describe('parseTradeHandoff validation', () => {
    it('returns null without from=scanner', () => {
      expect(parseTradeHandoff('?symbol=R_100&mode=DIGITMATCH&digit=7')).toBeNull();
      expect(
        parseTradeHandoff('?symbol=R_100&mode=DIGITMATCH&digit=7&from=other')
      ).toBeNull();
    });

    it('returns null with unsupported mode (e.g. DIGITOVER, DIGITUNDER)', () => {
      expect(
        parseTradeHandoff('?symbol=R_100&mode=DIGITOVER&digit=7&from=scanner')
      ).toBeNull();
      expect(
        parseTradeHandoff('?symbol=R_100&mode=DIGITEVEN&digit=7&from=scanner')
      ).toBeNull();
    });

    it('returns null for invalid digit (12, -1, empty, missing, non-digit)', () => {
      expect(
        parseTradeHandoff('?symbol=R_100&mode=DIGITMATCH&digit=12&from=scanner')
      ).toBeNull();
      expect(
        parseTradeHandoff('?symbol=R_100&mode=DIGITMATCH&digit=-1&from=scanner')
      ).toBeNull();
      expect(
        parseTradeHandoff('?symbol=R_100&mode=DIGITMATCH&digit=&from=scanner')
      ).toBeNull();
      expect(
        parseTradeHandoff('?symbol=R_100&mode=DIGITMATCH&from=scanner')
      ).toBeNull();
      expect(
        parseTradeHandoff('?symbol=R_100&mode=DIGITMATCH&digit=abc&from=scanner')
      ).toBeNull();
    });

    it('returns null for invalid or missing symbol', () => {
      expect(
        parseTradeHandoff('?symbol=<script>&mode=DIGITMATCH&digit=5&from=scanner')
      ).toBeNull();
      expect(
        parseTradeHandoff('?mode=DIGITMATCH&digit=5&from=scanner')
      ).toBeNull();
      expect(
        parseTradeHandoff('?symbol=&mode=DIGITMATCH&digit=5&from=scanner')
      ).toBeNull();
    });

    it('returns null for empty search string', () => {
      expect(parseTradeHandoff('')).toBeNull();
    });
  });
});
