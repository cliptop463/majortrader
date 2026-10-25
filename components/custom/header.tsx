'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { FocusScope } from '@radix-ui/react-focus-scope';
import Link from 'next/link';
import { Blocks, FileText, LogOut, Menu, Sparkles, TrendingUp, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Localize } from '@deriv-com/translations';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { LANGUAGE_LOCALES } from '@/lib/i18n';
import { useAppTranslations } from '@/components/custom/i18n-provider';
import { LanguageSwitcher } from '@/components/custom/language-switcher';
import type { AuthState, DerivAccount } from '@deriv/core';

interface HeaderProps {
  authState: AuthState;
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  onLogin: () => Promise<void>;
  onLogout: () => void;
  onSwitchAccount: (accountId: string) => Promise<void>;
  /** When provided, a Sign up button is rendered to the right of the Log in button. */
  onSignUp?: () => Promise<void>;
  /** Logo source URL or data URL. When omitted, a placeholder badge is shown until
   *  the user provides a logo via the app builder (passed as a data URL via PREVIEW_BRANDING). */
  logoSrc?: string;
  /** App name used for the header text and the fallback logo letter when no logoSrc
   *  is provided. Prefers the live preview / Customise name, then
   *  NEXT_PUBLIC_DERIV_APP_NAME, then 'Deriv Trading'. */
  appName?: string;
  /**
   * When false, hide the name text next to the logo. Defaults to the
   * NEXT_PUBLIC_DERIV_SHOW_APP_NAME env var (true when unset).
   */
  showAppName?: boolean;
  /** Optional controls rendered to the left of the login/logout button (e.g. a theme toggle). */
  actions?: React.ReactNode;
}

function formatBalance(balance: string, locale: string): string {
  return Number(balance).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function AccountLabel({ type }: { type: 'demo' | 'real' }) {
  return (
    <span
      className={cn(
        'text-sm font-medium whitespace-nowrap truncate',
        type === 'demo' ? 'text-orange-500' : 'text-emerald-600'
      )}
    >
      {type === 'demo' ? (
        <Localize i18n_default_text="Demo account" />
      ) : (
        <Localize i18n_default_text="Real account" />
      )}
    </span>
  );
}

function resolveHeaderAppName(appName?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_DERIV_APP_NAME?.trim();
  return appName?.trim() || fromEnv || 'Deriv Trading';
}

function resolveShowAppName(showAppName?: boolean): boolean {
  if (typeof showAppName === 'boolean') return showAppName;
  return process.env.NEXT_PUBLIC_DERIV_SHOW_APP_NAME !== 'false';
}

function AuthButtons({
  isAuthenticated,
  isAuthenticating,
  onLogin,
  onLogout,
  onSignUp,
}: {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => void;
  onSignUp?: () => Promise<void>;
}) {
  if (isAuthenticated) {
    return (
      <Button variant="outline" size="sm" className="shrink-0" onClick={onLogout}>
        <Localize i18n_default_text="Log out" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onLogin} disabled={isAuthenticating}>
        {isAuthenticating ? (
          <Localize i18n_default_text="Logging in..." />
        ) : (
          <Localize i18n_default_text="Log in" />
        )}
      </Button>
      {onSignUp && (
        <Button size="sm" onClick={onSignUp} disabled={isAuthenticating}>
          <Localize i18n_default_text="Sign up" />
        </Button>
      )}
    </div>
  );
}

function preventDismissFromPopoverOrHeader(event: {
  preventDefault: () => void;
  target: EventTarget | null;
  detail?: { originalEvent?: Event };
}) {
  const node = event.detail?.originalEvent?.target ?? event.target;
  if (
    node instanceof Element &&
    node.closest('[data-radix-popper-content-wrapper], [data-radix-popover-content], header')
  ) {
    event.preventDefault();
  }
}

const APPEARANCE_OPTIONS = ['light', 'dark', 'system'] as const;

function AppearanceLabel({ value }: { value: (typeof APPEARANCE_OPTIONS)[number] }) {
  if (value === 'light') return <Localize i18n_default_text="Light" />;
  if (value === 'dark') return <Localize i18n_default_text="Dark" />;
  return <Localize i18n_default_text="System" />;
}

function AppearancePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = theme === 'light' || theme === 'dark' ? theme : 'system';

  const handleSelect = (value: (typeof APPEARANCE_OPTIONS)[number]) => {
    setTheme(value);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">
        <Localize i18n_default_text="Appearance" />
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative w-full h-11 font-semibold justify-start text-left gap-1.5 px-3"
          >
            <span className="text-xs font-semibold tracking-wide">
              <AppearanceLabel value={selected} />
            </span>
            <svg
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform absolute right-3',
                open && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="z-[100] w-[var(--radix-popover-trigger-width)] min-w-0 p-1"
        >
          <ul className="space-y-0.5">
            {APPEARANCE_OPTIONS.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors',
                    option === selected ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                  )}
                >
                  <AppearanceLabel value={option} />
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function MobileAuthButtons({
  isAuthenticated,
  isAuthenticating,
  onLogin,
  onLogout,
  onSignUp,
}: {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => void;
  onSignUp?: () => Promise<void>;
}) {
  const className = 'w-full h-11 font-semibold';

  if (isAuthenticated) {
    return (
      <Button variant="outline" className={className} onClick={onLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        <Localize i18n_default_text="Log out" />
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(className, 'bg-transparent hover:bg-transparent')}
        onClick={onLogin}
        disabled={isAuthenticating}
      >
        {isAuthenticating ? (
          <Localize i18n_default_text="Logging in..." />
        ) : (
          <Localize i18n_default_text="Log in" />
        )}
      </Button>
      {onSignUp && (
        <Button className={className} onClick={onSignUp} disabled={isAuthenticating}>
          <Localize i18n_default_text="Sign up" />
        </Button>
      )}
    </>
  );
}

export function Header({
  authState,
  accounts,
  activeAccount,
  onLogin,
  onLogout,
  onSwitchAccount,
  onSignUp,
  logoSrc,
  appName,
  showAppName,
  actions,
}: HeaderProps) {
  const { currentLang, localize } = useAppTranslations();
  const numberLocale = LANGUAGE_LOCALES[currentLang];
  const [logoError, setLogoError] = useState(false);
  const resolvedName = resolveHeaderAppName(appName);
  const shouldShowName = resolveShowAppName(showAppName);
  const logoLetter = resolvedName.charAt(0).toUpperCase() || 'D';
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [menuTop, setMenuTop] = useState(0);
  const isAuthenticated = authState === 'authenticated';
  const isAuthenticating = authState === 'authenticating';

  useLayoutEffect(() => {
    if (!mobileMenuOpen) return;
    const el = headerRef.current;
    const sync = () => {
      if (el) setMenuTop(el.getBoundingClientRect().bottom);
    };
    sync();
    window.addEventListener('resize', sync);
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)') : null;
    const closeIfLg = () => {
      if (mq?.matches) setMobileMenuOpen(false);
    };
    mq?.addEventListener('change', closeIfLg);
    return () => {
      window.removeEventListener('resize', sync);
      mq?.removeEventListener('change', closeIfLg);
    };
  }, [mobileMenuOpen]);

  const headerBar = (
    <header ref={headerRef} className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 shrink-0">
        {!logoSrc || logoError ? (
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {logoLetter}
          </div>
        ) : (
          <img
            src={logoSrc}
            alt={localize('App Logo')}
            className="h-8 w-auto object-contain"
            onError={() => setLogoError(true)}
          />
        )}
        {shouldShowName && (
          <h1 className="text-lg font-semibold text-foreground hidden sm:block">
            {resolvedName}
          </h1>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <LanguageSwitcher />
        </div>
        {isAuthenticated && activeAccount && (
          <Popover open={accountSwitcherOpen} onOpenChange={setAccountSwitcherOpen}>
            <PopoverTrigger asChild>
              <button className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-3 hover:bg-muted/50 transition-colors">
                <div className="min-w-0 text-left">
                  <AccountLabel type={activeAccount.account_type} />
                  <p className="text-base font-bold text-foreground whitespace-nowrap truncate">
                    {formatBalance(activeAccount.balance, numberLocale)} {activeAccount.currency}
                  </p>
                </div>
                <svg
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    accountSwitcherOpen && 'rotate-180'
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="z-[100] w-64 p-2">
              <div className="space-y-1">
                {accounts.map((account) => (
                  <button
                    key={account.account_id}
                    onClick={() => {
                      onSwitchAccount(account.account_id);
                      setAccountSwitcherOpen(false);
                    }}
                    className={cn(
                      'w-full text-left rounded-lg px-3 py-2.5 transition-colors',
                      account.account_id === activeAccount.account_id
                        ? 'bg-muted'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <AccountLabel type={account.account_type} />
                    <p className="text-base font-bold text-foreground">
                      {formatBalance(account.balance, numberLocale)} {account.currency}
                    </p>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <AuthButtons
            isAuthenticated={isAuthenticated}
            isAuthenticating={isAuthenticating}
            onLogin={onLogin}
            onLogout={onLogout}
            onSignUp={onSignUp}
          />
        </div>
        <DialogPrimitive.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={localize('Menu')}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </DialogPrimitive.Trigger>
      </div>
    </header>
  );

  return (
    <DialogPrimitive.Root modal={false} open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      {headerBar}
      <DialogPrimitive.Portal>
        <FocusScope loop trapped={mobileMenuOpen}>
          <DialogPrimitive.Content
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-[100] flex flex-col w-full max-w-sm bg-background border-l border-border shadow-2xl outline-none"
            onPointerDownOutside={preventDismissFromPopoverOrHeader}
            onInteractOutside={preventDismissFromPopoverOrHeader}
            onFocusOutside={preventDismissFromPopoverOrHeader}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-2.5">
                {!logoSrc || logoError ? (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {logoLetter}
                  </div>
                ) : (
                  <img src={logoSrc} alt="Logo" className="h-7 w-auto object-contain" />
                )}
                <div>
                  <p className="font-bold text-foreground text-sm leading-tight">{resolvedName}</p>
                  <p className="text-[11px] text-muted-foreground"><Localize i18n_default_text="Digits Trading & Scanner" /></p>
                </div>
              </div>
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              <div className="space-y-2.5 text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Localize i18n_default_text="Features & Routes" />
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/70 transition-colors shadow-2xs group"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground"><Localize i18n_default_text="Trade Console" /></p>
                        <span className="text-xs text-muted-foreground group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate"><Localize i18n_default_text="Live digits trading & stats" /></p>
                    </div>
                  </Link>

                  <Link
                    href="/scanner"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors shadow-2xs group"
                  >
                    <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-foreground"><Localize i18n_default_text="Digit Scanner" /></p>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary text-primary-foreground uppercase tracking-wider">New</span>
                        </div>
                        <span className="text-xs text-primary font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate"><Localize i18n_default_text="8 heuristic statistical strategies" /></p>
                    </div>
                  </Link>

                  <Link
                    href="/strategy-studio"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/70 transition-colors shadow-2xs group"
                  >
                    <div className="p-2 rounded-lg bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Blocks className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground"><Localize i18n_default_text="Strategy Studio" /></p>
                        <span className="text-xs text-muted-foreground group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate"><Localize i18n_default_text="Visual bot builder & strategy automation" /></p>
                    </div>
                  </Link>

                  <Link
                    href="/reports"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/70 transition-colors shadow-2xs group"
                  >
                    <div className="p-2 rounded-lg bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground"><Localize i18n_default_text="Positions & Reports" /></p>
                        <span className="text-xs text-muted-foreground group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate"><Localize i18n_default_text="Open contracts & trade history" /></p>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-1.5 text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Localize i18n_default_text="Appearance" />
                  </p>
                  <AppearancePicker />
                </div>

                <div className="space-y-1.5 text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Localize i18n_default_text="Language" />
                  </p>
                  <LanguageSwitcher className="w-full h-10 font-semibold" />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-border bg-muted/20">
              <MobileAuthButtons
                isAuthenticated={isAuthenticated}
                isAuthenticating={isAuthenticating}
                onLogin={onLogin}
                onLogout={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                onSignUp={onSignUp}
              />
            </div>
          </DialogPrimitive.Content>
        </FocusScope>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
