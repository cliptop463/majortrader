import { describe, expect, it } from 'vitest';
import {
  cyclesStrategy,
  decideFromZ,
  frequencyStrategy,
  gapsStrategy,
  momentumStrategy,
  recencyStrategy,
  skewStrategy,
  streakStrategy,
  STRATEGIES,
  STRATEGY_MIN_OBSERVATIONS,
} from '../strategies';

function createSeededRandom(seed = 42) {
  let s = seed;
  return function next() {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('decideFromZ', () => {
  it('chooses MATCHES on hottest digit with z >= 2.0 when coldest does not qualify', () => {
    // 100 ticks, expected 10 per digit. Let digit 7 have 20 occurrences (z = (20-10)/3 = 3.33)
    const counts = [10, 10, 8, 9, 9, 8, 8, 20, 9, 9];
    const decision = decideFromZ(counts, 100);
    expect(decision).not.toBeNull();
    expect(decision?.direction).toBe('MATCHES');
    expect(decision?.digit).toBe(7);
    expect(decision?.strength).toBeCloseTo(3.333 / 4, 2);
  });

  it('chooses DIFFERS on coldest digit with z <= -1.0 when hottest does not qualify', () => {
    // 100 ticks. Let digit 3 have 5 occurrences (z = (5-10)/3 = -1.67) and others ~10-11 (z < 2)
    const counts = [11, 11, 11, 5, 11, 10, 10, 11, 10, 10];
    const decision = decideFromZ(counts, 100);
    expect(decision).not.toBeNull();
    expect(decision?.direction).toBe('DIFFERS');
    expect(decision?.digit).toBe(3);
    expect(decision?.strength).toBeCloseTo(1.667 / 3, 2);
  });

  it('resolves ties between MATCHES and DIFFERS strength in favor of DIFFERS', () => {
    // Custom z-scores directly: hottest z = 2.4 (strength 2.4 / 4 = 0.6)
    // coldest z = -1.8 (strength 1.8 / 3 = 0.6)
    // Strength is equal (0.6 vs 0.6) -> ties go to DIFFERS
    const zScores = [0, 0, 2.4, 0, 0, -1.8, 0, 0, 0, 0];
    const decision = decideFromZ(zScores);
    expect(decision?.direction).toBe('DIFFERS');
    expect(decision?.digit).toBe(5);
  });

  it('resolves ties between digits in favor of the lowest digit', () => {
    // Two digits tie for coldest (digits 2 and 6 both have count 4)
    const counts = [11, 11, 4, 12, 12, 11, 4, 11, 12, 12];
    const decision = decideFromZ(counts, 100);
    expect(decision?.digit).toBe(2);
  });
});

describe('strategies minimum observations check', () => {
  it('returns ineligible when observations are below minimum', () => {
    const fewDigits = [1, 2, 3, 4, 5];
    for (const strat of STRATEGIES) {
      const res = strat(fewDigits);
      expect(res.status).toBe('ineligible');
      expect(res.reason).toMatch(/Needs at least \d+ observations/);
    }
  });
});

describe('frequencyStrategy', () => {
  it('signals MATCHES when a digit is heavily skewed in a 100-tick window', () => {
    // 100 ticks: other 9 digits appear 9 times each (81 ticks), digit 8 appears 19 times
    // For digit 8: z = (19 - 10)/3 = +3.0 >= 2.0
    // For other digits: count = 9, z = (9 - 10)/3 = -0.33 > -1.0 (no DIFFERS qualifies)
    const digits: number[] = [];
    for (let d = 0; d < 10; d++) {
      if (d === 8) continue;
      for (let i = 0; i < 9; i++) digits.push(d);
    }
    for (let i = 0; i < 19; i++) digits.push(8);

    const result = frequencyStrategy(digits);
    expect(result.status).toBe('signal');
    expect(result.digit).toBe(8);
    expect(result.direction).toBe('MATCHES');
  });

  it('abstains when counts are uniformly distributed', () => {
    const digits: number[] = [];
    for (let i = 0; i < 100; i++) digits.push(i % 10);
    const result = frequencyStrategy(digits);
    expect(result.status).toBe('abstain');
  });
});

describe('streakStrategy', () => {
  it('signals MATCHES when run of last digit is >= 3', () => {
    const digits = new Array(30).fill(1);
    digits[26] = 2;
    digits[27] = 4;
    digits[28] = 4;
    digits[29] = 4; // run of 3 for digit 4
    const res3 = streakStrategy(digits);
    expect(res3.status).toBe('signal');
    expect(res3.direction).toBe('MATCHES');
    expect(res3.digit).toBe(4);
    expect(res3.strength).toBeCloseTo(1 / 3, 2);

    digits.push(4); // run of 4
    const res4 = streakStrategy(digits);
    expect(res4.status).toBe('signal');
    expect(res4.strength).toBeCloseTo(2 / 3, 2);
  });

  it('abstains when run is < 3', () => {
    const digits = new Array(30).fill(1);
    digits[28] = 4;
    digits[29] = 4; // run of 2
    const res = streakStrategy(digits);
    expect(res.status).toBe('abstain');
  });
});

describe('momentumStrategy', () => {
  it('flags surging digit between baseline and recent window', () => {
    // 150 ticks: baseline 100 ticks (digits 0-9 appear 10 times each)
    // recent 50 ticks: digit 5 appears 18 times, digits 0-4 appear 4 times each, digits 6-9 appear 3 times each
    const baseline: number[] = [];
    for (let d = 0; d < 10; d++) {
      for (let i = 0; i < 10; i++) baseline.push(d);
    }

    const recent: number[] = [];
    for (let i = 0; i < 18; i++) recent.push(5);
    for (let d = 0; d < 5; d++) {
      for (let i = 0; i < 4; i++) recent.push(d); // 20 ticks
    }
    for (let d = 6; d < 10; d++) {
      for (let i = 0; i < 3; i++) recent.push(d); // 12 ticks
    } // 18 + 20 + 12 = 50 ticks

    const digits = [...baseline, ...recent];

    const res = momentumStrategy(digits);
    expect(res.status).toBe('signal');
    expect(res.digit).toBe(5);
    expect(res.direction).toBe('MATCHES');
  });
});

describe('skewStrategy', () => {
  it('signals DIFFERS on rarest digit when chi-square exceeds 16.92', () => {
    // 100 ticks with severe imbalance: digit 0 appears 50 times, digit 9 appears 0 times
    const digits = new Array(50).fill(0).concat(new Array(50).fill(1));
    const res = skewStrategy(digits);
    expect(res.status).toBe('signal');
    expect(res.direction).toBe('DIFFERS');
    expect(res.strength).toBeGreaterThan(0);
  });
});

describe('gapsStrategy', () => {
  it('signals MATCHES when a digit has not appeared for >= 29 ticks', () => {
    // 100 ticks, digit 7 only appears at index 10 and never again (gap = 99 - 10 = 89 >= 29)
    const digits = new Array(100).fill(0);
    digits[10] = 7;
    const res = gapsStrategy(digits);
    expect(res.status).toBe('signal');
    expect(res.direction).toBe('MATCHES');
    expect(res.digit).toBe(1); // digit 1 never appeared at all, gap = 100 -> ties to lowest missing digit 1!
  });
});

describe('cyclesStrategy', () => {
  it('detects repeating cycle pattern and predicts the next digit', () => {
    // Period 3 repeating: [1, 2, 3, 1, 2, 3, ...]
    const digits: number[] = [];
    for (let i = 0; i < 120; i++) {
      digits.push((i % 3) + 1); // 1, 2, 3, 1, 2, 3...
    }
    const res = cyclesStrategy(digits);
    expect(res.status).toBe('signal');
    expect(res.direction).toBe('MATCHES');
    // For period 3, next predicted is digits[n - 3] which equals digits[120 - 3] = digits[117] = (117 % 3) + 1 = 1
    expect(res.digit).toBe(1);
  });
});
