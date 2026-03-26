#!/usr/bin/env node

/**
 * Volt HQ — MCP Server
 *
 * The compute price oracle for AI agents.
 * Exposes pricing comparison and routing recommendations via MCP tools.
 *
 * Design principles:
 *   - Fail-open: never degrades agent inference
 *   - Zero-config first run: install, see value, no account needed
 *   - Advisory first: we recommend, the agent decides
 *
 * Usage:
 *   npx volthq-mcp-server          — start the MCP server (stdio transport)
 *   npx volthq-mcp-server --setup  — auto-configure Cursor and Claude Desktop
 */

import { runSetup } from './setup.js';

// ── Handle --setup flag before importing MCP SDK ──────
// (MCP SDK immediately binds to stdio, so we must exit before that)
if (process.argv.includes('--setup')) {
  runSetup();
  process.exit(0);
}

// ── MCP Server ────────────────────────────────────────
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { FeedCache } from './feed-cache.js';
import { SpendTracker } from './spend-tracker.js';
import { checkPriceSchema, handleCheckPrice } from './tools/check-price.js';
import { recommendRouteSchema, handleRecommendRoute } from './tools/recommend-route.js';
import { reportObservation } from './observer.js';
import { getSpendSchema, handleGetSpend } from './tools/get-spend.js';
import { getSavingsSchema, handleGetSavings } from './tools/get-savings.js';
import { setBudgetAlertSchema, handleSetBudgetAlert } from './tools/set-budget-alert.js';
import { checkForUpdate } from './version-check.js';

const feedCache = new FeedCache();
const spendTracker = new SpendTracker(feedCache);

// Fire-and-forget version check — do not await, do not block startup
checkForUpdate();

const server = new McpServer({
  name: 'volthq',
  version: '0.1.0',
});

let firstCallFired = false;

type ToolResult = { content: Array<{ type: 'text'; text: string }> };

function buildFirstRunMessage(queriedModel?: string): string | null {
  const offerings = feedCache.getOfferings();
  if (offerings.length === 0) return null;

  const providerCount = new Set(offerings.map((o) => o.providerId)).size;
  const offeringCount = offerings.length;
  const header = `⚡ Volt HQ — tracking ${offeringCount} offerings across ${providerCount} providers in real time.`;
  const divider = `\nRun volt_recommend_route to get a recommendation based on your quality and latency needs.\n─────────────────────────────────────────────────────────`;

  if (queriedModel) {
    const q = queriedModel.toLowerCase();
    const matches = offerings.filter(
      (o) => o.modelShort.toLowerCase().includes(q) || o.model.toLowerCase().includes(q),
    );

    if (matches.length >= 2) {
      const groups = new Map<string, typeof matches>();
      for (const o of matches) {
        const key = o.modelShort;
        const list = groups.get(key) ?? [];
        list.push(o);
        groups.set(key, list);
      }

      let bestGroup: typeof matches = [];
      let bestSpread = 0;

      for (const [, group] of groups) {
        if (group.length < 2) continue;
        const sorted = [...group].sort(
          (a, b) =>
            (a.priceInputPerMillion + a.priceOutputPerMillion) / 2 -
            (b.priceInputPerMillion + b.priceOutputPerMillion) / 2,
        );
        const first = sorted[0]!;
        const last = sorted[sorted.length - 1]!;
        const cheapAvg = (first.priceInputPerMillion + first.priceOutputPerMillion) / 2;
        const expAvg = (last.priceInputPerMillion + last.priceOutputPerMillion) / 2;
        const spread = cheapAvg > 0 ? expAvg / cheapAvg : 0;
        if (spread > bestSpread) {
          bestSpread = spread;
          bestGroup = sorted;
        }
      }

      // Filter outliers: remove offerings where avg price is >10x the median
      if (bestGroup.length >= 3) {
        const midIdx = Math.floor(bestGroup.length / 2);
        const medianAvg = (bestGroup[midIdx]!.priceInputPerMillion + bestGroup[midIdx]!.priceOutputPerMillion) / 2;
        if (medianAvg > 0) {
          bestGroup = bestGroup.filter((o) => {
            const avg = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
            return avg / medianAvg <= 10;
          });
          // Recalculate spread after filtering
          if (bestGroup.length >= 2) {
            const cAvg = (bestGroup[0]!.priceInputPerMillion + bestGroup[0]!.priceOutputPerMillion) / 2;
            const eAvg = (bestGroup[bestGroup.length - 1]!.priceInputPerMillion + bestGroup[bestGroup.length - 1]!.priceOutputPerMillion) / 2;
            bestSpread = cAvg > 0 ? eAvg / cAvg : 0;
          }
        }
      }

      if (bestGroup.length >= 2) {
        const cheapest = bestGroup[0]!;
        const expensive = bestGroup[bestGroup.length - 1]!;

        if (bestSpread >= 2) {
          return `${header}\n\n${cheapest.modelShort}: $${cheapest.priceInputPerMillion.toFixed(2)}/$${cheapest.priceOutputPerMillion.toFixed(2)} per M tokens on ${cheapest.providerName} vs $${expensive.priceInputPerMillion.toFixed(2)}/$${expensive.priceOutputPerMillion.toFixed(2)} on ${expensive.providerName}.${divider}`;
        } else if (bestSpread >= 1.1) {
          return `${header}\n\n${cheapest.modelShort} pricing is within ${bestSpread.toFixed(1)}x across ${bestGroup.length} providers.${divider}`;
        } else {
          return `${header}\n\n${cheapest.modelShort} pricing is nearly identical across ${bestGroup.length} providers.${divider}`;
        }
      }
    }

    if (matches.length === 1) {
      const o = matches[0]!;
      return `${header}\n\n${o.modelShort} is currently only on ${o.providerName} at $${o.priceInputPerMillion.toFixed(2)}/$${o.priceOutputPerMillion.toFixed(2)} per M tokens in our feed.\nRun volt_check_price with other models to compare alternatives.\n─────────────────────────────────────────────────────────`;
    }
  }

  // Generic fallback: widest spread across all models
  const groups = new Map<string, number[]>();
  for (const o of offerings) {
    const avg = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
    const list = groups.get(o.modelShort) ?? [];
    list.push(avg);
    groups.set(o.modelShort, list);
  }

  let bestModel = '';
  let bestSpread = 0;
  let bestMin = 0;
  let bestMax = 0;

  for (const [model, avgs] of groups) {
    if (avgs.length < 2) continue;
    const min = Math.min(...avgs);
    const max = Math.max(...avgs);
    if (min <= 0) continue;
    const spread = max / min;
    if (spread > bestSpread) {
      bestSpread = spread;
      bestModel = model;
      bestMin = min;
      bestMax = max;
    }
  }

  const genericFooter = `\nRun volt_check_price with any model to compare providers.\n─────────────────────────────────────────────────────────`;

  if (bestModel) {
    return `${header}\nBiggest spread right now: ${bestModel} ranges from $${bestMin.toFixed(2)}/M to $${bestMax.toFixed(2)}/M (${bestSpread.toFixed(1)}x).${genericFooter}`;
  }

  return `${header}${genericFooter}`;
}

function maybeAddFirstRun(result: ToolResult, queriedModel?: string): ToolResult {
  if (firstCallFired) return result;
  firstCallFired = true;

  const message = buildFirstRunMessage(queriedModel);
  if (!message) return result;

  const first = result.content[0];
  if (first) first.text = message + '\n\n' + first.text;
  return result;
}

// ── volt_check_price ──────────────────────────────────
server.tool(
  'volt_check_price',
  'Compare pricing across providers for a given model. Returns offerings sorted by price with quality and reliability data.',
  checkPriceSchema.shape,
  async (input) => {
    const start = Date.now();
    const parsed = checkPriceSchema.parse(input);
    const result = handleCheckPrice(parsed, feedCache);
    const offerings = feedCache.getOfferings();
    const matches = offerings.filter(
      (o) => o.model.toLowerCase().includes(parsed.model.toLowerCase()) ||
             o.modelShort.toLowerCase().includes(parsed.model.toLowerCase()),
    );
    for (const o of matches.slice(0, 5)) {
      reportObservation({
        providerId: o.providerId,
        model: o.model,
        latencyMs: Date.now() - start,
        success: true,
      });
    }
    return maybeAddFirstRun(result, parsed.model);
  },
);

// ── volt_recommend_route ──────────────────────────────
server.tool(
  'volt_recommend_route',
  'Get the optimal provider recommendation for a model based on cost, latency, reliability, or balanced optimization. Shows savings vs your current cost.',
  recommendRouteSchema.shape,
  async (input) => {
    const start = Date.now();
    const parsed = recommendRouteSchema.parse(input);
    const result = handleRecommendRoute(parsed, feedCache);
    const offerings = feedCache.getOfferings();
    const matches = offerings.filter(
      (o) => o.model.toLowerCase().includes(parsed.model.toLowerCase()) ||
             o.modelShort.toLowerCase().includes(parsed.model.toLowerCase()),
    );
    if (matches[0]) {
      reportObservation({
        providerId: matches[0].providerId,
        model: matches[0].model,
        latencyMs: Date.now() - start,
        success: true,
      });
    }
    return maybeAddFirstRun(result, parsed.model);
  },
);

// ── volt_get_spend ────────────────────────────────────
server.tool(
  'volt_get_spend',
  'Get spending summary by provider and model for today, 7 days, or 30 days.',
  getSpendSchema.shape,
  async (input) => maybeAddFirstRun(handleGetSpend(getSpendSchema.parse(input), spendTracker)),
);

// ── volt_get_savings ──────────────────────────────────
server.tool(
  'volt_get_savings',
  'Compare actual spend against optimal routing. Shows savings achieved and savings missed.',
  getSavingsSchema.shape,
  async (input) => maybeAddFirstRun(handleGetSavings(getSavingsSchema.parse(input), spendTracker)),
);

// ── volt_set_budget_alert ─────────────────────────────
server.tool(
  'volt_set_budget_alert',
  'Set a budget threshold for daily, weekly, or monthly spend. Alerts when exceeded.',
  setBudgetAlertSchema.shape,
  async (input) => maybeAddFirstRun(handleSetBudgetAlert(setBudgetAlertSchema.parse(input), spendTracker)),
);

// ── Start ─────────────────────────────────────────────
async function main() {
  feedCache.start();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Volt HQ MCP server failed to start:', err);
  process.exit(1);
});
