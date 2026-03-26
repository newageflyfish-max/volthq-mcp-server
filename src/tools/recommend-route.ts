/**
 * volt_recommend_route — Get optimal provider recommendation.
 *
 * Runs the scoring algorithm against cached offerings with the agent's
 * routing profile and returns an actionable recommendation with savings.
 */

import { z } from 'zod';
import {
  generateRecommendation,
  type RoutingProfile,
  type OptimizeTarget,
  type RoutingRecommendation,
  type ScoredOffering,
  DEFAULT_ROUTING_PROFILE,
} from '@volthq/core';
import type { FeedCache } from '../feed-cache.js';

export const recommendRouteSchema = z.object({
  model: z
    .string()
    .describe('Model name or partial match to filter offerings (e.g. "llama-70b", "gpt-4o")'),
  optimize: z
    .enum(['cost', 'latency', 'reliability', 'balanced'])
    .default('balanced')
    .describe('What to optimize for (default: balanced)'),
  current_cost_per_million: z
    .number()
    .nullable()
    .default(null)
    .describe('What you currently pay per million tokens (avg of input+output), for savings estimate'),
  min_quality: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Minimum acceptable quality score 0-1 (default: 0.7)'),
  max_latency_ms: z
    .number()
    .int()
    .min(100)
    .default(5000)
    .describe('Maximum acceptable P95 latency in ms (default: 5000)'),
  blocked_providers: z
    .array(z.string())
    .default([])
    .describe('Provider IDs to exclude from recommendations'),
});

export type RecommendRouteInput = z.infer<typeof recommendRouteSchema>;

export function handleRecommendRoute(input: RecommendRouteInput, feedCache: FeedCache) {
  const allOfferings = feedCache.getOfferings();

  if (allOfferings.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'No pricing data available. The feed may still be loading — try again in a moment.',
        },
      ],
    };
  }

  // Filter to offerings matching the model query
  const query = input.model.toLowerCase();
  const modelOfferings = allOfferings.filter(
    (o) =>
      o.model.toLowerCase().includes(query) || o.modelShort.toLowerCase().includes(query),
  );

  if (modelOfferings.length === 0) {
    const available = [...new Set(allOfferings.map((o) => o.modelShort))].slice(0, 10).join(', ');
    return {
      content: [
        {
          type: 'text' as const,
          text: `No offerings found matching "${input.model}". Available models: ${available}.`,
        },
      ],
    };
  }

  // Auto-calculate comparison cost from most expensive offering if user didn't provide one
  let currentCost = input.current_cost_per_million;
  let comparisonContext: { autoCalculated: boolean; providerName: string; avgCost: number } = {
    autoCalculated: false,
    providerName: '',
    avgCost: 0,
  };

  if (currentCost == null && modelOfferings.length >= 2) {
    let maxAvg = 0;
    let maxProvider = '';
    for (const o of modelOfferings) {
      const avg = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
      if (avg > maxAvg) {
        maxAvg = avg;
        maxProvider = o.providerName;
      }
    }
    currentCost = maxAvg;
    comparisonContext = { autoCalculated: true, providerName: maxProvider, avgCost: maxAvg };
  }

  const profile: RoutingProfile = {
    optimize: input.optimize as OptimizeTarget,
    minQuality: input.min_quality,
    maxLatencyMs: input.max_latency_ms,
    maxCostPerMillionTokens: Infinity,
    preferredProviders: [],
    blockedProviders: input.blocked_providers,
  };

  const rec = generateRecommendation(modelOfferings, profile, currentCost);

  if (!rec) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `No eligible offerings for "${input.model}" with your constraints. Try lowering min_quality or raising max_latency_ms.`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: formatRecommendation(rec, input.optimize, comparisonContext),
      },
    ],
  };
}

function formatRecommendation(rec: RoutingRecommendation, optimize: string, comparisonContext?: { autoCalculated: boolean; providerName: string; avgCost: number }): string {
  const r = rec.recommended;
  const o = r.offering;
  const avgPrice = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
  const quant = o.quantization ? ` (${o.quantization})` : '';
  const gpu = o.gpuType ? ` on ${o.gpuType}` : '';

  const lines: string[] = [
    `Recommendation (optimize: ${optimize})`,
    '─'.repeat(60),
    `Provider: ${o.providerName}`,
    `Model: ${o.modelShort}${quant}${gpu}`,
    `Price: $${o.priceInputPerMillion.toFixed(2)} input / $${o.priceOutputPerMillion.toFixed(2)} output per M tokens (avg $${avgPrice.toFixed(2)})`,
    `Score: ${(r.score * 100).toFixed(1)} (quality: ${(r.breakdown.qualityComponent * 100).toFixed(0)} | reliability: ${(r.breakdown.reliabilityComponent * 100).toFixed(0)} | latency: ${(r.breakdown.latencyComponent * 100).toFixed(0)} | price: ${(r.breakdown.priceComponent * 100).toFixed(0)})`,
    `Region: ${o.region} | Status: ${o.status}`,
  ];

  if (rec.savingsPercent !== null && rec.savingsAbsolute !== null) {
    if (comparisonContext?.autoCalculated && rec.savingsAbsolute > 0) {
      lines.push(`Savings: ${rec.savingsPercent}% — $${rec.savingsAbsolute.toFixed(2)}/M cheaper than most expensive option (${comparisonContext.providerName} at $${comparisonContext.avgCost.toFixed(2)}/M)`);
    } else if (rec.savingsAbsolute > 0) {
      lines.push(`Savings: ${rec.savingsPercent}% — $${rec.savingsAbsolute.toFixed(2)}/M tokens vs your current cost`);
    } else {
      lines.push(`Your current cost ($${rec.currentCost!.toFixed(2)}/M) is already cheaper than this recommendation.`);
    }
  }

  if (rec.alternatives.length > 0) {
    lines.push('', 'Alternatives:');
    for (const alt of rec.alternatives) {
      const ao = alt.offering;
      const altAvg = (ao.priceInputPerMillion + ao.priceOutputPerMillion) / 2;
      const aq = ao.quantization ? ` (${ao.quantization})` : '';
      lines.push(
        `  - ${ao.providerName} ${ao.modelShort}${aq}: $${altAvg.toFixed(2)}/M avg, score ${(alt.score * 100).toFixed(1)}`,
      );
    }
  }

  return lines.join('\n');
}
