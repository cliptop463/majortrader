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
    <main className="flex flex-col bg-background min-h-dvh">
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

      <div className="flex-1 w-full max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-16">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                <Localize i18n_default_text="Matches Digit Scanner" />
              </h1>
              <p className="text-xs text-muted-foreground">
                <Localize i18n_default_text="Scan volatility markets for Matches signals & configure the buy page" />
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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

      <div className="py-3 text-center bg-background/80 backdrop-blur-sm border-t border-border mt-auto">
        <Footer />
      </div>
    </main>
  );
}
