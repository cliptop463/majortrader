import { describe, expect, it } from 'vitest';
import type { ActiveSymbol } from '@deriv/core';
import { scanMarkets, selectVolatilityMarkets } from '../scan';

function createMarket(overrides: Partial<ActiveSymbol> = {}): ActiveSymbol {
  return {
    exchange_is_open: 1,
    is_trading_suspended: 0,
    market: 'synthetic_index',
    market_display_name: 'Volatility Indices',
    pip_size: 0.01,
    subgroup: 'none',
    subgroup_display_name: 'None',
    submarket: 'random_index',
    submarket_display_name: 'Continuous Indices',
    trade_count: 100,
    underlying_symbol: 'R_100',
    underlying_symbol_name: 'Volatility 100 Index',
    underlying_symbol_type: 'synthetic_index',
    ...overrides,
  };
}

function digitToPrice(digit: number, pipDecimals: number, base = 100): number {
  const step = Math.pow(10, -pipDecimals);
  return Number((base + digit * step).toFixed(pipDecimals));
}

describe('selectVolatilityMarkets', () => {
  it('keeps only R_* and 1HZ*V in random_index and rejects other symbols', () => {
    const symbols: ActiveSymbol[] = [
      createMarket({ underlying_symbol: 'R_10' }),
      createMarket({ underlying_symbol: 'R_100' }),
      createMarket({ underlying_symbol: '1HZ10V' }),
      createMarket({ underlying_symbol: '1HZ100V' }),
      createMarket({ underlying_symbol: 'BOOM500' }), // reject
      createMarket({ underlying_symbol: 'JD10' }), // reject
      createMarket({ underlying_symbol: 'frxEURUSD', submarket: 'major_pairs' }), // reject
      createMarket({ underlying_symbol: 'R_25', submarket: 'daily_reset_index' }), // reject
    ];

    const { markets, skipped } = selectVolatilityMarkets(symbols);
    expect(markets.map((m) => m.underlying_symbol)).toEqual([
      'R_10',
      'R_100',
      '1HZ10V',
      '1HZ100V',
    ]);
    expect(skipped).toEqual([]);
  });

  it('separates suspended and closed markets with appropriate skipped reasons', () => {
    const symbols: ActiveSymbol[] = [
      createMarket({ underlying_symbol: 'R_10', is_trading_suspended: 1 }),
      createMarket({ underlying_symbol: 'R_25', exchange_is_open: 0 }),
      createMarket({ underlying_symbol: 'R_50' }),
    ];

    const { markets, skipped } = selectVolatilityMarkets(symbols);
    expect(markets.map((m) => m.underlying_symbol)).toEqual(['R_50']);
    expect(skipped).toEqual([
      { symbol: 'R_10', displayName: 'Volatility 100 Index', reason: 'Trading suspended' },
      { symbol: 'R_25', displayName: 'Volatility 100 Index', reason: 'Market closed' },
    ]);
  });

  it('de-duplicates repeated symbols in input', () => {
    const symbols: ActiveSymbol[] = [
      createMarket({ underlying_symbol: 'R_10' }),
      createMarket({ underlying_symbol: 'R_10' }),
      createMarket({ underlying_symbol: '1HZ10V' }),
      createMarket({ underlying_symbol: '1HZ10V' }),
    ];

    const { markets } = selectVolatilityMarkets(symbols);
    expect(markets.map((m) => m.underlying_symbol)).toEqual(['R_10', '1HZ10V']);
  });
});

describe('scanMarkets', () => {
  it('preserves input market order in results and respects market pip size', async () => {
    const m1 = createMarket({ underlying_symbol: 'R_10', pip_size: 0.01 }); // 2 decimals
    const m2 = createMarket({ underlying_symbol: 'R_25', pip_size: 0.001 }); // 3 decimals
    const m3 = createMarket({ underlying_symbol: 'R_50', pip_size: 0.1 }); // 1 decimal

    const fetchHistory = async (symbol: string) => {
      const dec = symbol === 'R_10' ? 2 : symbol === 'R_25' ? 3 : 1;
      const nonSevens: number[] = [];
      for (let d = 0; d < 10; d++) {
        if (d === 7) continue;
        for (let i = 0; i < 18; i++) nonSevens.push(d);
      }
      const digits: number[] = [];
      let nsIdx = 0;
      for (let i = 0; i < 200; i++) {
        if (i % 5 === 0 && digits.filter((x) => x === 7).length < 38) {
          digits.push(7);
        } else if (nsIdx < nonSevens.length) {
          digits.push(nonSevens[nsIdx++]);
        } else {
          digits.push(7);
        }
      }
      // End with a run of 5 sevens
      digits.push(7, 7, 7, 7, 7);
      const prices = digits.map((d) => digitToPrice(d, dec));
      return { prices };
    };

    const results = await scanMarkets([m1, m2, m3], fetchHistory, {
      minObservations: 200,
      concurrency: 2,
    });

    expect(results.map((r) => r.symbol)).toEqual(['R_10', 'R_25', 'R_50']);
    expect(results[0].pipSize).toBe(2);
    expect(results[1].pipSize).toBe(3);
    expect(results[2].pipSize).toBe(1);
    expect(results[0].status).toBe('ok');
    expect(results[0].recommendation?.digit).toBe(7);
    expect(results[0].recommendation?.direction).toBe('MATCHES');
  });

  it('limits concurrency so in-flight requests never exceed the concurrency limit', async () => {
    let currentInFlight = 0;
    let maxInFlight = 0;

    const markets = [
      createMarket({ underlying_symbol: 'R_10' }),
      createMarket({ underlying_symbol: 'R_25' }),
      createMarket({ underlying_symbol: 'R_50' }),
      createMarket({ underlying_symbol: 'R_75' }),
      createMarket({ underlying_symbol: 'R_100' }),
    ];

    const fetchHistory = async () => {
      currentInFlight++;
      if (currentInFlight > maxInFlight) maxInFlight = currentInFlight;
      await new Promise((r) => setTimeout(r, 20));
      currentInFlight--;
      return { prices: new Array(250).fill(100.55) };
    };

    await scanMarkets(markets, fetchHistory, { concurrency: 2, minObservations: 100 });
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it('flags insufficient_data when valid ticks are below minObservations', async () => {
    const market = createMarket({ underlying_symbol: 'R_10' });
    const fetchHistory = async () => ({
      // 100 valid ticks, 20 invalid -> valid count = 100 (< 200 required)
      prices: [...new Array(100).fill(100.55), ...new Array(20).fill(NaN)],
    });

    const [result] = await scanMarkets([market], fetchHistory, { minObservations: 200 });
    expect(result.status).toBe('insufficient_data');
    expect(result.observations).toBe(100);
    expect(result.dropped).toBe(20);
    expect(result.strategies).toEqual([]);
    expect(result.recommendation).toBeNull();
    expect(result.message).toBe('Insufficient data: 100 valid tick(s), 200 required (20 invalid dropped).');
  });

  it('handles rejected requests, timeouts, bad pip size, and missing prices as errors', async () => {
    const mRejected = createMarket({ underlying_symbol: 'R_1' });
    const mTimeout = createMarket({ underlying_symbol: 'R_2' });
    const mBadPip = createMarket({ underlying_symbol: 'R_3', pip_size: -1 });
    const mMissingPrices = createMarket({ underlying_symbol: 'R_4' });

    const fetchHistory = async (symbol: string) => {
      if (symbol === 'R_1') throw new Error('API connection lost');
      if (symbol === 'R_2') {
        await new Promise((r) => setTimeout(r, 100)); // will exceed 20ms timeout
        return { prices: [] };
      }
      if (symbol === 'R_4') return {}; // missing prices array
      return { prices: [] };
    };

    const results = await scanMarkets(
      [mRejected, mTimeout, mBadPip, mMissingPrices],
      fetchHistory,
      { timeout: 25, concurrency: 4 }
    );

    expect(results[0].status).toBe('error');
    expect(results[0].message).toBe('API connection lost');

    expect(results[1].status).toBe('error');
    expect(results[1].message).toMatch(/timed out/i);

    expect(results[2].status).toBe('error');
    expect(results[2].message).toBe('Invalid pip size: -1');

    expect(results[3].status).toBe('error');
    expect(results[3].message).toBe('Response missing price history array');
  });
});
