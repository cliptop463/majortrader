import type { ScannerSignal } from './types';

const SYMBOL_REGEX = /^(R_\d+|1HZ\d+V)$/;
export const DEFAULT_MAX_SIGNAL_AGE_MS = 30_000;
export const DEFAULT_DUPLICATE_WINDOW_MS = 60_000;

export interface ValidationResult {
  valid: boolean;
  signal?: ScannerSignal;
  error?: string;
}

/**
 * Validates a scanner signal prior to trading execution.
 * Ensures:
 * 1. Symbol matches supported volatility indices format.
 * 2. Contract type is strictly 'DIGITMATCH'.
 * 3. Direction is 'MATCHES'.
 * 4. Digit is an integer strictly between 0 and 9.
 * 5. Heuristic score is within 0-100 range.
 * 6. Signal timestamp is not expired and not in the future.
 */
export function validateSignal(
  raw: unknown,
  options?: { maxAgeMs?: number; now?: number }
): ValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Signal payload must be an object.' };
  }

  const s = raw as Record<string, unknown>;

  // 1. Symbol validation
  if (typeof s.symbol !== 'string' || !SYMBOL_REGEX.test(s.symbol)) {
    return {
      valid: false,
      error: `Invalid or unsupported market symbol: "${s.symbol}". Must be a continuous volatility index.`,
    };
  }

  // 2. Contract type validation (strictly DIGITMATCH for this runtime)
  if (s.contractType !== 'DIGITMATCH') {
    return {
      valid: false,
      error: `Invalid contract type "${s.contractType}". Only "DIGITMATCH" is permitted.`,
    };
  }

  // 3. Direction validation
  if (s.direction !== 'MATCHES') {
    return {
      valid: false,
      error: `Invalid signal direction "${s.direction}". Expected "MATCHES".`,
    };
  }

  // 4. Digit validation
  if (
    typeof s.digit !== 'number' ||
    !Number.isInteger(s.digit) ||
    s.digit < 0 ||
    s.digit > 9
  ) {
    return {
      valid: false,
      error: `Invalid target digit: ${s.digit}. Must be an integer between 0 and 9.`,
    };
  }

  // 5. Heuristic score validation
  if (
    typeof s.heuristicScore !== 'number' ||
    isNaN(s.heuristicScore) ||
    s.heuristicScore < 0 ||
    s.heuristicScore > 100
  ) {
    return {
      valid: false,
      error: `Invalid heuristic score: ${s.heuristicScore}. Must be between 0 and 100.`,
    };
  }

  // 6. Agreement & eligibility numbers
  const agree = typeof s.agree === 'number' && s.agree >= 0 ? s.agree : 1;
  const eligible = typeof s.eligible === 'number' && s.eligible >= agree ? s.eligible : agree;

  // 7. Freshness / Expiration check
  const now = options?.now ?? Date.now();
  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_SIGNAL_AGE_MS;

  if (typeof s.timestamp !== 'number' || isNaN(s.timestamp) || s.timestamp <= 0) {
    return { valid: false, error: 'Signal timestamp is missing or invalid.' };
  }

  if (s.timestamp > now + 5000) {
    return { valid: false, error: 'Signal timestamp cannot be in the future.' };
  }

  if (now - s.timestamp > maxAgeMs) {
    return {
      valid: false,
      error: `Signal expired. Age was ${Math.round((now - s.timestamp) / 1000)}s (max allowed: ${Math.round(maxAgeMs / 1000)}s).`,
    };
  }

  const validated: ScannerSignal = {
    id: typeof s.id === 'string' && s.id.length > 0 ? s.id : `${s.symbol}-${s.digit}-${s.timestamp}`,
    symbol: s.symbol,
    contractType: 'DIGITMATCH',
    digit: s.digit,
    direction: 'MATCHES',
    heuristicScore: s.heuristicScore,
    agree,
    eligible,
    timestamp: s.timestamp,
  };

  return { valid: true, signal: validated };
}

/**
 * Tracks executed signals to prevent duplicate orders from firing on the same signal pattern.
 */
export class SignalDeduplicator {
  private executedSignals: Map<string, number> = new Map();

  /**
   * Generates a deterministic key for the symbol + contractType + digit.
   */
  private getSignalKey(signal: { symbol: string; contractType: string; digit: number }): string {
    return `${signal.symbol}:${signal.contractType}:${signal.digit}`;
  }

  /**
   * Checks whether the same market signal was recently executed within the duplicate window.
   */
  public isDuplicate(
    signal: ScannerSignal,
    windowMs: number = DEFAULT_DUPLICATE_WINDOW_MS,
    now: number = Date.now()
  ): boolean {
    const key = this.getSignalKey(signal);
    const lastExecuted = this.executedSignals.get(key);
    if (!lastExecuted) return false;
    return now - lastExecuted < windowMs;
  }

  /**
   * Records that a trade has been initiated or executed for this signal.
   */
  public recordExecution(signal: ScannerSignal, now: number = Date.now()): void {
    const key = this.getSignalKey(signal);
    this.executedSignals.set(key, now);

    // Prune entries older than 2x the duplicate window
    for (const [k, timestamp] of this.executedSignals.entries()) {
      if (now - timestamp > DEFAULT_DUPLICATE_WINDOW_MS * 2) {
        this.executedSignals.delete(k);
      }
    }
  }

  /**
   * Clears all executed signal records.
   */
  public clear(): void {
    this.executedSignals.clear();
  }

  /**
   * Returns the count of active cached executions.
   */
  public size(): number {
    return this.executedSignals.size;
  }
}
