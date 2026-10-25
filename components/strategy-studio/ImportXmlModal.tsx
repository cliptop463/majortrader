'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseStrategyXml } from '@/lib/strategy/xml/parser';

interface ImportXmlModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onImport: (xml: string) => void;
}

export function ImportXmlModal({ open, onOpenChange, onImport }: ImportXmlModalProps) {
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseStrategyXml(text);
    if (!parsed) {
      setError('This XML file is not a valid strategy export.');
      return;
    }
    onImport(text);
    setError(null);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Import</p>
            <h3 className="text-xl font-semibold text-foreground">DBot XML</h3>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-md border border-border p-2 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/40 px-4 py-10 text-center text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
          <span className="mb-2 text-base font-medium text-foreground">Select .xml strategy file</span>
          <span>Uploads are converted to Strategy JSON automatically.</span>
          <input type="file" accept=".xml" className="hidden" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
        </label>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

