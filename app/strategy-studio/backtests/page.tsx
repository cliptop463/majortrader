'use client';

import { useEffect } from 'react';
import StrategyStudioPage from '@/app/strategy-studio/page';

export default function StrategyStudioBacktestsPage() {
  useEffect(() => {
    window.location.href = '/strategy-studio';
  }, []);

  return <StrategyStudioPage />;
}

