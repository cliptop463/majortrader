import type { Strategy } from '../types';

export function parseStrategyXml(xml: string): Strategy | null {
  try {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const parserError = document.querySelector('parsererror');

    if (parserError) {
      return null;
    }

    const root = document.documentElement;
    const strategyName = root.getAttribute('name') || root.getAttribute('strategyName') || 'Imported Strategy';
    const market = root.getAttribute('market') || 'VOL100IDX';
    const contractType = root.getAttribute('contractType') || 'DIGITDIFF';
    const stake = Number(root.getAttribute('stake') || '1');
    const duration = Number(root.getAttribute('duration') || '1');

    const conditionNodes = Array.from(root.querySelectorAll('block, condition, trigger')).map((node, index) => ({
      id: `${node.tagName.toLowerCase()}-${index}`,
      type: (node.getAttribute('type') || node.getAttribute('name') || 'IF') as Strategy['conditions'][number]['type'],
      label: node.getAttribute('label') || node.getAttribute('name') || 'Condition',
      description: node.getAttribute('description') || 'Imported strategy block',
      value: node.getAttribute('value') || undefined,
    }));

    return {
      id: `xml-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: strategyName,
      market,
      contractType,
      trade: {
        stake: Number.isFinite(stake) ? stake : 1,
        duration: Number.isFinite(duration) ? duration : 1,
        durationUnit: 'ticks',
      },
      conditions: conditionNodes.length > 0 ? conditionNodes : [{ id: 'imported-1', type: 'IF', label: 'IF', description: 'Imported strategy block' }],
      risk: {
        stopLoss: 5,
        takeProfit: 12,
        maxTrades: 5,
        dailyLossLimit: 25,
        cooldown: 2,
        martingale: false,
        antiMartingale: false,
        fixedStake: true,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  } catch {
    return null;
  }
}

