'use client';

import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock,
  History,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Square,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Strategy } from '@/lib/strategy/types';
import type { UseStrategyRuntimeReturn } from '@/hooks/use-strategy-runtime';
import type { DerivAccount } from '@deriv/core';

interface RuntimeControlsProps {
  strategy: Strategy;
  onStrategyChange?: (strategy: Strategy) => void;
  runtime: UseStrategyRuntimeReturn;
  isConnected: boolean;
  isAuthenticated: boolean;
  activeAccount: DerivAccount | null;
  onLogin?: () => void;
}

export function RuntimeControls({
  strategy,
  onStrategyChange,
  runtime,
  isConnected,
  isAuthenticated,
  activeAccount,
  onLogin,
}: RuntimeControlsProps) {
  const [showLogs, setShowLogs] = useState(true);

  const {
    status,
    phase,
    session,
    currentSignal,
    openContract,
    tradeHistory,
    logs,
    cooldownSecondsRemaining,
    lastError,
    isScanning,
    run,
    pause,
    stop,
    resetSession,
    clearLogs,
  } = runtime;

  const isReady = strategy.conditions.length > 0;
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isStopped = status === 'stopped' || status === 'idle';
  const isLimitReached = status === 'limit_reached';

  const phaseLabels: Record<string, string> = {
    idle: 'Idle',
    scanning: isScanning ? 'Scanning volatility markets…' : 'Awaiting market ticks',
    signal_detected: 'Signal detected',
    proposing: 'Requesting proposal…',
    purchasing: 'Submitting purchase order…',
    open_contract: 'Contract open',
    settling: 'Settling contract…',
    cooldown: `Cooldown active (${cooldownSecondsRemaining}s)`,
    halted: isLimitReached ? 'Risk limit reached' : 'Halted',
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Runtime
          </p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Execution controls</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] uppercase tracking-wider font-semibold ${
              isRunning
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 animate-pulse'
                : isPaused
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                : isLimitReached
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-500'
                : 'border-border bg-muted text-muted-foreground'
            }`}
          >
            {status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Main Action Controls: Run, Pause, Stop, Reset */}
      <div className="flex flex-wrap items-center gap-2">
        {isPaused ? (
          <Button
            variant="default"
            onClick={run}
            disabled={!isReady || !isConnected}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <Play className="mr-1.5 h-4 w-4" />
            Resume
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={run}
            disabled={!isReady || isRunning || !isConnected}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <Play className="mr-1.5 h-4 w-4" />
            {isRunning ? 'Running…' : 'Run'}
          </Button>
        )}

        <Button
          variant="outline"
          onClick={pause}
          disabled={!isRunning}
          className="border-border text-foreground hover:bg-muted font-medium"
        >
          <Pause className="mr-1.5 h-4 w-4" />
          Pause
        </Button>

        <Button
          variant="outline"
          onClick={stop}
          disabled={isStopped && !isLimitReached}
          className="border-border text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 font-medium"
        >
          <Square className="mr-1.5 h-4 w-4" />
          Stop
        </Button>

        {(isStopped || isLimitReached) && (session.totalTrades > 0 || session.netProfit !== 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSession}
            className="text-xs text-muted-foreground hover:text-foreground ml-auto"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset Stats
          </Button>
        )}
      </div>

      {/* Auth Gate Notification */}
      {!isAuthenticated && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Deriv authentication required</p>
              <p className="text-amber-200/80 mt-0.5">
                Log in to execute live DIGITMATCH orders on your Deriv account.
              </p>
            </div>
          </div>
          {onLogin && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onLogin}
              className="shrink-0 text-xs font-semibold bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/40"
            >
              Log in
            </Button>
          )}
        </div>
      )}

      {/* Connection & Engine Status Panel */}
      <div className="rounded-xl border border-border bg-background/50 p-3 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-rose-500" />
            )}
            Deriv Connection
          </span>
          <span
            className={`font-semibold flex items-center gap-1.5 ${
              isConnected ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            <CircleDot className="h-2 w-2 fill-current" />
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Deriv Account</span>
          <span className="font-medium text-foreground">
            {isAuthenticated
              ? activeAccount?.account_id ?? 'Authenticated'
              : 'Unauthenticated'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Execution Phase</span>
          <span className="font-medium text-foreground capitalize">
            {phaseLabels[phase] ?? phase}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Scanner Target</span>
          <span className="font-medium text-emerald-500">
            DIGITMATCH (Vol Indices)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Contract Policy</span>
          <span className="font-medium text-foreground">1 Open Max / Fixed Stake</span>
        </div>
      </div>

      {/* Active Open Contract Monitor */}
      {openContract && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <CircleDot className="h-3 w-3 animate-ping text-primary" />
              Active Open Contract
            </span>
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
              #{openContract.contract_id}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-foreground pt-1">
            <div>
              <span className="text-muted-foreground">Market: </span>
              <span className="font-semibold">{openContract.underlying_symbol}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Target Digit: </span>
              <span className="font-semibold">{openContract.barrier ?? strategy.trade.stake}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Stake: </span>
              <span className="font-semibold">${openContract.buy_price}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Potential Payout: </span>
              <span className="font-semibold">${openContract.payout}</span>
            </div>
          </div>
        </div>
      )}

      {/* Risk & Performance Metrics Bar */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Risk & Session Limits
          </span>
          <span className="text-[11px] text-muted-foreground">
            Stake: ${strategy.trade.stake.toFixed(2)} (Fixed)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border bg-background p-2">
            <p className="text-muted-foreground">Session P&L</p>
            <p
              className={`text-base font-bold mt-0.5 flex items-center gap-1 ${
                session.netProfit > 0
                  ? 'text-emerald-500'
                  : session.netProfit < 0
                  ? 'text-rose-500'
                  : 'text-foreground'
              }`}
            >
              {session.netProfit > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : session.netProfit < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : null}
              {session.netProfit >= 0 ? `+$${session.netProfit.toFixed(2)}` : `-$${Math.abs(session.netProfit).toFixed(2)}`}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background p-2">
            <p className="text-muted-foreground">Trades Completed</p>
            <p className="text-base font-bold mt-0.5 text-foreground">
              {session.totalTrades} / {strategy.risk.maxTrades}
              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                ({session.wins}W - {session.losses}L)
              </span>
            </p>
          </div>
        </div>

        {/* Limit threshold indicators */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between border-b border-border/40 pb-1">
            <span>Take-profit limit:</span>
            <span className="font-semibold text-emerald-500">
              +${strategy.risk.takeProfit.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border/40 pb-1">
            <span>Stop-loss limit:</span>
            <span className="font-semibold text-rose-500">
              -${strategy.risk.stopLoss.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Signal Notice */}
      {currentSignal && (
        <div className="rounded-xl border border-border bg-background/50 p-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]">
              MATCH {currentSignal.digit}
            </Badge>
            <span className="font-medium text-foreground">{currentSignal.symbol}</span>
          </div>
          <span className="text-muted-foreground text-[11px]">
            Score: {currentSignal.heuristicScore}/100 ({currentSignal.agree}/{currentSignal.eligible} agreed)
          </span>
        </div>
      )}

      {/* Live Execution Audit Log */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLogs((prev) => !prev)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-1.5 uppercase tracking-wider">
            <History className="h-3.5 w-3.5" />
            Execution Audit Log ({logs.length})
          </span>
          <div className="flex items-center gap-1">
            {logs.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  clearLogs();
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground mr-2 underline cursor-pointer"
              >
                Clear
              </span>
            )}
            {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showLogs && (
          <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto text-[11px] font-mono bg-background/60">
            {logs.length === 0 ? (
              <p className="text-muted-foreground italic text-center py-2">
                No execution events logged yet. Press Run to start scanning.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-1.5 leading-relaxed ${
                    log.level === 'error'
                      ? 'text-rose-400'
                      : log.level === 'warn'
                      ? 'text-amber-400'
                      : log.level === 'success'
                      ? 'text-emerald-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span className="text-[10px] opacity-60 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Statistical Disclaimer Footnote */}
      <div className="rounded-xl border border-border/60 bg-muted/10 p-2.5 text-[10px] text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground/80 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Statistical Heuristics & Risk Note
        </p>
        <p>
          Heuristic scores indicate empirical consensus from past ticks and are not win probabilities.
          DIGITMATCH trades return ~9:1 payout on matches; non-matching outcomes forfeit the stake.
          Martingale is strictly disabled.
        </p>
      </div>
    </div>
  );
}
