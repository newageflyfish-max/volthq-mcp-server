/**
 * Volt HQ — Auto-Setup
 *
 * Detects Cursor and Claude Desktop config files and adds
 * the Volt HQ MCP server configuration automatically.
 * Merges into existing config without overwriting other servers.
 *
 * Usage: npx volthq-mcp-server --setup
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

const VOLTHQ_CONFIG = {
  command: 'npx',
  args: ['-y', 'volthq-mcp-server'],
};

interface McpConfig {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Read and parse a JSON config file. Returns null if missing or invalid.
 */
function readJsonFile(filePath: string): McpConfig | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as McpConfig;
  } catch {
    return null;
  }
}

/**
 * Write a JSON config file, creating parent directories if needed.
 */
function writeJsonFile(filePath: string, data: McpConfig): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Add volthq to an MCP config file. Merges with existing servers.
 * Returns 'added' | 'exists' | 'created'.
 */
function addToConfig(filePath: string): 'added' | 'exists' | 'created' {
  const existing = readJsonFile(filePath);

  if (existing) {
    // File exists — check if volthq is already configured
    const servers = (existing.mcpServers ?? {}) as Record<string, unknown>;
    if (servers['volthq']) {
      return 'exists';
    }

    // Merge: add volthq without touching other servers
    existing.mcpServers = { ...servers, volthq: VOLTHQ_CONFIG };
    writeJsonFile(filePath, existing);
    return 'added';
  }

  // File doesn't exist — create with just volthq
  writeJsonFile(filePath, {
    mcpServers: { volthq: VOLTHQ_CONFIG },
  });
  return 'created';
}

/**
 * Run the setup process. Checks Cursor and Claude Desktop configs.
 */
export function runSetup(): void {
  const home = homedir();

  const targets = [
    {
      name: 'Cursor',
      path: join(home, '.cursor', 'mcp.json'),
    },
    {
      name: 'Claude Desktop',
      path: join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    },
  ];

  console.log('\n⚡ Volt HQ — Setup\n');

  let anyConfigured = false;

  for (const target of targets) {
    const fileExists = existsSync(target.path);

    if (!fileExists && target.name === 'Claude Desktop') {
      // Only create Claude Desktop config if the Claude directory exists
      const claudeDir = dirname(target.path);
      if (!existsSync(claudeDir)) {
        console.log(`  ○ ${target.name} — not installed, skipping`);
        continue;
      }
    }

    const result = addToConfig(target.path);

    switch (result) {
      case 'created':
        console.log(`  ✓ ${target.name} — created config with Volt HQ`);
        anyConfigured = true;
        break;
      case 'added':
        console.log(`  ✓ ${target.name} — added Volt HQ (existing servers preserved)`);
        anyConfigured = true;
        break;
      case 'exists':
        console.log(`  ✓ ${target.name} — Volt HQ already configured`);
        anyConfigured = true;
        break;
    }
  }

  if (!anyConfigured) {
    console.log('  No supported clients found. Install manually:\n');
    console.log('  Cursor — add to .cursor/mcp.json:');
    console.log('  Claude Desktop — add to claude_desktop_config.json:\n');
    console.log(JSON.stringify({ mcpServers: { volthq: VOLTHQ_CONFIG } }, null, 2));
  }

  console.log('\n  Docs: https://volthq.dev');
  console.log('  npm:  https://www.npmjs.com/package/volthq-mcp-server\n');
}
