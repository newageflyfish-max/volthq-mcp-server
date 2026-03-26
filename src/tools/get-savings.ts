/**
 * volt_get_savings — Actual vs optimized spend comparison.
 *
 * Compares what the agent actually spent against what it would have spent
 * following Volt routing recommendations. Shows savings achieved and missed.
 */

import { z } from 'zod';
import type { SavingsReport } from '@volthq/core';
import type { SpendTracker } from '../spend-tracker.js';

export const getSavingsSchema = z.object({
  time_range: z
    .enum(['today', '7d', '30d'])
    .default('7d')
    .describe('Time range for the report: today, 7d (7 days), or 30d (30 days)'),
});

export type GetSavingsInput = z.infer<typeof getSavingsSchema>;

export function handleGetSavings(input: GetSavingsInput, tracker: SpendTracker) {
  const report = tracker.getSavingsReport(input.time_range);

  if (report.actualSpend === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `No spend data for ${input.time_range}. Record inference calls to see savings opportunities.`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: formatSavingsReport(report),
      },
    ],
  };
}

function formatSavingsReport(r: SavingsReport): string {
  const lines: string[] = [
    `Savings Report (${r.timeRange})`,
    '─'.repeat(60),
    `Actual spend:    $${r.actualSpend.toFixed(2)}`,
    `Optimal spend:   $${r.optimalSpend.toFixed(2)}`,
    `Potential savings: ${r.savingsPercent}%`,
    '',
    `Savings achieved (followed recommendations): $${r.savingsAchieved.toFixed(2)}`,
    `Savings missed (ignored recommendations):    $${r.savingsMissed.toFixed(2)}`,
  ];

  if (r.savingsMissed > 0) {
    lines.push(
      '',
      `You could save $${r.savingsMissed.toFixed(2)} by following Volt routing recommendations.`,
    );
  } else if (r.savingsPercent === 0) {
    lines.push('', 'You are already using the most cost-effective providers.');
  }

  return lines.join('\n');
}
