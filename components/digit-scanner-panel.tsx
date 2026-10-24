'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { ActiveSymbol, DerivWS, TicksHistoryResponse } from '@deriv/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import {
  SCAN_DEFAULTS,
  scanMarkets,
  selectVolatilityMarkets,
  type SkippedMarket,
} from '@/lib/digit-scanner/scan';
import { rankMarkets } from '@/lib/digit-scanner/ensemble';
import { buildTradeHandoffUrl } from '@/lib/digit-scanner/handoff';
import type { MarketAnalysis, RankedMarket } from '@/lib/digit-scanner/types';

export interface DigitScannerPanelProps {
  ws: DerivWS | null;
  isConnected: boolean;
  symbols: ActiveSymbol[];
  symbolsLoading: boolean;
}

export function DigitScannerPanel({
  ws,
  isConnected,
  symbols,
  symbolsLoading,
}: DigitScannerPanelProps) {
  const router = useRouter();
  const { localize } = useAppTranslations();
  const alertId = useId();

  const [tickCount, setTickCount] = useState<number>(500);
  const [directionFilter, setDirectionFilter] = useState<'MATCHES' | 'ALL' | 'DIFFERS'>('MATCHES');

  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  const [rankedMarkets, setRankedMarkets] = useState<RankedMarket[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<RankedMarket | null>(null);
  const [excludedMarkets, setExcludedMarkets] = useState<MarketAnalysis[]>([]);
  const [skippedMarkets, setSkippedMarkets] = useState<SkippedMarket[]>([]);

  const scanIdRef = useRef(0);

  useEffect(() => {
    return () => {
      // Invalidate any pending scan on unmount
      scanIdRef.current++;
    };
  }, []);

  const { markets: eligibleVolatilityMarkets, skipped: initialSkipped } = useMemo(() => {
    return selectVolatilityMarkets(symbols);
  }, [symbols]);

  const fetchHistory = useCallback(
    async (symbol: string, count: number) => {
      if (!ws || !isConnected) {
        throw new Error(localize('WebSocket is not connected'));
      }
      const response = await ws.send<TicksHistoryResponse>({
        ticks_history: symbol,
        end: 'latest',
        start: 1,
        count,
        style: 'ticks',
      });
      return { prices: response.history?.prices };
    },
    [ws, isConnected, localize]
  );

  const handleStartScan = async () => {
    if (!ws || !isConnected || isScanning || symbolsLoading || eligibleVolatilityMarkets.length === 0) {
      return;
    }

    const currentScanId = ++scanIdRef.current;
    setIsScanning(true);
    setScanProgress({ current: 0, total: eligibleVolatilityMarkets.length });

    try {
      const analyses = await scanMarkets(eligibleVolatilityMarkets, fetchHistory, {
        count: tickCount,
        minObservations: Math.min(150, Math.floor(tickCount * 0.75)),
        concurrency: SCAN_DEFAULTS.concurrency,
        timeout: SCAN_DEFAULTS.timeout,
        directionFilter: directionFilter,
      });

      if (scanIdRef.current !== currentScanId) {
        return;
      }

      const ranking = rankMarkets(analyses);
      setRankedMarkets(ranking.ranked);
      setSelectedMarket(ranking.selected);
      setExcludedMarkets(ranking.excluded);
      setSkippedMarkets(initialSkipped);
      setHasScanned(true);
    } catch {
      if (scanIdRef.current === currentScanId) {
        setHasScanned(true);
      }
    } finally {
      if (scanIdRef.current === currentScanId) {
        setIsScanning(false);
      }
    }
  };

  const handleHandoff = (market: RankedMarket) => {
    const url = buildTradeHandoffUrl({
      symbol: market.analysis.symbol,
      direction: market.recommendation.direction,
      digit: market.recommendation.digit,
    });
    router.push(url);
  };

  const isScanDisabled =
    !isConnected || isScanning || symbolsLoading || eligibleVolatilityMarkets.length === 0;

  return (
    <div className="space-y-6">
      {/* Top action & status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border bg-card">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>{localize('Matches/Differs Digit Scanner')}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {localize(
              'Scans synthetic volatility indices with 8 heuristic rules to find consensus patterns.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleStartScan}
            disabled={isScanDisabled}
            size="lg"
            className="w-full sm:w-auto font-medium"
          >
            {isScanning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                <span>{localize('Scanning markets…')}</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                <span>{hasScanned ? localize('Re-scan markets') : localize('Scan markets')}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Scanner Configuration Card: Ticks to study & Target direction */}
      <Card className="border border-border bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Setting 1: Signal Priority */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {localize('Signal Target (Priority)')}
                </label>
                {directionFilter === 'MATCHES' && (
                  <Badge variant="secondary" className="text-[11px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {localize('Priority: Matches')}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-muted/70 border border-border">
                <button
                  type="button"
                  onClick={() => setDirectionFilter('MATCHES')}
                  disabled={isScanning}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    directionFilter === 'MATCHES'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {localize('Matches Only')}
                </button>
                <button
                  type="button"
                  onClick={() => setDirectionFilter('ALL')}
                  disabled={isScanning}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    directionFilter === 'ALL'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {localize('All Signals')}
                </button>
                <button
                  type="button"
                  onClick={() => setDirectionFilter('DIFFERS')}
                  disabled={isScanning}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    directionFilter === 'DIFFERS'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {localize('Differs Only')}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {directionFilter === 'MATCHES'
                  ? localize('Returns high-confidence Matches signals for pre-filling your buy page.')
                  : directionFilter === 'ALL'
                  ? localize('Returns all consensus signals (Matches and Differs).')
                  : localize('Returns Differs signals only.')}
              </p>
            </div>

            {/* Setting 2: Number of Ticks to Study (200 - 1000) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {localize('Ticks (Tickets) to Study: {{count}}', { count: tickCount })}
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {localize('Range: 200 – 1000 ticks')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={200}
                  max={1000}
                  step={50}
                  value={tickCount}
                  onChange={(e) => setTickCount(parseInt(e.target.value, 10))}
                  className="flex-1 accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                  disabled={isScanning}
                />
                <span className="text-xs font-bold px-2 py-1 rounded bg-muted border border-border min-w-[52px] text-center">
                  {tickCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                {[200, 300, 500, 750, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTickCount(preset)}
                    disabled={isScanning}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                      tickCount === preset
                        ? 'bg-primary/10 border-primary text-primary font-bold'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Warning */}
      {!isConnected && (
        <div
          role="alert"
          id={alertId}
          className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{localize('Not connected to Deriv WebSocket')}</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              {localize('Please wait while the connection is established before scanning.')}
            </p>
          </div>
        </div>
      )}

      {/* Loading state for symbols */}
      {symbolsLoading && (
        <div className="p-4 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>{localize('Loading active volatility markets…')}</span>
        </div>
      )}

      {/* Selected Market Banner */}
      {selectedMarket && (
        <Card className="border-primary/40 bg-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary text-primary-foreground">
                  {localize('Selected Pick')}
                </span>
                <span className="text-sm text-muted-foreground">
                  {selectedMarket.analysis.displayName} ({selectedMarket.analysis.symbol})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-background text-foreground border-border font-medium">
                  {localize('Heuristic score {{score}} / 100', {
                    score: selectedMarket.recommendation.heuristicScore,
                  })}
                </Badge>
                <Badge variant="outline" className="bg-background text-foreground border-border font-medium">
                  {localize('{{agree}} of {{eligible}} eligible strategies agree', {
                    agree: selectedMarket.recommendation.agree,
                    eligible: selectedMarket.recommendation.eligible,
                  })}
                </Badge>
              </div>
            </div>

            <CardTitle className="text-2xl font-bold mt-2 flex items-center gap-3">
              <span
                className={
                  selectedMarket.recommendation.direction === 'MATCHES'
                    ? 'text-emerald-500'
                    : 'text-blue-500'
                }
              >
                {selectedMarket.recommendation.direction} {selectedMarket.recommendation.digit}
              </span>
              <span className="text-muted-foreground font-normal text-lg">
                on {selectedMarket.analysis.displayName}
              </span>
            </CardTitle>

            <CardDescription className="text-xs text-muted-foreground mt-1">
              {localize('{{disagree}} strategies disagreed or abstained.', {
                disagree: selectedMarket.recommendation.disagree,
              })}{' '}
              {localize('Note: The heuristic score is not a probability of winning.')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Strategy breakdown table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">{localize('Strategy')}</TableHead>
                    <TableHead className="w-[140px]">{localize('Signal')}</TableHead>
                    <TableHead>{localize('Reason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMarket.analysis.strategies.map((strategy) => (
                    <TableRow key={strategy.id}>
                      <TableCell className="font-medium text-foreground">
                        {strategy.name}
                      </TableCell>
                      <TableCell>
                        {strategy.status === 'signal' ? (
                          <Badge
                            className={
                              strategy.direction === 'MATCHES'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }
                          >
                            {strategy.direction} {strategy.digit}
                          </Badge>
                        ) : strategy.status === 'abstain' ? (
                          <span className="text-xs text-muted-foreground">{localize('Abstain')}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {localize('Ineligible')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {strategy.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Hand-off Action CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-border/60">
              <p className="text-xs text-muted-foreground max-w-xl">
                {localize(
                  'Opens the trade page with this market, contract and digit filled in. Your stake and duration are unchanged and nothing is bought until you press Buy.'
                )}
              </p>
              <Button
                size="lg"
                onClick={() => handleHandoff(selectedMarket)}
                className="font-semibold shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <span>{localize('Configure on Buy Page & Trade')}</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty consensus state */}
      {hasScanned && !selectedMarket && (
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-base font-medium text-foreground">
              {localize('No market produced a valid signal. Nothing is selected.')}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {localize(
                'None of the scanned markets satisfied the minimum strategy agreement consensus criteria.'
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ranking Table */}
      {rankedMarkets.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {localize('Market Rankings')}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {localize(
                'Markets are ranked by heuristic score (descending), agreement count (descending), eligible count (descending), and symbol (ascending).'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">{localize('Rank')}</TableHead>
                    <TableHead>{localize('Market')}</TableHead>
                    <TableHead>{localize('Action')}</TableHead>
                    <TableHead>{localize('Score')}</TableHead>
                    <TableHead>{localize('Agree / Eligible')}</TableHead>
                    <TableHead className="text-right">{localize('Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankedMarkets.map((ranked) => (
                    <TableRow key={ranked.analysis.symbol}>
                      <TableCell className="text-center font-bold text-muted-foreground">
                        #{ranked.rank}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">
                          {ranked.analysis.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ranked.analysis.symbol}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            ranked.recommendation.direction === 'MATCHES'
                              ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                          }
                        >
                          {ranked.recommendation.direction} {ranked.recommendation.digit}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {ranked.recommendation.heuristicScore} / 100
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {ranked.recommendation.agree} / {ranked.recommendation.eligible}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleHandoff(ranked)}
                          className="font-medium hover:bg-emerald-600 hover:text-white transition-colors"
                        >
                          <span>{localize('Configure & Trade')}</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Excluded & Skipped Markets Section */}
      {hasScanned && (excludedMarkets.length > 0 || skippedMarkets.length > 0) && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              {localize('Not Ranked')}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {localize('Markets excluded due to lack of consensus, insufficient ticks, errors, or closed status.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">{localize('Market')}</TableHead>
                    <TableHead className="w-[140px]">{localize('Status')}</TableHead>
                    <TableHead>{localize('Reason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excludedMarkets.map((market) => (
                    <TableRow key={market.symbol}>
                      <TableCell>
                        <div className="font-medium text-foreground">{market.displayName}</div>
                        <div className="text-xs text-muted-foreground">{market.symbol}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {market.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {market.message ?? localize('No consensus reached')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {skippedMarkets.map((skipped) => (
                    <TableRow key={`skipped-${skipped.symbol}`}>
                      <TableCell>
                        <div className="font-medium text-foreground">{skipped.displayName}</div>
                        <div className="text-xs text-muted-foreground">{skipped.symbol}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                          {localize('Skipped')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {skipped.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Limitations Footnote */}
      <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <HelpCircle className="h-4 w-4" />
          <span>{localize('Statistical Disclaimers & Limitations')}</span>
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            {localize(
              'Deriv synthetic-index digits are designed to be independent and uniformly random. These heuristics measure past sample noise and do not offer any expected edge.'
            )}
          </li>
          <li>
            {localize(
              'A DIFFERS win pays a small fraction of the stake while one loss costs the entire stake; a MATCHES win pays ~9:1 but has a theoretical random frequency of ~1 in 10.'
            )}
          </li>
          <li>
            {localize(
              'Strategies share the same input tick series, so agreement is weak evidence. Thresholds are fixed heuristic rules of thumb.'
            )}
          </li>
          <li>
            {localize(
              'The heuristic score is uncalibrated and is not a probability; backtests or historical fits do not guarantee future results.'
            )}
          </li>
          <li>
            {localize(
              'Digits update every second; recommendations can become stale quickly. Always re-scan before executing.'
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
