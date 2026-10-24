'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Localize } from '@deriv-com/translations';
import { useDigitsTrading } from '../../hooks/use-digits-trading';
import { useDerivWSContext } from '@/components/custom/deriv-ws-provider';
import { useLogoSrc } from '@/components/custom/logo-src-provider';
import { Header } from '@/components/custom/header';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Footer } from '@/components/custom/footer';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { PositionsTable } from '@/components/custom/positions-table';

const DIGIT_CONTRACT_TYPES = [
  'DIGITMATCH',
  'DIGITDIFF',
  'DIGITOVER',
  'DIGITUNDER',
  'DIGITEVEN',
  'DIGITODD',
] as const;

function getDigitContractLabels(
  localize: (text: string) => string
): Record<string, string> {
  return {
    DIGITMATCH: localize('Digit Match'),
    DIGITDIFF: localize('Digit Differs'),
    DIGITOVER: localize('Digit Over'),
    DIGITUNDER: localize('Digit Under'),
    DIGITEVEN: localize('Digit Even'),
    DIGITODD: localize('Digit Odd'),
  };
}

export default function ReportsPage() {
  const logoSrc = useLogoSrc();
  const router = useRouter();
  const { localize } = useAppTranslations();
  const { ws, isConnected, isExhausted, auth } = useDerivWSContext();
  const { authState, accounts, activeAccount, login, signUp, logout, switchAccount } = auth;
  const trading = useDigitsTrading({ ws, isConnected, isExhausted, isAuthenticated: !!auth.wsUrl, onAuthWSFailed: logout });
  const digitContractLabels = getDigitContractLabels(localize);

  useEffect(() => {
    if (authState === 'unauthenticated' || authState === 'error') {
      router.replace('/');
    }
  }, [authState, router]);

  if (authState !== 'authenticated') {
    return (
      <main className="flex flex-col bg-background items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex flex-col bg-background max-lg:h-dvh max-lg:overflow-y-auto lg:min-h-dvh">
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

      <div className="flex-1 w-full max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-14">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center p-1 rounded-xl bg-muted/80 border border-border shadow-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
            >
              <span><Localize i18n_default_text="Trade" /></span>
            </Link>
            <Link
              href="/scanner"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span><Localize i18n_default_text="Digit Scanner" /></span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-background text-foreground shadow-sm">
              <span><Localize i18n_default_text="Positions & Reports" /></span>
            </span>
          </div>

          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <span className="text-base leading-none">←</span>
            <span>
              <Localize i18n_default_text="Back to trading" />
            </span>
          </Link>
        </div>
        <PositionsTable
          openPositions={trading.openPositions.filter(p =>
            (DIGIT_CONTRACT_TYPES as readonly string[]).includes(p.contract_type)
          )}
          closedPositions={trading.closedPositions.filter(p =>
            (DIGIT_CONTRACT_TYPES as readonly string[]).includes(p.contract_type)
          )}
          onSell={trading.sellContract}
          sellingId={trading.sellingId}
          sellError={trading.sellError}
          onClearSellError={trading.clearSellError}
          contractTypeLabels={digitContractLabels}
          className="mt-0"
        />
      </div>

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 py-2 text-center bg-background/80 backdrop-blur-sm">
        <Footer />
      </div>
    </main>
  );
}
