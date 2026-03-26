/**
 * Volt HQ — Spend Tracker
 *
 * In-memory store for inference call spend records.
 * Computes SpendSummary and SavingsReport on demand.
 * No persistence — resets when the MCP server restarts.
 */

import type {
  SpendRecord,
  SpendSummary,
  SavingsReport,
  BudgetAlert,
  BudgetAlertTriggered,
  Offering,
} from '@volthq/core';
import { generateRecommendation, DEFAULT_ROUTING_PROFILE } from '@volthq/core';
import type { FeedCache } from './feed-cache.js';

export class SpendTracker {
  private records: SpendRecord[] = [];
  private alerts: BudgetAlert[] = [];
  private feedCache: FeedCache;

  constructor(feedCache: FeedCache) {
    this.feedCache = feedCache;
  }

  /** Record a new inference call. */
  record(entry: SpendRecord): BudgetAlertTriggered[] {
    this.records.push(entry);
    return this.checkAlerts();
  }

  /** Get all records (for testing/debugging). */
  getRecords(): SpendRecord[] {
    return this.records;
  }

  /** Compute a spending summary for a time range. */
  getSummary(range: 'today' | '7d' | '30d'): SpendSummary {
    const cutoff = this.cutoffForRange(range);
    const filtered = this.records.filter(r => new Date(r.timestamp).getTime() >= cutoff);

    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalSpend = 0;
    let totalTokensInput = 0;
    let totalTokensOutput = 0;

    for (const r of filtered) {
      totalSpend += r.cost;
      totalTokensInput += r.tokensInput;
      totalTokensOutput += r.tokensOutput;
      byProvider[r.providerId] = (byProvider[r.providerId] ?? 0) + r.cost;
      byModel[r.model] = (byModel[r.model] ?? 0) + r.cost;
    }

    return {
      timeRange: range,
      totalSpend: round(totalSpend),
      totalCalls: filtered.length,
      totalTokensInput,
      totalTokensOutput,
      byProvider: roundValues(byProvider),
      byModel: roundValues(byModel),
      averageCostPerCall: filtered.length > 0 ? round(totalSpend / filtered.length) : 0,
    };
  }

  /** Compare actual spend vs what the agent would have spent following recommendations. */
  getSavingsReport(range: 'today' | '7d' | '30d'): SavingsReport {
    const cutoff = this.cutoffForRange(range);
    const filtered = this.records.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    const offerings = this.feedCache.getOfferings();

    let actualSpend = 0;
    let optimalSpend = 0;

    for (const r of filtered) {
      actualSpend += r.cost;

      // Find what the cheapest option would have been for this model
      const cheapest = this.findCheapestOffering(r.model, offerings);
      if (cheapest) {
        const cheapestCost =
          (r.tokensInput / 1_000_000) * cheapest.priceInputPerMillion +
          (r.tokensOutput / 1_000_000) * cheapest.priceOutputPerMillion;
        optimalSpend += cheapestCost;
      } else {
        // No alternative found — assume actual cost was optimal
        optimalSpend += r.cost;
      }
    }

    const totalSavingsPossible = actualSpend - optimalSpend;
    // savingsAchieved: calls where the agent used the cheapest option
    // savingsMissed: calls where a cheaper option existed
    let savingsAchieved = 0;
    let savingsMissed = 0;

    for (const r of filtered) {
      const cheapest = this.findCheapestOffering(r.model, offerings);
      if (!cheapest) continue;

      const cheapestCost =
        (r.tokensInput / 1_000_000) * cheapest.priceInputPerMillion +
        (r.tokensOutput / 1_000_000) * cheapest.priceOutputPerMillion;
      const diff = r.cost - cheapestCost;

      if (r.providerId === cheapest.providerId) {
        savingsAchieved += diff > 0 ? diff : 0;
      } else if (diff > 0) {
        savingsMissed += diff;
      }
    }

    const savingsPercent = actualSpend > 0
      ? round((totalSavingsPossible / actualSpend) * 100)
      : 0;

    return {
      timeRange: range,
      actualSpend: round(actualSpend),
      optimalSpend: round(optimalSpend),
      savingsAchieved: round(savingsAchieved),
      savingsMissed: round(savingsMissed),
      savingsPercent,
    };
  }

  // ── Budget Alerts ────────────────────────────────────

  /** Set or update a budget alert. Returns the alert ID. */
  setAlert(threshold: number, period: 'daily' | 'weekly' | 'monthly'): BudgetAlert {
    // Check if an alert for this period already exists
    const existing = this.alerts.find(a => a.period === period);
    if (existing) {
      existing.threshold = threshold;
      existing.enabled = true;
      return existing;
    }

    const alert: BudgetAlert = {
      id: `alert-${period}`,
      threshold,
      period,
      enabled: true,
    };
    this.alerts.push(alert);
    return alert;
  }

  /** Get all configured alerts. */
  getAlerts(): BudgetAlert[] {
    return this.alerts;
  }

  /** Check all alerts against current spend. */
  checkAlerts(): BudgetAlertTriggered[] {
    const triggered: BudgetAlertTriggered[] = [];

    for (const alert of this.alerts) {
      if (!alert.enabled) continue;

      const range = periodToRange(alert.period);
      const summary = this.getSummary(range);

      if (summary.totalSpend >= alert.threshold) {
        const percent = round((summary.totalSpend / alert.threshold) * 100);
        triggered.push({
          alert,
          currentSpend: summary.totalSpend,
          percentOfBudget: percent,
          message: `Budget alert: ${alert.period} spend $${summary.totalSpend.toFixed(2)} has reached ${percent}% of $${alert.threshold.toFixed(2)} threshold.`,
        });
      }
    }

    return triggered;
  }

  // ── Private helpers ──────────────────────────────────

  private cutoffForRange(range: 'today' | '7d' | '30d'): number {
    const now = Date.now();
    switch (range) {
      case 'today': {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }
      case '7d':
        return now - 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return now - 30 * 24 * 60 * 60 * 1000;
    }
  }

  private findCheapestOffering(model: string, offerings: Offering[]): Offering | null {
    const query = model.toLowerCase();
    const matches = offerings.filter(o =>
      o.model.toLowerCase().includes(query) ||
      o.modelShort.toLowerCase().includes(query)
    );

    if (matches.length === 0) return null;

    let cheapest = matches[0]!;
    for (const o of matches) {
      const priceA = (cheapest.priceInputPerMillion + cheapest.priceOutputPerMillion) / 2;
      const priceB = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
      if (priceB < priceA) cheapest = o;
    }

    return cheapest;
  }
}

function periodToRange(period: 'daily' | 'weekly' | 'monthly'): 'today' | '7d' | '30d' {
  switch (period) {
    case 'daily': return 'today';
    case 'weekly': return '7d';
    case 'monthly': return '30d';
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundValues(record: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(record)) {
    result[key] = round(val);
  }
  return result;
}
