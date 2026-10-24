'use client';

import Link from 'next/link';
import { Localize } from '@deriv-com/translations';
import { useActiveSymbols } from '@deriv/core';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useLogoSrc } from '@/components/custom/logo-src-provider';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Footer } from '@/components/custom/footer';
import { Sparkles } from 'lucide-react';
import { DigitScannerPanel } from '@/components/digit-scanner-panel';

const SCANNER_CONTRACT_TYPES = ['DIGITMATCH', 'DIGITDIFF'];

export default function ScannerPage() {
  const logoSrc = useLogoSrc();
  const { ws, isConnected, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;

  const { symbols, isLoading: symbolsLoading } = useActiveSymbols(
    ws,
    isConnected,
    SCANNER_CONTRACT_TYPES
  );

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

      <div className="w-full flex-1">
        <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  <Localize i18n_default_text="Matches Digit Scanner" />
                </h1>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  <Localize i18n_default_text="Scan volatility markets for Matches signals & configure the buy page" />
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:w-auto"
            >
              <span className="text-base leading-none">←</span>
              <span>
                <Localize i18n_default_text="Back to trading" />
              </span>
            </Link>
          </div>

          <DigitScannerPanel
            ws={ws}
            isConnected={isConnected}
            symbols={symbols}
            symbolsLoading={symbolsLoading}
          />
        </div>
      </div>

      <div className="border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-4">
          <Footer />
        </div>
      </div>
    </main>
  );
}
