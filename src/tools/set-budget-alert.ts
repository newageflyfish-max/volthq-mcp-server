/**
 * volt_set_budget_alert — Configure a spend threshold with alerts.
 *
 * Sets a budget limit for a daily/weekly/monthly period.
 * When spend exceeds the threshold, the alert fires.
 */

import { z } from 'zod';
import type { BudgetAlert } from '@volthq/core';
import type { SpendTracker } from '../spend-tracker.js';

export const setBudgetAlertSchema = z.object({
  threshold: z
    .number()
    .positive()
    .describe('Budget threshold in USD (e.g. 10.00 for $10)'),
  period: z
    .enum(['daily', 'weekly', 'monthly'])
    .describe('Budget period: daily, weekly, or monthly'),
});

export type SetBudgetAlertInput = z.infer<typeof setBudgetAlertSchema>;

export function handleSetBudgetAlert(input: SetBudgetAlertInput, tracker: SpendTracker) {
  const alert = tracker.setAlert(input.threshold, input.period);
  const allAlerts = tracker.getAlerts();
  const triggered = tracker.checkAlerts();

  const lines: string[] = [
    `Budget alert configured`,
    '─'.repeat(60),
    `Period: ${alert.period}`,
    `Threshold: $${alert.threshold.toFixed(2)}`,
    `Status: ${alert.enabled ? 'enabled' : 'disabled'}`,
  ];

  if (triggered.length > 0) {
    lines.push('', 'Active alerts:');
    for (const t of triggered) {
      lines.push(`  ${t.message}`);
    }
  }

  if (allAlerts.length > 1) {
    lines.push('', 'All configured alerts:');
    for (const a of allAlerts) {
      lines.push(`  ${a.period}: $${a.threshold.toFixed(2)} (${a.enabled ? 'on' : 'off'})`);
    }
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: lines.join('\n'),
      },
    ],
  };
}
