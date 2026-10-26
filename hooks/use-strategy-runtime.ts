'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ActiveSymbol,
  BuyResponse,
  DerivAccount,
  DerivWS,
  ProposalResponse,
  TicksHistoryResponse,
} from '@deriv/core';
import type { OpenPosition } from './use-open-positions';
import type {
  ExecutionPhase,
  RiskSessionState,
  RuntimeEventLog,
  RuntimeStatus,
  ScannerSignal,
  Strategy,
  TradeRecord,
} from '@/lib/strategy/types';
import {
  canExecuteTrade,
  initialRiskSessionState,
  updateSessionAfterSettlement,
  validateStake,
} from '@/lib/strategy/riskManager';
import {
  DEFAULT_DUPLICATE_WINDOW_MS,
  DEFAULT_MAX_SIGNAL_AGE_MS,
  SignalDeduplicator,
  validateSignal,
} from '@/lib/strategy/signalValidator';
import { settleTradeContract, transitionRuntime } from '@/lib/strategy/runtime';
import { scanMarkets, selectVolatilityMarkets } from '@/lib/digit-scanner/scan';
import { rankMarkets } from '@/lib/digit-scanner/ensemble';
import { toast } from 'sonner';

export interface UseStrategyRuntimeParams {
  strategy: Strategy;
  ws: DerivWS | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  activeAccount: DerivAccount | null;
  symbols: ActiveSymbol[];
  symbolsLoading: boolean;
  onAuthRequired?: () => void;
}

export interface UseStrategyRuntimeReturn {
  status: RuntimeStatus;
  phase: ExecutionPhase;
  session: RiskSessionState;
  currentSignal: ScannerSignal | null;
  openContract: OpenPosition | null;
  tradeHistory: TradeRecord[];
  logs: RuntimeEventLog[];
  cooldownSecondsRemaining: number;
  lastError: string | null;
  isScanning: boolean;
  run: () => void;
  pause: () => void;
  stop: () => void;
  resetSession: () => void;
  clearLogs: () => void;
}

export function useStrategyRuntime({
  strategy,
  ws,
  isConnected,
  isAuthenticated,
  activeAccount,
  symbols,
  symbolsLoading,
  onAuthRequired,
}: UseStrategyRuntimeParams): UseStrategyRuntimeReturn {
  const [status, setStatus] = useState<RuntimeStatus>('idle');
  const [phase, setPhase] = useState<ExecutionPhase>('idle');
  const [session, setSession] = useState<RiskSessionState>(initialRiskSessionState);
  const [currentSignal, setCurrentSignal] = useState<ScannerSignal | null>(null);
  const [openContract, setOpenContract] = useState<OpenPosition | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [logs, setLogs] = useState<RuntimeEventLog[]>([]);
  const [cooldownSecondsRemaining, setCooldownSecondsRemaining] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Mutable refs to prevent race conditions during async intervals & callbacks
  const statusRef = useRef<RuntimeStatus>(status);
  statusRef.current = status;

  const sessionRef = useRef<RiskSessionState>(session);
  sessionRef.current = session;

  const openContractRef = useRef<OpenPosition | null>(openContract);
  openContractRef.current = openContract;

  const isExecutingRef = useRef<boolean>(false);
  const deduplicatorRef = useRef<SignalDeduplicator>(new SignalDeduplicator());
  const scanLoopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeUnsubPOCRef = useRef<(() => void) | null>(null);

  // Helper: Append formatted event log
  const addLog = useCallback(
    (level: RuntimeEventLog['level'], message: string) => {
      const entry: RuntimeEventLog = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        timestamp: Date.now(),
        level,
        message,
      };
      setLogs((prev) => [entry, ...prev.slice(0, 199)]); // Keep last 200 logs
    },
    []
  );

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Reset session
  const resetSession = useCallback(() => {
    if (statusRef.current === 'running' || statusRef.current === 'paused') {
      toast.error('Stop the strategy before resetting the session statistics.');
      return;
    }
    setSession(initialRiskSessionState());
    setCurrentSignal(null);
    setOpenContract(null);
    setLastError(null);
    setStatus('idle');
    setPhase('idle');
    addLog('info', 'Session reset to initial baseline.');
  }, [addLog]);

  // Handle contract settlement
  const handleSettlement = useCallback(
    (
      contract: OpenPosition,
      signal: ScannerSignal,
      executedStake: number
    ) => {
      const { isWin, profit, payout } = settleTradeContract(contract);
      const now = Date.now();
      const cooldownSec = strategy.risk.cooldown || 2;

      const updatedSession = updateSessionAfterSettlement(
        sessionRef.current,
        { profit, isWin },
        now,
        cooldownSec
      );
      setSession(updatedSession);
      sessionRef.current = updatedSession;

      const record: TradeRecord = {
        id: `trade-${contract.contract_id}-${now}`,
        timestamp: now,
        symbol: signal.symbol,
        contractType: 'DIGITMATCH',
        digit: signal.digit,
        stake: executedStake,
        payout,
        profit,
        status: isWin ? 'won' : 'lost',
        contractId: contract.contract_id,
        heuristicScore: signal.heuristicScore,
        message: isWin
          ? `Won +${profit.toFixed(2)} USD`
          : `Lost ${profit.toFixed(2)} USD`,
      };

      setTradeHistory((prev) => [record, ...prev]);
      setOpenContract(null);
      openContractRef.current = null;
      isExecutingRef.current = false;

      addLog(
        isWin ? 'success' : 'warn',
        `Contract #${contract.contract_id} on ${signal.symbol} settled: ${isWin ? 'WON' : 'LOST'} (${profit >= 0 ? '+' : ''}${profit.toFixed(2)} USD)`
      );

      // Check risk limits on updated session
      const riskCheck = canExecuteTrade(strategy.risk, updatedSession, now);
      if (!riskCheck.allowed && riskCheck.limitReached) {
        setStatus('limit_reached');
        setPhase('halted');
        addLog('error', `Risk limit reached: ${riskCheck.reason}`);
        toast.info(`Strategy halted: ${riskCheck.reason}`);
        return;
      }

      // If user paused or stopped while in-flight
      if (statusRef.current === 'paused') {
        setPhase('halted');
        addLog('info', 'Open contract resolved. Strategy remains paused.');
        return;
      }

      if (statusRef.current === 'stopped') {
        setPhase('halted');
        addLog('info', 'Open contract resolved. Strategy remains stopped.');
        return;
      }

      // Enter cooldown phase
      setPhase('cooldown');
      setCooldownSecondsRemaining(cooldownSec);
      addLog('info', `Entering ${cooldownSec}s cooldown before scanning again...`);
    },
    [strategy.risk, addLog]
  );

  // Execute trade sequence: Validate → Proposal → Buy → Open Contract Tracking
  const executeTrade = useCallback(
    async (signal: ScannerSignal) => {
      if (
        !ws ||
        !isConnected ||
        !isAuthenticated ||
        statusRef.current !== 'running' ||
        isExecutingRef.current ||
        sessionRef.current.hasOpenContract
      ) {
        return;
      }

      isExecutingRef.current = true;
      setCurrentSignal(signal);
      setPhase('proposing');

      const stakeValidation = validateStake(strategy.trade.stake);
      const stakeAmount = stakeValidation.stake;

      addLog(
        'info',
        `Candidate signal accepted: ${signal.symbol} DIGITMATCH Digit ${signal.digit} (Score: ${signal.heuristicScore}/100, ${signal.agree}/${signal.eligible} agreed). Requesting proposal...`
      );

      let proposalId: string | null = null;
      let askPrice: number = stakeAmount;

      try {
        // Step 1: Request proposal
        const propResp = await ws.send<ProposalResponse>({
          proposal: 1,
          amount: stakeAmount,
          basis: 'stake',
          contract_type: 'DIGITMATCH',
          currency: activeAccount?.currency || 'USD',
          underlying_symbol: signal.symbol,
          duration: 1,
          duration_unit: 't',
          barrier: signal.digit,
        });

        if (!propResp.proposal?.id) {
          throw new Error('Deriv API proposal response did not include a valid proposal ID.');
        }

        proposalId = propResp.proposal.id;
        askPrice = propResp.proposal.ask_price;

        // Safety gate: Check if user stopped or paused while proposal was being retrieved
        if (statusRef.current !== 'running') {
          addLog('info', 'Strategy paused/stopped while proposal was in flight. Aborting buy.');
          isExecutingRef.current = false;
          setPhase(statusRef.current === 'paused' ? 'halted' : 'idle');
          return;
        }

        // Step 2: Buy contract
        setPhase('purchasing');
        addLog(
          'info',
          `Proposal received (${proposalId}). Submitting buy order for $${askPrice.toFixed(2)}...`
        );

        // Record execution in deduplicator immediately before sending buy to prevent duplicate requests
        deduplicatorRef.current.recordExecution(signal);

        const buyResp = await ws.send<BuyResponse>({
          buy: proposalId,
          price: String(askPrice),
        });

        if (!buyResp.buy?.contract_id) {
          throw new Error('Deriv API buy response did not return a valid contract_id.');
        }

        const contractId = buyResp.buy.contract_id;
        addLog(
          'success',
          `Order executed: Contract #${contractId} opened on ${signal.symbol} for digit ${signal.digit} (Payout: $${buyResp.buy.payout.toFixed(2)}).`
        );

        // Mark session as having an open contract
        setSession((prev) => ({ ...prev, hasOpenContract: true }));
        sessionRef.current = { ...sessionRef.current, hasOpenContract: true };
        setPhase('open_contract');

        // Step 3: Listen for contract updates and settlement
        // Clean up any lingering listener first
        if (activeUnsubPOCRef.current) {
          activeUnsubPOCRef.current();
          activeUnsubPOCRef.current = null;
        }

        let settled = false;

        const unsubscribe = ws.onMessage((data) => {
          if (data.msg_type !== 'proposal_open_contract') return;
          const contract = data.proposal_open_contract as OpenPosition | undefined;
          if (!contract || contract.contract_id !== contractId) return;

          setOpenContract(contract);
          openContractRef.current = contract;

          const isClosed =
            Boolean(contract.is_sold) ||
            Boolean(contract.is_expired) ||
            contract.status !== 'open';

          if (isClosed && !settled) {
            settled = true;
            if (activeUnsubPOCRef.current) {
              activeUnsubPOCRef.current();
              activeUnsubPOCRef.current = null;
            }
            handleSettlement(contract, signal, stakeAmount);
          }
        });

        activeUnsubPOCRef.current = unsubscribe;

        // Subscribe to open contract stream for this contract ID
        ws.send({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1 }).catch(
          () => {}
        );
      } catch (err) {
        // Safe error handling: NEVER blindly retry purchases!
        const errMsg = err instanceof Error ? err.message : String(err);
        setLastError(errMsg);
        addLog('error', `Trade execution failed: ${errMsg}. Order aborted without blind retry.`);
        toast.error(`Execution error: ${errMsg}`);

        isExecutingRef.current = false;
        setSession((prev) => ({ ...prev, hasOpenContract: false }));
        sessionRef.current = { ...sessionRef.current, hasOpenContract: false };

        const failedRecord: TradeRecord = {
          id: `trade-fail-${Date.now()}`,
          timestamp: Date.now(),
          symbol: signal.symbol,
          contractType: 'DIGITMATCH',
          digit: signal.digit,
          stake: stakeAmount,
          payout: 0,
          profit: 0,
          status: 'failed',
          proposalId: proposalId ?? undefined,
          heuristicScore: signal.heuristicScore,
          message: `Failed: ${errMsg}`,
        };
        setTradeHistory((prev) => [failedRecord, ...prev]);

        if (statusRef.current === 'running') {
          // Pause momentarily before re-scanning
          setPhase('cooldown');
          setCooldownSecondsRemaining(3);
        } else {
          setPhase('halted');
        }
      }
    },
    [
      ws,
      isConnected,
      isAuthenticated,
      strategy.trade.stake,
      activeAccount?.currency,
      addLog,
      handleSettlement,
    ]
  );

  // Scan single market history helper
  const fetchMarketHistory = useCallback(
    async (symbol: string, count: number) => {
      if (!ws || !isConnected) {
        throw new Error('WebSocket disconnected');
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
    [ws, isConnected]
  );

  // Continuous scanning round
  const runScanRound = useCallback(async () => {
    if (
      statusRef.current !== 'running' ||
      !ws ||
      !isConnected ||
      !isAuthenticated ||
      isExecutingRef.current ||
      sessionRef.current.hasOpenContract
    ) {
      return;
    }

    // Risk rule check before initiating scan
    const riskCheck = canExecuteTrade(strategy.risk, sessionRef.current);
    if (!riskCheck.allowed) {
      if (riskCheck.limitReached) {
        setStatus('limit_reached');
        setPhase('halted');
        addLog('warn', `Scanning halted: ${riskCheck.reason}`);
        toast.info(`Trading halted: ${riskCheck.reason}`);
        return;
      }
      // Cooldown in progress
      setPhase('cooldown');
      return;
    }

    setPhase('scanning');
    setIsScanning(true);

    try {
      const { markets: eligibleMarkets } = selectVolatilityMarkets(symbols);

      if (eligibleMarkets.length === 0) {
        return;
      }

      // Scan up to 8 continuous volatility markets with directionFilter='MATCHES'
      const marketsToScan = eligibleMarkets.slice(0, 8);
      const analyses = await scanMarkets(marketsToScan, fetchMarketHistory, {
        count: 300,
        minObservations: 150,
        concurrency: 3,
        directionFilter: 'MATCHES',
        minAgree: 1,
      });

      // Abort if runtime was stopped/paused while scanning
      if (statusRef.current !== 'running' || isExecutingRef.current) {
        return;
      }

      const ranking = rankMarkets(analyses);
      const candidateMarket = ranking.selected;

      if (!candidateMarket || candidateMarket.recommendation.direction !== 'MATCHES') {
        // No consensus matches signal in this round
        return;
      }

      const rawSignal = {
        id: `${candidateMarket.analysis.symbol}-${candidateMarket.recommendation.digit}-${Date.now()}`,
        symbol: candidateMarket.analysis.symbol,
        contractType: 'DIGITMATCH',
        digit: candidateMarket.recommendation.digit,
        direction: 'MATCHES',
        heuristicScore: candidateMarket.recommendation.heuristicScore,
        agree: candidateMarket.recommendation.agree,
        eligible: candidateMarket.recommendation.eligible,
        timestamp: Date.now(),
      };

      // 1. Validate signal integrity & freshness
      const validation = validateSignal(rawSignal, {
        maxAgeMs: DEFAULT_MAX_SIGNAL_AGE_MS,
      });

      if (!validation.valid || !validation.signal) {
        addLog('warn', `Signal validation failed: ${validation.error}`);
        return;
      }

      const validSignal = validation.signal;

      // 2. Prevent duplicate signals
      if (deduplicatorRef.current.isDuplicate(validSignal, DEFAULT_DUPLICATE_WINDOW_MS)) {
        // Skip silently or throttled log
        return;
      }

      // Signal passed all validations: Trigger trade execution
      await executeTrade(validSignal);
    } catch (err) {
      if (statusRef.current === 'running') {
        const msg = err instanceof Error ? err.message : String(err);
        addLog('warn', `Scanner observation round error: ${msg}`);
      }
    } finally {
      setIsScanning(false);
    }
  }, [
    ws,
    isConnected,
    isAuthenticated,
    symbols,
    strategy.risk,
    fetchMarketHistory,
    executeTrade,
    addLog,
  ]);

  // Main scan scheduling loop
  useEffect(() => {
    if (status !== 'running' || session.hasOpenContract) {
      if (scanLoopTimerRef.current) {
        clearTimeout(scanLoopTimerRef.current);
        scanLoopTimerRef.current = null;
      }
      return;
    }

    const intervalMs = 3000; // 3 seconds between scan cycles

    const scheduleNext = () => {
      scanLoopTimerRef.current = setTimeout(async () => {
        if (statusRef.current === 'running' && !sessionRef.current.hasOpenContract) {
          await runScanRound();
          if (statusRef.current === 'running' && !sessionRef.current.hasOpenContract) {
            scheduleNext();
          }
        }
      }, intervalMs);
    };

    // Run first round immediately
    runScanRound().then(() => {
      if (statusRef.current === 'running' && !sessionRef.current.hasOpenContract) {
        scheduleNext();
      }
    });

    return () => {
      if (scanLoopTimerRef.current) {
        clearTimeout(scanLoopTimerRef.current);
        scanLoopTimerRef.current = null;
      }
    };
  }, [status, session.hasOpenContract, runScanRound]);

  // Cooldown countdown tick effect
  useEffect(() => {
    if (phase !== 'cooldown' || cooldownSecondsRemaining <= 0) return;

    cooldownTimerRef.current = setInterval(() => {
      setCooldownSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (statusRef.current === 'running') {
            setPhase('scanning');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [phase, cooldownSecondsRemaining]);

  // Controls: RUN
  const run = useCallback(() => {
    if (!isConnected) {
      toast.error('Deriv WebSocket is disconnected. Please wait for reconnection.');
      addLog('error', 'Run command rejected: Deriv WebSocket is disconnected.');
      return;
    }

    if (!isAuthenticated) {
      toast.warning('Please log in with your Deriv account to run live trades.');
      addLog('warn', 'Run command rejected: User is not authenticated.');
      onAuthRequired?.();
      return;
    }

    if (strategy.conditions.length === 0) {
      toast.error('Cannot run strategy: Please add at least one condition block.');
      return;
    }

    // Check risk limits before starting
    const riskCheck = canExecuteTrade(strategy.risk, sessionRef.current);
    if (!riskCheck.allowed && riskCheck.limitReached) {
      toast.error(`Cannot start: ${riskCheck.reason}. Reset session to restart.`);
      return;
    }

    const transition = transitionRuntime(
      statusRef.current,
      { type: 'RUN', isConnected, isAuthenticated },
      Boolean(openContractRef.current)
    );

    if (transition.error) {
      toast.error(transition.error);
      return;
    }

    setStatus(transition.status);
    statusRef.current = transition.status;
    setPhase(transition.phase);
    setLastError(null);
    addLog('info', transition.policyNote || 'Strategy execution started.');
    toast.success('Strategy runtime started.');
  }, [isConnected, isAuthenticated, strategy.conditions, strategy.risk, onAuthRequired, addLog]);

  // Controls: PAUSE
  const pause = useCallback(() => {
    const transition = transitionRuntime(
      statusRef.current,
      { type: 'PAUSE' },
      Boolean(openContractRef.current)
    );

    if (transition.error) {
      toast.error(transition.error);
      return;
    }

    setStatus(transition.status);
    statusRef.current = transition.status;
    setPhase(transition.phase);
    addLog('info', transition.policyNote || 'Strategy paused.');
    toast.info('Strategy paused.');
  }, [addLog]);

  // Controls: STOP
  const stop = useCallback(() => {
    const transition = transitionRuntime(
      statusRef.current,
      { type: 'STOP' },
      Boolean(openContractRef.current)
    );

    setStatus(transition.status);
    statusRef.current = transition.status;
    setPhase(transition.phase);
    addLog('info', transition.policyNote || 'Strategy stopped.');
    toast.info('Strategy stopped.');
  }, [addLog]);

  // Handle WebSocket disconnection while running: pause scanning safely
  useEffect(() => {
    if (!isConnected && statusRef.current === 'running') {
      addLog('warn', 'Deriv WebSocket disconnected during live runtime. Halting scan.');
      setPhase('halted');
    } else if (isConnected && statusRef.current === 'running' && phase === 'halted') {
      addLog('info', 'Deriv WebSocket reconnected. Resuming scan cycle.');
      setPhase('scanning');
    }
  }, [isConnected, phase, addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanLoopTimerRef.current) clearTimeout(scanLoopTimerRef.current);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (activeUnsubPOCRef.current) activeUnsubPOCRef.current();
    };
  }, []);

  return {
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
  };
}
