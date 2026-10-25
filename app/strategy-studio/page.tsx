'use client';

import { useEffect, useMemo, useState } from 'react';
import { Blocks, Download, Plus, Sparkles, UploadCloud } from 'lucide-react';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useLogoSrc } from '@/components/custom/logo-src-provider';
import { BuilderLayout } from '@/components/strategy-studio/BuilderLayout';
import { BotManager } from '@/components/strategy-studio/BotManager';
import { ImportXmlModal } from '@/components/strategy-studio/ImportXmlModal';
import { ExportXmlButton } from '@/components/strategy-studio/ExportXmlButton';
import { RuntimeControls } from '@/components/strategy-studio/RuntimeControls';
import { BacktestPanel } from '@/components/strategy-studio/BacktestPanel';
import { getStrategyTemplates } from '@/lib/strategy/templates';
import { parseStrategyXml } from '@/lib/strategy/xml/parser';
import { loadStrategies, saveStrategies } from '@/lib/storage/strategyStore';
import type { Strategy } from '@/lib/strategy/types';

const createNewStrategy = (name: string): Strategy => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name,
  market: 'VOL100IDX',
  contractType: 'DIGITDIFF',
  trade: {
    stake: 1,
    duration: 1,
    durationUnit: 'ticks',
  },
  conditions: [
    { id: 'if-1', type: 'IF', label: 'IF', description: 'Digit 7 frequency exceeds threshold' },
    { id: 'trig-1', type: 'Scanner Trigger', label: 'Scanner Trigger', description: 'Evening volatility spike' },
    { id: 'buy-1', type: 'BUY', label: 'BUY', description: 'Place contract order' },
  ],
  risk: {
    stopLoss: 5,
    takeProfit: 12,
    maxTrades: 6,
    dailyLossLimit: 25,
    cooldown: 2,
    martingale: false,
    antiMartingale: false,
    fixedStake: true,
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

export default function StrategyStudioPage() {
  const logoSrc = useLogoSrc();
  const { auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    const stored = loadStrategies();
    setStrategies(stored);
    setSelectedStrategy(stored[0] ?? createNewStrategy('Digit Hunter'));
  }, []);

  const templateOptions = useMemo(() => getStrategyTemplates(), []);

  const updateSelectedStrategy = (updater: (strategy: Strategy) => Strategy) => {
    setSelectedStrategy((current) => {
      if (!current) return current;
      const next = updater(current);
      setStrategies((previous) => {
        const existingIndex = previous.findIndex((item) => item.id === next.id);
        if (existingIndex >= 0) {
          const patched = [...previous];
          patched[existingIndex] = next;
          saveStrategies(patched);
          return patched;
        }
        const nextList = [next, ...previous];
        saveStrategies(nextList);
        return nextList;
      });
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedStrategy) return;
    const next = {
      ...selectedStrategy,
      metadata: {
        ...selectedStrategy.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    setSelectedStrategy(next);
    setStrategies((previous) => {
      const existingIndex = previous.findIndex((item) => item.id === next.id);
      const nextList = existingIndex >= 0 ? [...previous] : [next, ...previous];
      if (existingIndex >= 0) nextList[existingIndex] = next;
      saveStrategies(nextList);
      return nextList;
    });
  };

  const handleCreateStrategy = (template?: Strategy) => {
    const next = template ? { ...template, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` } : createNewStrategy(`Strategy ${strategies.length + 1}`);
    setStrategies((previous) => {
      const nextList = [next, ...previous];
      saveStrategies(nextList);
      return nextList;
    });
    setSelectedStrategy(next);
  };

  const handleImportXml = (xml: string) => {
    const parsed = parseStrategyXml(xml);
    if (!parsed) return;
    setStrategies((previous) => {
      const nextList = [parsed, ...previous.filter((item) => item.id !== parsed.id)];
      saveStrategies(nextList);
      return nextList;
    });
    setSelectedStrategy(parsed);
    setIsImportOpen(false);
  };

  const handleDeleteStrategy = (id: string) => {
    const filtered = strategies.filter((item) => item.id !== id);
    setStrategies(filtered);
    saveStrategies(filtered);
    if (selectedStrategy?.id === id) {
      setSelectedStrategy(filtered[0] ?? null);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      <Header
        authState={authState}
        accounts={accounts}
        activeAccount={activeAccount}
        onLogin={login}
        onSignUp={signUp}
        onLogout={logout}
        onSwitchAccount={switchAccount}
        logoSrc={logoSrc}
        actions={<ThemeToggle />}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Blocks className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Strategy Studio</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Visual strategy builder</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCreateStrategy()}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                New Strategy
              </button>
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <UploadCloud className="h-4 w-4" />
                Import XML
              </button>
              {selectedStrategy && <ExportXmlButton strategy={selectedStrategy} />}
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_2.5fr_1.1fr]">
          <BotManager
            strategies={strategies}
            selectedStrategyId={selectedStrategy?.id ?? null}
            onSelect={setSelectedStrategy}
            onCreate={handleCreateStrategy}
            onDelete={handleDeleteStrategy}
            templateOptions={templateOptions}
          />

          <BuilderLayout
            strategy={selectedStrategy ?? createNewStrategy('Strategy Draft')}
            onStrategyChange={(next) => {
              setSelectedStrategy(next);
              setStrategies((previous) => {
                const existingIndex = previous.findIndex((item) => item.id === next.id);
                const nextList = existingIndex >= 0 ? [...previous] : [next, ...previous];
                if (existingIndex >= 0) nextList[existingIndex] = next;
                saveStrategies(nextList);
                return nextList;
              });
            }}
          />

          <div className="space-y-6">
            <RuntimeControls strategy={selectedStrategy ?? createNewStrategy('Strategy Draft')} />
            <BacktestPanel strategy={selectedStrategy ?? createNewStrategy('Strategy Draft')} />
          </div>
        </div>
      </div>

      <ImportXmlModal open={isImportOpen} onOpenChange={setIsImportOpen} onImport={handleImportXml} />
    </main>
  );
}

