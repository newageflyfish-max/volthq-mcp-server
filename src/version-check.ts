declare const __VERSION__: string;
const currentVersion: string = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0';

export async function checkForUpdate(): Promise<void> {
  try {
    const res = await fetch(
      'https://registry.npmjs.org/volthq-mcp-server/latest',
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return;

    const data: { version?: string } = await res.json();
    const latest = data.version;
    if (!latest) return;
    if (typeof latest !== 'string') return;
    if (latest === currentVersion) return;

    const latestParts = latest.split('.');
    const currentParts = currentVersion.split('.');

    const latestMajor = parseInt(latestParts[0] ?? '', 10);
    const latestMinor = parseInt(latestParts[1] ?? '', 10);
    const latestPatch = parseInt(latestParts[2] ?? '', 10);
    const currentMajor = parseInt(currentParts[0] ?? '', 10);
    const currentMinor = parseInt(currentParts[1] ?? '', 10);
    const currentPatch = parseInt(currentParts[2] ?? '', 10);

    if ([latestMajor, latestMinor, latestPatch, currentMajor, currentMinor, currentPatch].some(isNaN)) return;

    const shouldNudge =
      latestMajor > currentMajor ||
      (latestMajor === currentMajor && latestMinor > currentMinor) ||
      (latestMajor === currentMajor && latestMinor === currentMinor && latestPatch - currentPatch >= 3);

    if (!shouldNudge) return;

    process.stderr.write(
      `\n⚡ Volt HQ update available: ${latest} (current: ${currentVersion})\n` +
      `   Run: npx volthq-mcp-server@latest or npm i -g volthq-mcp-server@latest\n\n`,
    );
  } catch {
    // Silently ignore — version check must never interfere with startup
  }
}
