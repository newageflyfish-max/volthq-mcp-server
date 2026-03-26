/**
 * Volt HQ — Pricing Feed Cache
 *
 * Local cache of the signed pricing feed with automatic refresh.
 * Fail-open: if the feed cannot be fetched, returns stale data.
 * If no data has ever been fetched, returns an empty offerings array.
 */

import type { PricingFeed, Offering, CircuitBreakerStatus, CircuitState } from '@volthq/core';
import { SNAPSHOT_OFFERINGS } from './snapshot.js';

const FEED_URL = 'https://volt-feed.volthq.workers.dev/v1/prices';
const REFRESH_INTERVAL_MS = 60_000; // 60 seconds
const CIRCUIT_BREAKER_THRESHOLD = 3; // consecutive failures before opening circuit
const CIRCUIT_BREAKER_RESET_MS = 120_000; // 2 minutes in open state before half-open

export class FeedCache {
  private offerings: Offering[] = [];
  private lastFetchedAt: number = 0;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  // Circuit breaker state
  private circuitState: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private lastFailure: string | null = null;
  private lastSuccess: string | null = null;

  private feedUrl: string;

  constructor(feedUrl?: string) {
    this.feedUrl = feedUrl ?? FEED_URL;
    // Seed with embedded snapshot so tools work before a live feed is available
    this.offerings = SNAPSHOT_OFFERINGS;
  }

  /** Start periodic background refresh. */
  start(): void {
    // Fetch immediately on start
    this.refresh();
    this.refreshTimer = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
  }

  /** Stop background refresh. */
  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /** Get current cached offerings. Never throws. */
  getOfferings(): Offering[] {
    return this.offerings;
  }

  /** Age of the cached feed in seconds. */
  getCacheAgeSeconds(): number {
    if (this.lastFetchedAt === 0) return Infinity;
    return Math.round((Date.now() - this.lastFetchedAt) / 1000);
  }

  /** Circuit breaker status for diagnostics. */
  getCircuitStatus(): CircuitBreakerStatus {
    return {
      state: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      feedCacheAgeSeconds: this.getCacheAgeSeconds(),
    };
  }

  /** Allow injecting offerings directly (useful for testing or seeding). */
  setOfferings(offerings: Offering[]): void {
    this.offerings = offerings;
    this.lastFetchedAt = Date.now();
  }

  /** Attempt to refresh the feed. Fail-open: never throws. */
  private async refresh(): Promise<void> {
    // Circuit breaker: skip fetch if circuit is open
    if (this.circuitState === 'open') {
      const elapsed = Date.now() - (this.lastFailure ? new Date(this.lastFailure).getTime() : 0);
      if (elapsed < CIRCUIT_BREAKER_RESET_MS) return;
      // Transition to half-open to test
      this.circuitState = 'half-open';
    }

    try {
      const response = await fetch(this.feedUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        this.recordFailure();
        return;
      }

      const feed = (await response.json()) as PricingFeed;

      if (!feed.offerings || !Array.isArray(feed.offerings)) {
        this.recordFailure();
        return;
      }

      this.offerings = feed.offerings;
      this.lastFetchedAt = Date.now();
      this.consecutiveFailures = 0;
      this.circuitState = 'closed';
      this.lastSuccess = new Date().toISOString();
    } catch {
      // Fail-open: keep stale data, log nothing destructive
      this.recordFailure();
    }
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailure = new Date().toISOString();
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitState = 'open';
    }
  }
}
