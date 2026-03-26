/**
 * volt_get_spend — Spending summary by provider and model.
 *
 * Returns total spend, call count, and token usage for today/7d/30d,
 * broken down by provider and model.
 */

import { z } from 'zod';
import type { SpendSummary } from '@volthq/core';
import type { SpendTracker } from '../spend-tracker.js';

export const getSpendSchema = z.object({
  time_range: z
    .enum(['today', '7d', '30d'])
    .default('today')
    .describe('Time range for the summary: today, 7d (7 days), or 30d (30 days)'),
});

export type GetSpendInput = z.infer<typeof getSpendSchema>;

export function handleGetSpend(input: GetSpendInput, tracker: SpendTracker) {
  const summary = tracker.getSummary(input.time_range);

  if (summary.totalCalls === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `No inference calls recorded for ${input.time_range}. Spend data is collected as you use AI providers.`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: formatSpendSummary(summary),
      },
    ],
  };
}

function formatSpendSummary(s: SpendSummary): string {
  const lines: string[] = [
    `Spend Summary (${s.timeRange})`,
    '─'.repeat(60),
    `Total spend: $${s.totalSpend.toFixed(2)}`,
    `Total calls: ${s.totalCalls}`,
    `Avg cost/call: $${s.averageCostPerCall.toFixed(4)}`,
    `Tokens: ${s.totalTokensInput.toLocaleString()} input / ${s.totalTokensOutput.toLocaleString()} output`,
  ];

  const providerEntries = Object.entries(s.byProvider).sort((a, b) => b[1] - a[1]);
  if (providerEntries.length > 0) {
    lines.push('', 'By Provider:');
    for (const [provider, cost] of providerEntries) {
      const pct = s.totalSpend > 0 ? Math.round((cost / s.totalSpend) * 100) : 0;
      lines.push(`  ${provider}: $${cost.toFixed(2)} (${pct}%)`);
    }
  }

  const modelEntries = Object.entries(s.byModel).sort((a, b) => b[1] - a[1]);
  if (modelEntries.length > 0) {
    lines.push('', 'By Model:');
    for (const [model, cost] of modelEntries) {
      const pct = s.totalSpend > 0 ? Math.round((cost / s.totalSpend) * 100) : 0;
      lines.push(`  ${model}: $${cost.toFixed(2)} (${pct}%)`);
    }
  }

  return lines.join('\n');
}
