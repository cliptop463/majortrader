import type { ActiveSymbol } from '@deriv/core';
import { extractLastDigits, pipDecimals } from './digits';
import { analyzeDigits } from './ensemble';
import type { MarketAnalysis } from './types';

export const SCAN_DEFAULTS = {
  count: 500,
  minObservations: 200,
  concurrency: 3,
  timeout: 10000,
} as const;

export interface SkippedMarket {
  symbol: string;
  displayName: string;
  reason: 'Trading suspended' | 'Market closed';
}

export interface SelectVolatilityMarketsResult {
  markets: ActiveSymbol[];
  skipped: SkippedMarket[];
}

export interface ScanMarketsOptions {
  count?: number;
  minObservations?: number;
  concurrency?: number;
  timeout?: number;
  directionFilter?: 'ALL' | 'MATCHES' | 'DIFFERS';
  minAgree?: number;
}

/**
 * Filters symbols to Deriv continuous synthetic volatility indices matching
 * /^(R_\d+|1HZ\d+V)$/ in the 'random_index' submarket, de-duplicating by symbol.
 * Separates eligible open markets from those suspended or closed.
 */
export function selectVolatilityMarkets(
  symbols: readonly ActiveSymbol[]
): SelectVolatilityMarketsResult {
  const symbolRegex = /^(R_\d+|1HZ\d+V)$/;
  const seenSymbols = new Set<string>();

  const markets: ActiveSymbol[] = [];
  const skipped: SkippedMarket[] = [];

  for (const sym of symbols) {
    if (sym.submarket !== 'random_index') continue;
    if (!symbolRegex.test(sym.underlying_symbol)) continue;

    if (seenSymbols.has(sym.underlying_symbol)) continue;
    seenSymbols.add(sym.underlying_symbol);

    const displayName = sym.underlying_symbol_name || sym.underlying_symbol;

    if (sym.is_trading_suspended === 1) {
      skipped.push({
        symbol: sym.underlying_symbol,
        displayName,
        reason: 'Trading suspended',
      });
    } else if (sym.exchange_is_open === 0) {
      skipped.push({
        symbol: sym.underlying_symbol,
        displayName,
        reason: 'Market closed',
      });
    } else {
      markets.push(sym);
    }
  }

  return { markets, skipped };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Scans a list of active markets concurrently and returns an array of MarketAnalysis
 * objects in the exact order of the input markets.
 */
export async function scanMarkets(
  markets: readonly ActiveSymbol[],
  fetchHistory: (symbol: string, count: number) => Promise<{ prices?: unknown }>,
  options?: ScanMarketsOptions
): Promise<MarketAnalysis[]> {
  const count = options?.count ?? SCAN_DEFAULTS.count;
  const minObservations = options?.minObservations ?? SCAN_DEFAULTS.minObservations;
  const concurrency = options?.concurrency ?? SCAN_DEFAULTS.concurrency;
  const timeoutMs = options?.timeout ?? SCAN_DEFAULTS.timeout;

  async function analyzeMarket(market: ActiveSymbol): Promise<MarketAnalysis> {
    const symbol = market.underlying_symbol;
    const displayName = market.underlying_symbol_name || symbol;

    const pipSize = pipDecimals(market.pip_size);
    if (pipSize === null) {
      return {
        symbol,
        displayName,
        market: market.market,
        submarket: market.submarket,
        pipSize: null,
        observations: 0,
        dropped: 0,
        status: 'error',
        message: `Invalid pip size: ${market.pip_size}`,
        strategies: [],
        recommendation: null,
      };
    }

    let rawHistory: { prices?: unknown };
    try {
      rawHistory = await withTimeout(fetchHistory(symbol, count), timeoutMs);
    } catch (err) {
      return {
        symbol,
        displayName,
        market: market.market,
        submarket: market.submarket,
        pipSize,
        observations: 0,
        dropped: 0,
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
        strategies: [],
        recommendation: null,
      };
    }

    if (!rawHistory || !Array.isArray(rawHistory.prices)) {
      return {
        symbol,
        displayName,
        market: market.market,
        submarket: market.submarket,
        pipSize,
        observations: 0,
        dropped: 0,
        status: 'error',
        message: 'Response missing price history array',
        strategies: [],
        recommendation: null,
      };
    }

    const { digits, dropped } = extractLastDigits(rawHistory.prices, pipSize);

    if (digits.length < minObservations) {
      return {
        symbol,
        displayName,
        market: market.market,
        submarket: market.submarket,
        pipSize,
        observations: digits.length,
        dropped,
        status: 'insufficient_data',
        message: `Insufficient data: ${digits.length} valid tick(s), ${minObservations} required (${dropped} invalid dropped).`,
        strategies: [],
        recommendation: null,
      };
    }

    const ensemble = analyzeDigits(digits, {
      directionFilter: options?.directionFilter,
      minAgree: options?.minAgree,
    });

    if (!ensemble.recommendation) {
      return {
        symbol,
        displayName,
        market: market.market,
        submarket: market.submarket,
        pipSize,
        observations: digits.length,
        dropped,
        status: 'no_consensus',
        message: ensemble.reason ?? 'Consensus not reached',
        strategies: ensemble.strategies,
        recommendation: null,
      };
    }

    return {
      symbol,
      displayName,
      market: market.market,
      submarket: market.submarket,
      pipSize,
      observations: digits.length,
      dropped,
      status: 'ok',
      strategies: ensemble.strategies,
      recommendation: ensemble.recommendation,
    };
  }

  const results: MarketAnalysis[] = new Array(markets.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < markets.length) {
      const idx = nextIdx++;
      results[idx] = await analyzeMarket(markets[idx]);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), markets.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}
