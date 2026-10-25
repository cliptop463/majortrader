'use client';

import { useEffect } from 'react';
import StrategyStudioPage from '@/app/strategy-studio/page';

export default function StrategyStudioTemplatesPage() {
  useEffect(() => {
    window.location.href = '/strategy-studio';
  }, []);

  return <StrategyStudioPage />;
}

