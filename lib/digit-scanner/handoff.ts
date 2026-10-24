import type { Direction } from './types';

export const HANDOFF_PARAMS = ['mode', 'digit', 'from'] as const;

export interface BuildTradeHandoffOptions {
  symbol: string;
  direction: Direction;
  digit: number;
}

export interface TradeHandoff {
  symbol: string;
  mode: 'DIGITMATCH' | 'DIGITDIFF';
  digit: number;
}

const SYMBOL_REGEX = /^[A-Za-z0-9_]{1,32}$/;

/**
 * Builds the trade hand-off URL to pre-fill the trade page with the selected market,
 * contract mode, and digit.
 * Throws RangeError if parameters do not strictly match allowed values.
 */
export function buildTradeHandoffUrl({
  symbol,
  direction,
  digit,
}: BuildTradeHandoffOptions): string {
  if (typeof symbol !== 'string' || !SYMBOL_REGEX.test(symbol)) {
    throw new RangeError(`Invalid symbol format: ${symbol}`);
  }

  if (direction !== 'MATCHES' && direction !== 'DIFFERS') {
    throw new RangeError(`Invalid direction: ${direction}. Must be 'MATCHES' or 'DIFFERS'.`);
  }

  if (
    typeof digit !== 'number' ||
    !Number.isInteger(digit) ||
    digit < 0 ||
    digit > 9
  ) {
    throw new RangeError(`Invalid digit: ${digit}. Must be an integer between 0 and 9.`);
  }

  const mode = direction === 'MATCHES' ? 'DIGITMATCH' : 'DIGITDIFF';
  const params = new URLSearchParams({
    symbol,
    mode,
    digit: String(digit),
    from: 'scanner',
  });

  return `/?${params.toString()}`;
}

/**
 * Strictly parses trade handoff URL search query parameters.
 * Returns null if from !== 'scanner', symbol is invalid, mode is not DIGITMATCH / DIGITDIFF,
 * or digit is not an integer in 0-9.
 */
export function parseTradeHandoff(search: string): TradeHandoff | null {
  if (!search) return null;

  try {
    const params = new URLSearchParams(search);
    if (params.get('from') !== 'scanner') {
      return null;
    }

    const mode = params.get('mode');
    if (mode !== 'DIGITMATCH' && mode !== 'DIGITDIFF') {
      return null;
    }

    const digitStr = params.get('digit');
    if (!digitStr || !/^[0-9]$/.test(digitStr)) {
      return null;
    }
    const digit = parseInt(digitStr, 10);

    const symbol = params.get('symbol');
    if (!symbol || !SYMBOL_REGEX.test(symbol)) {
      return null;
    }

    return {
      symbol,
      mode,
      digit,
    };
  } catch {
    return null;
  }
}
