import type { Strategy } from '../types';

export function exportStrategyToXml(strategy: Strategy): string {
  const conditionsXml = strategy.conditions
    .map(
      (condition) =>
        `  <block type="${condition.type}" label="${escapeXml(condition.label)}" description="${escapeXml(condition.description ?? '')}" />`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<strategy name="${escapeXml(strategy.name)}" market="${escapeXml(strategy.market)}" contractType="${escapeXml(strategy.contractType)}" stake="${strategy.trade.stake}" duration="${strategy.trade.duration}">
${conditionsXml}
</strategy>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

