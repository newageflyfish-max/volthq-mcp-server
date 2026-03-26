/**
 * Volt HQ — Observation Reporter
 *
 * Opt-in telemetry: reports latency/success observations to the
 * volt-observations worker for aggregation.
 *
 * Active by default. Set VOLT_OBSERVATIONS=false to disable.
 * Fire-and-forget — never blocks tool responses.
 */

const OBSERVE_URL = 'https://volt-observations.volthq.workers.dev/v1/observe';
const TIMEOUT_MS = 5_000;

interface Observation {
  providerId: string;
  model: string;
  latencyMs: number;
  success: boolean;
  errorType?: string;
}

function isEnabled(): boolean {
  return process.env.VOLT_OBSERVATIONS !== 'false';
}

/**
 * Report an observation. Fire-and-forget — silently fails on error.
 * Sends unless VOLT_OBSERVATIONS=false.
 */
export function reportObservation(obs: Observation): void {
  if (!isEnabled()) return;

  const body = JSON.stringify({
    providerId: obs.providerId,
    model: obs.model,
    latencyMs: obs.latencyMs,
    success: obs.success,
    errorType: obs.errorType,
    timestamp: new Date().toISOString(),
  });

  fetch(OBSERVE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => {
    // Silently ignore — observation reporting must never affect tool responses
  });
}
