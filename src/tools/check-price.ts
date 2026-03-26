/**
 * volt_check_price — Compare pricing across providers for a given model/task.
 *
 * Returns a sorted list of provider offerings matching the query,
 * cheapest first, with pricing details.
 */

import { z } from 'zod';
import { comparePrices, type Offering } from '@volthq/core';
import type { FeedCache } from '../feed-cache.js';

export const checkPriceSchema = z.object({
  model: z
    .string()
    .describe('Model name or partial match (e.g. "llama-70b", "gpt-4o", "deepseek")'),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe('Maximum number of results to return (default: 5)'),
});

export type CheckPriceInput = z.infer<typeof checkPriceSchema>;

export function handleCheckPrice(input: CheckPriceInput, feedCache: FeedCache) {
  const offerings = feedCache.getOfferings();

  if (offerings.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'No pricing data available. The feed may still be loading — try again in a moment.',
        },
      ],
    };
  }

  const matches = comparePrices(offerings, input.model).slice(0, input.max_results);

  if (matches.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `No offerings found matching "${input.model}". Available models: ${getAvailableModels(offerings)}.`,
        },
      ],
    };
  }

  const rows = matches.map((o, i) => formatOfferingRow(o, i + 1));
  const cheapest = matches[0]!;
  const mostExpensive = matches[matches.length - 1]!;

  const avgCheapest = (cheapest.priceInputPerMillion + cheapest.priceOutputPerMillion) / 2;
  const avgExpensive = (mostExpensive.priceInputPerMillion + mostExpensive.priceOutputPerMillion) / 2;
  const savingsPercent =
    avgExpensive > 0 ? Math.round(((avgExpensive - avgCheapest) / avgExpensive) * 100) : 0;

  const header = `Price comparison for "${input.model}" — ${matches.length} offering${matches.length > 1 ? 's' : ''} found`;
  const footer =
    matches.length > 1
      ? `\nCheapest is ${savingsPercent}% less than most expensive option.`
      : '';

  return {
    content: [
      {
        type: 'text' as const,
        text: `${header}\n${'─'.repeat(60)}\n${rows.join('\n')}${footer}`,
      },
    ],
  };
}

function formatOfferingRow(o: Offering, rank: number): string {
  const avgPrice = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
  const quant = o.quantization ? ` (${o.quantization})` : '';
  const gpu = o.gpuType ? ` on ${o.gpuType}` : '';
  const reliability =
    o.observationCount > 0
      ? `${Math.round(o.reliabilityScore * 100)}% reliable`
      : 'no data yet';

  return [
    `${rank}. ${o.providerName} — ${o.modelShort}${quant}${gpu}`,
    `   Input: $${o.priceInputPerMillion.toFixed(2)}/M tokens | Output: $${o.priceOutputPerMillion.toFixed(2)}/M tokens | Avg: $${avgPrice.toFixed(2)}/M`,
    `   Quality: ${(o.qualityScore * 100).toFixed(0)}% | Reliability: ${reliability} | Region: ${o.region}`,
  ].join('\n');
}

function getAvailableModels(offerings: Offering[]): string {
  const unique = [...new Set(offerings.map((o) => o.modelShort))];
  return unique.slice(0, 10).join(', ');
}
