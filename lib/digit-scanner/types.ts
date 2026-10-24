export type Direction = 'MATCHES' | 'DIFFERS';

export interface StrategyResult {
  id: string;
  name: string;
  status: 'signal' | 'abstain' | 'ineligible';
  direction?: Direction;
  digit?: number;
  strength?: number;
  reason: string;
}

export interface Recommendation {
  direction: Direction;
  digit: number;
  agree: number;
  disagree: number;
  eligible: number;
  heuristicScore: number;
}

export interface EnsembleResult {
  strategies: StrategyResult[];
  recommendation: Recommendation | null;
  reason?: string;
}

export interface MarketAnalysis {
  symbol: string;
  displayName: string;
  market: string;
  submarket: string;
  pipSize: number | null;
  observations: number;
  dropped: number;
  status: 'ok' | 'no_consensus' | 'insufficient_data' | 'error';
  message?: string;
  strategies: StrategyResult[];
  recommendation: Recommendation | null;
}

export interface RankedMarket {
  rank: number;
  analysis: MarketAnalysis;
  recommendation: Recommendation;
}

export interface RankingResult {
  ranked: RankedMarket[];
  selected: RankedMarket | null;
  excluded: MarketAnalysis[];
}
