export function validateStrategy(strategy: { name?: string; market?: string; trade?: { stake?: number; duration?: number }; conditions?: unknown[] }) {
  const errors: string[] = [];

  if (!strategy.name || !strategy.name.trim()) {
    errors.push('Strategy name is required.');
  }

  if (!strategy.market || !strategy.market.trim()) {
    errors.push('Strategy market is required.');
  }

  if ((strategy.trade?.stake ?? 0) <= 0) {
    errors.push('Trade stake must be greater than zero.');
  }

  if ((strategy.trade?.duration ?? 0) <= 0) {
    errors.push('Trade duration must be greater than zero.');
  }

  if (!Array.isArray(strategy.conditions) || strategy.conditions.length === 0) {
    errors.push('At least one strategy block must be configured.');
  }

  return errors;
}

