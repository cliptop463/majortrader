'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportStrategyToXml } from '@/lib/strategy/xml/exporter';
import type { Strategy } from '@/lib/strategy/types';

interface ExportXmlButtonProps {
  strategy: Strategy;
}

export function ExportXmlButton({ strategy }: ExportXmlButtonProps) {
  const handleExport = () => {
    const xml = exportStrategyToXml(strategy);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${strategy.name.toLowerCase().replace(/\s+/g, '-') || 'strategy'}.xml`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export To DBot XML
    </Button>
  );
}

