'use client';

import { Blocks, Cpu, Gauge, TrendingUp } from 'lucide-react';

const toolboxGroups = [
  {
    label: 'Digit',
    items: ['Digit Equals', 'Digit Over', 'Digit Under', 'Even', 'Odd'],
    icon: Cpu,
  },
  {
    label: 'Trend',
    items: ['Trend Up', 'Trend Down', 'Frequency', 'Scanner Trigger', 'Signal Trigger'],
    icon: TrendingUp,
  },
  {
    label: 'Risk',
    items: ['Stop Loss', 'Take Profit', 'Martingale', 'Cooldown', 'Max Trades'],
    icon: Gauge,
  },
  {
    label: 'Actions',
    items: ['IF', 'AND', 'OR', 'BUY', 'SELL', 'WAIT'],
    icon: Blocks,
  },
];

interface ToolboxProps {
  onDropBlock: (blockType: string) => void;
}

export function Toolbox({ onDropBlock }: ToolboxProps) {
  return (
    <aside className="border-r border-border bg-muted/20 p-3">
      <div className="space-y-4">
        {toolboxGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <div className="flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <group.icon className="h-3.5 w-3.5" />
              {group.label}
            </div>
            <div className="space-y-2">
              {group.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', item);
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => onDropBlock(item)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <span>{item}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">+</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

