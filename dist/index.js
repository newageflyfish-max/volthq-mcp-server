#!/usr/bin/env node

// src/setup.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
var VOLTHQ_CONFIG = {
  command: "npx",
  args: ["-y", "volthq-mcp-server"]
};
function readJsonFile(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeJsonFile(filePath, data) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
function addToConfig(filePath) {
  const existing = readJsonFile(filePath);
  if (existing) {
    const servers = existing.mcpServers ?? {};
    if (servers["volthq"]) {
      return "exists";
    }
    existing.mcpServers = { ...servers, volthq: VOLTHQ_CONFIG };
    writeJsonFile(filePath, existing);
    return "added";
  }
  writeJsonFile(filePath, {
    mcpServers: { volthq: VOLTHQ_CONFIG }
  });
  return "created";
}
function runSetup() {
  const home = homedir();
  const targets = [
    {
      name: "Cursor",
      path: join(home, ".cursor", "mcp.json")
    },
    {
      name: "Claude Desktop",
      path: join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
    }
  ];
  console.log("\n\u26A1 Volt HQ \u2014 Setup\n");
  let anyConfigured = false;
  for (const target of targets) {
    const fileExists = existsSync(target.path);
    if (!fileExists && target.name === "Claude Desktop") {
      const claudeDir = dirname(target.path);
      if (!existsSync(claudeDir)) {
        console.log(`  \u25CB ${target.name} \u2014 not installed, skipping`);
        continue;
      }
    }
    const result = addToConfig(target.path);
    switch (result) {
      case "created":
        console.log(`  \u2713 ${target.name} \u2014 created config with Volt HQ`);
        anyConfigured = true;
        break;
      case "added":
        console.log(`  \u2713 ${target.name} \u2014 added Volt HQ (existing servers preserved)`);
        anyConfigured = true;
        break;
      case "exists":
        console.log(`  \u2713 ${target.name} \u2014 Volt HQ already configured`);
        anyConfigured = true;
        break;
    }
  }
  if (!anyConfigured) {
    console.log("  No supported clients found. Install manually:\n");
    console.log("  Cursor \u2014 add to .cursor/mcp.json:");
    console.log("  Claude Desktop \u2014 add to claude_desktop_config.json:\n");
    console.log(JSON.stringify({ mcpServers: { volthq: VOLTHQ_CONFIG } }, null, 2));
  }
  console.log("\n  Docs: https://volthq.dev");
  console.log("  npm:  https://www.npmjs.com/package/volthq-mcp-server\n");
}

// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// src/snapshot.ts
var NOW = "2026-03-06T00:00:00Z";
var SNAPSHOT_OFFERINGS = [
  // ─── Hyperbolic (DePIN) ───────────────────────────────
  {
    id: "hyperbolic:deepseek-ai/DeepSeek-V3:FP8:H100-SXM:global",
    providerId: "hyperbolic",
    providerName: "Hyperbolic",
    providerType: "depin",
    model: "deepseek-ai/DeepSeek-V3",
    modelShort: "DeepSeek-V3",
    capabilityTier: 1,
    quantization: "FP8",
    gpuType: "H100-SXM",
    region: "global",
    priceInputPerMillion: 0.5,
    priceOutputPerMillion: 1,
    pricePerGpuHour: null,
    qualityScore: 0.92,
    reliabilityScore: 0.5,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "hyperbolic:deepseek-ai/DeepSeek-R1:FP8:H100-SXM:global",
    providerId: "hyperbolic",
    providerName: "Hyperbolic",
    providerType: "depin",
    model: "deepseek-ai/DeepSeek-R1",
    modelShort: "DeepSeek-R1",
    capabilityTier: 1,
    quantization: "FP8",
    gpuType: "H100-SXM",
    region: "global",
    priceInputPerMillion: 0.5,
    priceOutputPerMillion: 2,
    pricePerGpuHour: null,
    qualityScore: 0.92,
    reliabilityScore: 0.5,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "hyperbolic:meta-llama/Llama-3.1-70B-Instruct:FP8:H100-SXM:global",
    providerId: "hyperbolic",
    providerName: "Hyperbolic",
    providerType: "depin",
    model: "meta-llama/Llama-3.1-70B-Instruct",
    modelShort: "Llama-70B",
    capabilityTier: 2,
    quantization: "FP8",
    gpuType: "H100-SXM",
    region: "global",
    priceInputPerMillion: 0.4,
    priceOutputPerMillion: 0.4,
    pricePerGpuHour: null,
    qualityScore: 0.85,
    reliabilityScore: 0.5,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "hyperbolic:meta-llama/Llama-3.1-70B-Instruct:BF16:H100-SXM:global",
    providerId: "hyperbolic",
    providerName: "Hyperbolic",
    providerType: "depin",
    model: "meta-llama/Llama-3.1-70B-Instruct",
    modelShort: "Llama-70B",
    capabilityTier: 2,
    quantization: "BF16",
    gpuType: "H100-SXM",
    region: "global",
    priceInputPerMillion: 0.55,
    priceOutputPerMillion: 0.55,
    pricePerGpuHour: null,
    qualityScore: 0.88,
    reliabilityScore: 0.5,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "hyperbolic:meta-llama/Llama-3.1-8B-Instruct:FP8:H100-SXM:global",
    providerId: "hyperbolic",
    providerName: "Hyperbolic",
    providerType: "depin",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    modelShort: "Llama-8B",
    capabilityTier: 3,
    quantization: "FP8",
    gpuType: "H100-SXM",
    region: "global",
    priceInputPerMillion: 0.06,
    priceOutputPerMillion: 0.06,
    pricePerGpuHour: null,
    qualityScore: 0.76,
    reliabilityScore: 0.5,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  // ─── Akash (DePIN) ──────────────────────────────────
  // Pricing derived from live GPU-hour rates via gpuHourToPerToken():
  // H100 SXM5 median $1.57/hr, A100 SXM4 median $1.18/hr
  {
    id: "akash:meta-llama/Llama-3.1-70B-Instruct:FP8:H100-SXM:global",
    providerId: "akash",
    providerName: "Akash",
    providerType: "depin",
    model: "meta-llama/Llama-3.1-70B-Instruct",
    modelShort: "Llama-70B",
    capabilityTier: 2,
    quantization: "FP8",
    gpuType: "H100-SXM",
    region: "global",
    priceInputPerMillion: 3.489,
    // $1.57/hr ÷ 180k tok/hr × 1M × 0.4
    priceOutputPerMillion: 8.722,
    // $1.57/hr ÷ 180k tok/hr × 1M
    pricePerGpuHour: 1.57,
    qualityScore: 0.85,
    reliabilityScore: 0.5,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "api"
  },
  {
    id: "akash:meta-llama/Llama-3.1-70B-Instruct:FP8:A100-80GB:global",
    providerId: "akash",
    providerName: "Akash",
    providerType: "depin",
    model: "meta-llama/Llama-3.1-70B-Instruct",
    modelShort: "Llama-70B",
    capabilityTier: 2,
    quantization: "FP8",
    gpuType: "A100-80GB",
    region: "global",
    priceInputPerMillion: 5.244,
    // $1.18/hr ÷ 90k tok/hr × 1M × 0.4
    priceOutputPerMillion: 13.111,
    // $1.18/hr ÷ 90k tok/hr × 1M
    pricePerGpuHour: 1.18,
    qualityScore: 0.85,
    reliabilityScore: 0.5,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "api"
  },
  {
    id: "akash:meta-llama/Llama-3.1-8B-Instruct:FP8:H100-SXM:global",
    providerId: "akash",
    providerName: "Akash",
    providerType: "depin",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    modelShort: "Llama-8B",
    capabilityTier: 3,
    quantization: "FP8",
    gpuType: "H100-SXM",
    region: "global",
    priceInputPerMillion: 0.349,
    // $1.57/hr ÷ 1.8M tok/hr × 1M × 0.4
    priceOutputPerMillion: 0.872,
    // $1.57/hr ÷ 1.8M tok/hr × 1M
    pricePerGpuHour: 1.57,
    qualityScore: 0.76,
    reliabilityScore: 0.5,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "api"
  },
  {
    id: "akash:meta-llama/Llama-3.1-8B-Instruct:FP8:A100-80GB:global",
    providerId: "akash",
    providerName: "Akash",
    providerType: "depin",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    modelShort: "Llama-8B",
    capabilityTier: 3,
    quantization: "FP8",
    gpuType: "A100-80GB",
    region: "global",
    priceInputPerMillion: 0.524,
    // $1.18/hr ÷ 900k tok/hr × 1M × 0.4
    priceOutputPerMillion: 1.311,
    // $1.18/hr ÷ 900k tok/hr × 1M
    pricePerGpuHour: 1.18,
    qualityScore: 0.76,
    reliabilityScore: 0.5,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "api"
  },
  // ─── Groq (Centralized) ─────────────────────────────
  {
    id: "groq:meta-llama/Llama-3.1-70B-Instruct:default:unknown:global",
    providerId: "groq",
    providerName: "Groq",
    providerType: "centralized",
    model: "meta-llama/Llama-3.1-70B-Instruct",
    modelShort: "Llama-70B",
    capabilityTier: 2,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.59,
    priceOutputPerMillion: 0.79,
    pricePerGpuHour: null,
    qualityScore: 0.88,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "groq:meta-llama/Llama-3.1-8B-Instruct:default:unknown:global",
    providerId: "groq",
    providerName: "Groq",
    providerType: "centralized",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    modelShort: "Llama-8B",
    capabilityTier: 3,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.05,
    priceOutputPerMillion: 0.08,
    pricePerGpuHour: null,
    qualityScore: 0.78,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "groq:mistralai/Mixtral-8x7B-Instruct-v0.1:default:unknown:global",
    providerId: "groq",
    providerName: "Groq",
    providerType: "centralized",
    model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    modelShort: "Mixtral-8x7B",
    capabilityTier: 2,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.24,
    priceOutputPerMillion: 0.24,
    pricePerGpuHour: null,
    qualityScore: 0.85,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  // ─── Together AI (Centralized) ─────────────────────────
  {
    id: "together:meta-llama/Llama-3.1-70B-Instruct:default:unknown:global",
    providerId: "together",
    providerName: "Together AI",
    providerType: "centralized",
    model: "meta-llama/Llama-3.1-70B-Instruct",
    modelShort: "Llama-70B",
    capabilityTier: 2,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.88,
    priceOutputPerMillion: 0.88,
    pricePerGpuHour: null,
    qualityScore: 0.88,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "together:meta-llama/Llama-3.1-8B-Instruct:default:unknown:global",
    providerId: "together",
    providerName: "Together AI",
    providerType: "centralized",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    modelShort: "Llama-8B",
    capabilityTier: 3,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.18,
    priceOutputPerMillion: 0.18,
    pricePerGpuHour: null,
    qualityScore: 0.78,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "together:deepseek-ai/DeepSeek-V3:default:unknown:global",
    providerId: "together",
    providerName: "Together AI",
    providerType: "centralized",
    model: "deepseek-ai/DeepSeek-V3",
    modelShort: "DeepSeek-V3",
    capabilityTier: 1,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.5,
    priceOutputPerMillion: 0.9,
    pricePerGpuHour: null,
    qualityScore: 0.92,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  // ─── DeepInfra (Centralized) ────────────────────────────
  {
    id: "deepinfra:meta-llama/Llama-3.1-70B-Instruct:default:unknown:global",
    providerId: "deepinfra",
    providerName: "DeepInfra",
    providerType: "centralized",
    model: "meta-llama/Llama-3.1-70B-Instruct",
    modelShort: "Llama-70B",
    capabilityTier: 2,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.2,
    priceOutputPerMillion: 0.27,
    pricePerGpuHour: null,
    qualityScore: 0.88,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "deepinfra:meta-llama/Llama-3.1-8B-Instruct:default:unknown:global",
    providerId: "deepinfra",
    providerName: "DeepInfra",
    providerType: "centralized",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    modelShort: "Llama-8B",
    capabilityTier: 3,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.03,
    priceOutputPerMillion: 0.05,
    pricePerGpuHour: null,
    qualityScore: 0.78,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "deepinfra:deepseek-ai/DeepSeek-V3:default:unknown:global",
    providerId: "deepinfra",
    providerName: "DeepInfra",
    providerType: "centralized",
    model: "deepseek-ai/DeepSeek-V3",
    modelShort: "DeepSeek-V3",
    capabilityTier: 1,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.3,
    priceOutputPerMillion: 0.6,
    pricePerGpuHour: null,
    qualityScore: 0.95,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  // ─── Fireworks AI (Centralized) ────────────────────────
  {
    id: "fireworks:meta-llama/Llama-3.1-70B-Instruct:default:unknown:global",
    providerId: "fireworks",
    providerName: "Fireworks AI",
    providerType: "centralized",
    model: "meta-llama/Llama-3.1-70B-Instruct",
    modelShort: "Llama-70B",
    capabilityTier: 2,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.7,
    priceOutputPerMillion: 0.7,
    pricePerGpuHour: null,
    qualityScore: 0.88,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "fireworks:meta-llama/Llama-3.1-8B-Instruct:default:unknown:global",
    providerId: "fireworks",
    providerName: "Fireworks AI",
    providerType: "centralized",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    modelShort: "Llama-8B",
    capabilityTier: 3,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.1,
    priceOutputPerMillion: 0.1,
    pricePerGpuHour: null,
    qualityScore: 0.78,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "fireworks:deepseek-ai/DeepSeek-R1:default:unknown:global",
    providerId: "fireworks",
    providerName: "Fireworks AI",
    providerType: "centralized",
    model: "deepseek-ai/DeepSeek-R1",
    modelShort: "DeepSeek-R1",
    capabilityTier: 1,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.55,
    priceOutputPerMillion: 2.19,
    pricePerGpuHour: null,
    qualityScore: 0.95,
    reliabilityScore: 0.9,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  // ─── OpenAI (Centralized) ────────────────────────────
  {
    id: "openai:gpt-4o:default:unknown:global",
    providerId: "openai",
    providerName: "OpenAI",
    providerType: "centralized",
    model: "gpt-4o",
    modelShort: "GPT-4o",
    capabilityTier: 1,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 2.5,
    priceOutputPerMillion: 10,
    pricePerGpuHour: null,
    qualityScore: 0.98,
    reliabilityScore: 0.95,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "openai:gpt-4o-mini:default:unknown:global",
    providerId: "openai",
    providerName: "OpenAI",
    providerType: "centralized",
    model: "gpt-4o-mini",
    modelShort: "GPT-4o-mini",
    capabilityTier: 2,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 0.15,
    priceOutputPerMillion: 0.6,
    pricePerGpuHour: null,
    qualityScore: 0.92,
    reliabilityScore: 0.95,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  // ─── Anthropic (Centralized) ─────────────────────────
  {
    id: "anthropic:claude-sonnet-4-6:default:unknown:global",
    providerId: "anthropic",
    providerName: "Anthropic",
    providerType: "centralized",
    model: "claude-sonnet-4-6",
    modelShort: "Sonnet 4.6",
    capabilityTier: 2,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 3,
    priceOutputPerMillion: 15,
    pricePerGpuHour: null,
    qualityScore: 0.93,
    reliabilityScore: 0.95,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  },
  {
    id: "anthropic:claude-haiku-4-5:default:unknown:global",
    providerId: "anthropic",
    providerName: "Anthropic",
    providerType: "centralized",
    model: "claude-haiku-4-5",
    modelShort: "Haiku 4.5",
    capabilityTier: 4,
    quantization: null,
    gpuType: null,
    region: "global",
    priceInputPerMillion: 1,
    priceOutputPerMillion: 5,
    pricePerGpuHour: null,
    qualityScore: 0.86,
    reliabilityScore: 0.95,
    latencyP50Ms: null,
    latencyP95Ms: null,
    observationCount: 0,
    status: "active",
    lastPriceUpdate: NOW,
    lastObservationUpdate: null,
    dataSource: "manual"
  }
];

// src/feed-cache.ts
var FEED_URL = "https://volt-feed.volthq.workers.dev/v1/prices";
var REFRESH_INTERVAL_MS = 6e4;
var CIRCUIT_BREAKER_THRESHOLD = 3;
var CIRCUIT_BREAKER_RESET_MS = 12e4;
var FeedCache = class {
  offerings = [];
  lastFetchedAt = 0;
  refreshTimer = null;
  // Circuit breaker state
  circuitState = "closed";
  consecutiveFailures = 0;
  lastFailure = null;
  lastSuccess = null;
  feedUrl;
  constructor(feedUrl) {
    this.feedUrl = feedUrl ?? FEED_URL;
    this.offerings = SNAPSHOT_OFFERINGS;
  }
  /** Start periodic background refresh. */
  start() {
    this.refresh();
    this.refreshTimer = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
  }
  /** Stop background refresh. */
  stop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  /** Get current cached offerings. Never throws. */
  getOfferings() {
    return this.offerings;
  }
  /** Age of the cached feed in seconds. */
  getCacheAgeSeconds() {
    if (this.lastFetchedAt === 0) return Infinity;
    return Math.round((Date.now() - this.lastFetchedAt) / 1e3);
  }
  /** Circuit breaker status for diagnostics. */
  getCircuitStatus() {
    return {
      state: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      feedCacheAgeSeconds: this.getCacheAgeSeconds()
    };
  }
  /** Allow injecting offerings directly (useful for testing or seeding). */
  setOfferings(offerings) {
    this.offerings = offerings;
    this.lastFetchedAt = Date.now();
  }
  /** Attempt to refresh the feed. Fail-open: never throws. */
  async refresh() {
    if (this.circuitState === "open") {
      const elapsed = Date.now() - (this.lastFailure ? new Date(this.lastFailure).getTime() : 0);
      if (elapsed < CIRCUIT_BREAKER_RESET_MS) return;
      this.circuitState = "half-open";
    }
    try {
      const response = await fetch(this.feedUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(1e4)
      });
      if (!response.ok) {
        this.recordFailure();
        return;
      }
      const feed = await response.json();
      if (!feed.offerings || !Array.isArray(feed.offerings)) {
        this.recordFailure();
        return;
      }
      this.offerings = feed.offerings;
      this.lastFetchedAt = Date.now();
      this.consecutiveFailures = 0;
      this.circuitState = "closed";
      this.lastSuccess = (/* @__PURE__ */ new Date()).toISOString();
    } catch {
      this.recordFailure();
    }
  }
  recordFailure() {
    this.consecutiveFailures++;
    this.lastFailure = (/* @__PURE__ */ new Date()).toISOString();
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitState = "open";
    }
  }
};

// src/spend-tracker.ts
var SpendTracker = class {
  records = [];
  alerts = [];
  feedCache;
  constructor(feedCache2) {
    this.feedCache = feedCache2;
  }
  /** Record a new inference call. */
  record(entry) {
    this.records.push(entry);
    return this.checkAlerts();
  }
  /** Get all records (for testing/debugging). */
  getRecords() {
    return this.records;
  }
  /** Compute a spending summary for a time range. */
  getSummary(range) {
    const cutoff = this.cutoffForRange(range);
    const filtered = this.records.filter((r) => new Date(r.timestamp).getTime() >= cutoff);
    const byProvider = {};
    const byModel = {};
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
      averageCostPerCall: filtered.length > 0 ? round(totalSpend / filtered.length) : 0
    };
  }
  /** Compare actual spend vs what the agent would have spent following recommendations. */
  getSavingsReport(range) {
    const cutoff = this.cutoffForRange(range);
    const filtered = this.records.filter((r) => new Date(r.timestamp).getTime() >= cutoff);
    const offerings = this.feedCache.getOfferings();
    let actualSpend = 0;
    let optimalSpend = 0;
    for (const r of filtered) {
      actualSpend += r.cost;
      const cheapest = this.findCheapestOffering(r.model, offerings);
      if (cheapest) {
        const cheapestCost = r.tokensInput / 1e6 * cheapest.priceInputPerMillion + r.tokensOutput / 1e6 * cheapest.priceOutputPerMillion;
        optimalSpend += cheapestCost;
      } else {
        optimalSpend += r.cost;
      }
    }
    const totalSavingsPossible = actualSpend - optimalSpend;
    let savingsAchieved = 0;
    let savingsMissed = 0;
    for (const r of filtered) {
      const cheapest = this.findCheapestOffering(r.model, offerings);
      if (!cheapest) continue;
      const cheapestCost = r.tokensInput / 1e6 * cheapest.priceInputPerMillion + r.tokensOutput / 1e6 * cheapest.priceOutputPerMillion;
      const diff = r.cost - cheapestCost;
      if (r.providerId === cheapest.providerId) {
        savingsAchieved += diff > 0 ? diff : 0;
      } else if (diff > 0) {
        savingsMissed += diff;
      }
    }
    const savingsPercent = actualSpend > 0 ? round(totalSavingsPossible / actualSpend * 100) : 0;
    return {
      timeRange: range,
      actualSpend: round(actualSpend),
      optimalSpend: round(optimalSpend),
      savingsAchieved: round(savingsAchieved),
      savingsMissed: round(savingsMissed),
      savingsPercent
    };
  }
  // ── Budget Alerts ────────────────────────────────────
  /** Set or update a budget alert. Returns the alert ID. */
  setAlert(threshold, period) {
    const existing = this.alerts.find((a) => a.period === period);
    if (existing) {
      existing.threshold = threshold;
      existing.enabled = true;
      return existing;
    }
    const alert = {
      id: `alert-${period}`,
      threshold,
      period,
      enabled: true
    };
    this.alerts.push(alert);
    return alert;
  }
  /** Get all configured alerts. */
  getAlerts() {
    return this.alerts;
  }
  /** Check all alerts against current spend. */
  checkAlerts() {
    const triggered = [];
    for (const alert of this.alerts) {
      if (!alert.enabled) continue;
      const range = periodToRange(alert.period);
      const summary = this.getSummary(range);
      if (summary.totalSpend >= alert.threshold) {
        const percent = round(summary.totalSpend / alert.threshold * 100);
        triggered.push({
          alert,
          currentSpend: summary.totalSpend,
          percentOfBudget: percent,
          message: `Budget alert: ${alert.period} spend $${summary.totalSpend.toFixed(2)} has reached ${percent}% of $${alert.threshold.toFixed(2)} threshold.`
        });
      }
    }
    return triggered;
  }
  // ── Private helpers ──────────────────────────────────
  cutoffForRange(range) {
    const now = Date.now();
    switch (range) {
      case "today": {
        const d = /* @__PURE__ */ new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }
      case "7d":
        return now - 7 * 24 * 60 * 60 * 1e3;
      case "30d":
        return now - 30 * 24 * 60 * 60 * 1e3;
    }
  }
  findCheapestOffering(model, offerings) {
    const query = model.toLowerCase();
    const matches = offerings.filter(
      (o) => o.model.toLowerCase().includes(query) || o.modelShort.toLowerCase().includes(query)
    );
    if (matches.length === 0) return null;
    let cheapest = matches[0];
    for (const o of matches) {
      const priceA = (cheapest.priceInputPerMillion + cheapest.priceOutputPerMillion) / 2;
      const priceB = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
      if (priceB < priceA) cheapest = o;
    }
    return cheapest;
  }
};
function periodToRange(period) {
  switch (period) {
    case "daily":
      return "today";
    case "weekly":
      return "7d";
    case "monthly":
      return "30d";
  }
}
function round(n) {
  return Math.round(n * 100) / 100;
}
function roundValues(record) {
  const result = {};
  for (const [key, val] of Object.entries(record)) {
    result[key] = round(val);
  }
  return result;
}

// src/tools/check-price.ts
import { z } from "zod";

// ../core/dist/types.js
var DEFAULT_ROUTING_PROFILE = {
  optimize: "balanced",
  minQuality: 0.7,
  maxLatencyMs: 5e3,
  maxCostPerMillionTokens: Infinity,
  preferredProviders: [],
  blockedProviders: []
};

// ../core/dist/scoring.js
var WEIGHTS = {
  cost: { quality: 0.15, reliability: 0.15, latency: 0.1, price: 0.6 },
  latency: { quality: 0.15, reliability: 0.2, latency: 0.5, price: 0.15 },
  reliability: { quality: 0.15, reliability: 0.55, latency: 0.15, price: 0.15 },
  balanced: { quality: 0.25, reliability: 0.25, latency: 0.25, price: 0.25 }
};
function scoreQuality(offering) {
  return Math.max(0, Math.min(1, offering.qualityScore));
}
function scoreReliability(offering) {
  if (offering.observationCount === 0)
    return 0.5;
  return Math.max(0, Math.min(1, offering.reliabilityScore));
}
function scoreLatency(offering, maxLatencyMs) {
  if (offering.latencyP95Ms === null)
    return 0.5;
  const ratio = offering.latencyP95Ms / maxLatencyMs;
  const score = 1 / (1 + Math.exp(5 * (ratio - 1)));
  return Math.max(0, Math.min(1, score));
}
function scorePrice(offering, maxPrice, minPrice) {
  const price = (offering.priceInputPerMillion + offering.priceOutputPerMillion) / 2;
  if (maxPrice === minPrice)
    return 1;
  if (price <= 0)
    return 1;
  const normalized = 1 - 0.9 * ((price - minPrice) / (maxPrice - minPrice));
  return Math.max(0.1, Math.min(1, normalized));
}
function filterOfferings(offerings, profile) {
  return offerings.filter((o) => {
    if (o.status === "offline")
      return false;
    if (o.qualityScore < profile.minQuality)
      return false;
    if (profile.blockedProviders.includes(o.providerId))
      return false;
    if (profile.maxCostPerMillionTokens !== Infinity) {
      const avgPrice = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
      if (avgPrice > profile.maxCostPerMillionTokens)
        return false;
    }
    return true;
  });
}
function scoreOfferings(offerings, profile = DEFAULT_ROUTING_PROFILE) {
  const eligible = filterOfferings(offerings, profile);
  if (eligible.length === 0)
    return [];
  const prices = eligible.map((o) => (o.priceInputPerMillion + o.priceOutputPerMillion) / 2);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const weights = WEIGHTS[profile.optimize] ?? WEIGHTS["balanced"];
  const scored = eligible.map((offering) => {
    const qualityComponent = scoreQuality(offering);
    const reliabilityComponent = scoreReliability(offering);
    const latencyComponent = scoreLatency(offering, profile.maxLatencyMs);
    const priceComponent = scorePrice(offering, maxPrice, minPrice);
    const score = weights.quality * qualityComponent + weights.reliability * reliabilityComponent + weights.latency * latencyComponent + weights.price * priceComponent;
    const preferredBonus = profile.preferredProviders.includes(offering.providerId) ? 0.1 : 0;
    return {
      offering,
      score: Math.min(1, score + preferredBonus),
      breakdown: {
        qualityComponent,
        reliabilityComponent,
        latencyComponent,
        priceComponent
      }
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}
function generateRecommendation(offerings, profile = DEFAULT_ROUTING_PROFILE, currentCostPerMillion = null) {
  const scored = scoreOfferings(offerings, profile);
  if (scored.length === 0)
    return null;
  const recommended = scored[0];
  const alternatives = scored.slice(1, 4);
  const recommendedCost = (recommended.offering.priceInputPerMillion + recommended.offering.priceOutputPerMillion) / 2;
  let savingsPercent = null;
  let savingsAbsolute = null;
  if (currentCostPerMillion !== null && currentCostPerMillion > 0) {
    savingsAbsolute = currentCostPerMillion - recommendedCost;
    savingsPercent = savingsAbsolute / currentCostPerMillion * 100;
  }
  return {
    recommended,
    alternatives,
    currentCost: currentCostPerMillion,
    recommendedCost,
    savingsPercent: savingsPercent !== null ? Math.round(savingsPercent * 10) / 10 : null,
    savingsAbsolute: savingsAbsolute !== null ? Math.round(savingsAbsolute * 100) / 100 : null
  };
}
function comparePrices(offerings, modelQuery) {
  const matching = offerings.filter((o) => {
    const query = modelQuery.toLowerCase();
    return o.model.toLowerCase().includes(query) || o.modelShort.toLowerCase().includes(query);
  });
  matching.sort((a, b) => {
    const priceA = (a.priceInputPerMillion + a.priceOutputPerMillion) / 2;
    const priceB = (b.priceInputPerMillion + b.priceOutputPerMillion) / 2;
    return priceA - priceB;
  });
  return matching;
}

// src/tools/check-price.ts
var checkPriceSchema = z.object({
  model: z.string().describe('Model name or partial match (e.g. "llama-70b", "gpt-4o", "deepseek")'),
  max_results: z.number().int().min(1).max(20).default(5).describe("Maximum number of results to return (default: 5)")
});
function handleCheckPrice(input, feedCache2) {
  const offerings = feedCache2.getOfferings();
  if (offerings.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No pricing data available. The feed may still be loading \u2014 try again in a moment."
        }
      ]
    };
  }
  const matches = comparePrices(offerings, input.model).slice(0, input.max_results);
  if (matches.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No offerings found matching "${input.model}". Available models: ${getAvailableModels(offerings)}.`
        }
      ]
    };
  }
  const rows = matches.map((o, i) => formatOfferingRow(o, i + 1));
  const cheapest = matches[0];
  const mostExpensive = matches[matches.length - 1];
  const avgCheapest = (cheapest.priceInputPerMillion + cheapest.priceOutputPerMillion) / 2;
  const avgExpensive = (mostExpensive.priceInputPerMillion + mostExpensive.priceOutputPerMillion) / 2;
  const savingsPercent = avgExpensive > 0 ? Math.round((avgExpensive - avgCheapest) / avgExpensive * 100) : 0;
  const header = `Price comparison for "${input.model}" \u2014 ${matches.length} offering${matches.length > 1 ? "s" : ""} found`;
  const footer = matches.length > 1 ? `
Cheapest is ${savingsPercent}% less than most expensive option.` : "";
  return {
    content: [
      {
        type: "text",
        text: `${header}
${"\u2500".repeat(60)}
${rows.join("\n")}${footer}`
      }
    ]
  };
}
function formatOfferingRow(o, rank) {
  const avgPrice = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
  const quant = o.quantization ? ` (${o.quantization})` : "";
  const gpu = o.gpuType ? ` on ${o.gpuType}` : "";
  const reliability = o.observationCount > 0 ? `${Math.round(o.reliabilityScore * 100)}% reliable` : "no data yet";
  return [
    `${rank}. ${o.providerName} \u2014 ${o.modelShort}${quant}${gpu}`,
    `   Input: $${o.priceInputPerMillion.toFixed(2)}/M tokens | Output: $${o.priceOutputPerMillion.toFixed(2)}/M tokens | Avg: $${avgPrice.toFixed(2)}/M`,
    `   Quality: ${(o.qualityScore * 100).toFixed(0)}% | Reliability: ${reliability} | Region: ${o.region}`
  ].join("\n");
}
function getAvailableModels(offerings) {
  const unique = [...new Set(offerings.map((o) => o.modelShort))];
  return unique.slice(0, 10).join(", ");
}

// src/tools/recommend-route.ts
import { z as z2 } from "zod";
var recommendRouteSchema = z2.object({
  model: z2.string().describe('Model name or partial match to filter offerings (e.g. "llama-70b", "gpt-4o")'),
  optimize: z2.enum(["cost", "latency", "reliability", "balanced"]).default("balanced").describe("What to optimize for (default: balanced)"),
  current_cost_per_million: z2.number().nullable().default(null).describe("What you currently pay per million tokens (avg of input+output), for savings estimate"),
  min_quality: z2.number().min(0).max(1).default(0.7).describe("Minimum acceptable quality score 0-1 (default: 0.7)"),
  max_latency_ms: z2.number().int().min(100).default(5e3).describe("Maximum acceptable P95 latency in ms (default: 5000)"),
  blocked_providers: z2.array(z2.string()).default([]).describe("Provider IDs to exclude from recommendations")
});
function handleRecommendRoute(input, feedCache2) {
  const allOfferings = feedCache2.getOfferings();
  if (allOfferings.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No pricing data available. The feed may still be loading \u2014 try again in a moment."
        }
      ]
    };
  }
  const query = input.model.toLowerCase();
  const modelOfferings = allOfferings.filter(
    (o) => o.model.toLowerCase().includes(query) || o.modelShort.toLowerCase().includes(query)
  );
  if (modelOfferings.length === 0) {
    const available = [...new Set(allOfferings.map((o) => o.modelShort))].slice(0, 10).join(", ");
    return {
      content: [
        {
          type: "text",
          text: `No offerings found matching "${input.model}". Available models: ${available}.`
        }
      ]
    };
  }
  let currentCost = input.current_cost_per_million;
  let comparisonContext = {
    autoCalculated: false,
    providerName: "",
    avgCost: 0
  };
  if (currentCost == null && modelOfferings.length >= 2) {
    let maxAvg = 0;
    let maxProvider = "";
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
  const profile = {
    optimize: input.optimize,
    minQuality: input.min_quality,
    maxLatencyMs: input.max_latency_ms,
    maxCostPerMillionTokens: Infinity,
    preferredProviders: [],
    blockedProviders: input.blocked_providers
  };
  const rec = generateRecommendation(modelOfferings, profile, currentCost);
  if (!rec) {
    return {
      content: [
        {
          type: "text",
          text: `No eligible offerings for "${input.model}" with your constraints. Try lowering min_quality or raising max_latency_ms.`
        }
      ]
    };
  }
  return {
    content: [
      {
        type: "text",
        text: formatRecommendation(rec, input.optimize, comparisonContext)
      }
    ]
  };
}
function formatRecommendation(rec, optimize, comparisonContext) {
  const r = rec.recommended;
  const o = r.offering;
  const avgPrice = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
  const quant = o.quantization ? ` (${o.quantization})` : "";
  const gpu = o.gpuType ? ` on ${o.gpuType}` : "";
  const lines = [
    `Recommendation (optimize: ${optimize})`,
    "\u2500".repeat(60),
    `Provider: ${o.providerName}`,
    `Model: ${o.modelShort}${quant}${gpu}`,
    `Price: $${o.priceInputPerMillion.toFixed(2)} input / $${o.priceOutputPerMillion.toFixed(2)} output per M tokens (avg $${avgPrice.toFixed(2)})`,
    `Score: ${(r.score * 100).toFixed(1)} (quality: ${(r.breakdown.qualityComponent * 100).toFixed(0)} | reliability: ${(r.breakdown.reliabilityComponent * 100).toFixed(0)} | latency: ${(r.breakdown.latencyComponent * 100).toFixed(0)} | price: ${(r.breakdown.priceComponent * 100).toFixed(0)})`,
    `Region: ${o.region} | Status: ${o.status}`
  ];
  if (rec.savingsPercent !== null && rec.savingsAbsolute !== null) {
    if (comparisonContext?.autoCalculated && rec.savingsAbsolute > 0) {
      lines.push(`Savings: ${rec.savingsPercent}% \u2014 $${rec.savingsAbsolute.toFixed(2)}/M cheaper than most expensive option (${comparisonContext.providerName} at $${comparisonContext.avgCost.toFixed(2)}/M)`);
    } else if (rec.savingsAbsolute > 0) {
      lines.push(`Savings: ${rec.savingsPercent}% \u2014 $${rec.savingsAbsolute.toFixed(2)}/M tokens vs your current cost`);
    } else {
      lines.push(`Your current cost ($${rec.currentCost.toFixed(2)}/M) is already cheaper than this recommendation.`);
    }
  }
  if (rec.alternatives.length > 0) {
    lines.push("", "Alternatives:");
    for (const alt of rec.alternatives) {
      const ao = alt.offering;
      const altAvg = (ao.priceInputPerMillion + ao.priceOutputPerMillion) / 2;
      const aq = ao.quantization ? ` (${ao.quantization})` : "";
      lines.push(
        `  - ${ao.providerName} ${ao.modelShort}${aq}: $${altAvg.toFixed(2)}/M avg, score ${(alt.score * 100).toFixed(1)}`
      );
    }
  }
  return lines.join("\n");
}

// src/observer.ts
var OBSERVE_URL = "https://volt-observations.volthq.workers.dev/v1/observe";
var TIMEOUT_MS = 5e3;
function isEnabled() {
  return process.env.VOLT_OBSERVATIONS !== "false";
}
function reportObservation(obs) {
  if (!isEnabled()) return;
  const body = JSON.stringify({
    providerId: obs.providerId,
    model: obs.model,
    latencyMs: obs.latencyMs,
    success: obs.success,
    errorType: obs.errorType,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  fetch(OBSERVE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS)
  }).catch(() => {
  });
}

// src/tools/get-spend.ts
import { z as z3 } from "zod";
var getSpendSchema = z3.object({
  time_range: z3.enum(["today", "7d", "30d"]).default("today").describe("Time range for the summary: today, 7d (7 days), or 30d (30 days)")
});
function handleGetSpend(input, tracker) {
  const summary = tracker.getSummary(input.time_range);
  if (summary.totalCalls === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No inference calls recorded for ${input.time_range}. Spend data is collected as you use AI providers.`
        }
      ]
    };
  }
  return {
    content: [
      {
        type: "text",
        text: formatSpendSummary(summary)
      }
    ]
  };
}
function formatSpendSummary(s) {
  const lines = [
    `Spend Summary (${s.timeRange})`,
    "\u2500".repeat(60),
    `Total spend: $${s.totalSpend.toFixed(2)}`,
    `Total calls: ${s.totalCalls}`,
    `Avg cost/call: $${s.averageCostPerCall.toFixed(4)}`,
    `Tokens: ${s.totalTokensInput.toLocaleString()} input / ${s.totalTokensOutput.toLocaleString()} output`
  ];
  const providerEntries = Object.entries(s.byProvider).sort((a, b) => b[1] - a[1]);
  if (providerEntries.length > 0) {
    lines.push("", "By Provider:");
    for (const [provider, cost] of providerEntries) {
      const pct = s.totalSpend > 0 ? Math.round(cost / s.totalSpend * 100) : 0;
      lines.push(`  ${provider}: $${cost.toFixed(2)} (${pct}%)`);
    }
  }
  const modelEntries = Object.entries(s.byModel).sort((a, b) => b[1] - a[1]);
  if (modelEntries.length > 0) {
    lines.push("", "By Model:");
    for (const [model, cost] of modelEntries) {
      const pct = s.totalSpend > 0 ? Math.round(cost / s.totalSpend * 100) : 0;
      lines.push(`  ${model}: $${cost.toFixed(2)} (${pct}%)`);
    }
  }
  return lines.join("\n");
}

// src/tools/get-savings.ts
import { z as z4 } from "zod";
var getSavingsSchema = z4.object({
  time_range: z4.enum(["today", "7d", "30d"]).default("7d").describe("Time range for the report: today, 7d (7 days), or 30d (30 days)")
});
function handleGetSavings(input, tracker) {
  const report = tracker.getSavingsReport(input.time_range);
  if (report.actualSpend === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No spend data for ${input.time_range}. Record inference calls to see savings opportunities.`
        }
      ]
    };
  }
  return {
    content: [
      {
        type: "text",
        text: formatSavingsReport(report)
      }
    ]
  };
}
function formatSavingsReport(r) {
  const lines = [
    `Savings Report (${r.timeRange})`,
    "\u2500".repeat(60),
    `Actual spend:    $${r.actualSpend.toFixed(2)}`,
    `Optimal spend:   $${r.optimalSpend.toFixed(2)}`,
    `Potential savings: ${r.savingsPercent}%`,
    "",
    `Savings achieved (followed recommendations): $${r.savingsAchieved.toFixed(2)}`,
    `Savings missed (ignored recommendations):    $${r.savingsMissed.toFixed(2)}`
  ];
  if (r.savingsMissed > 0) {
    lines.push(
      "",
      `You could save $${r.savingsMissed.toFixed(2)} by following Volt routing recommendations.`
    );
  } else if (r.savingsPercent === 0) {
    lines.push("", "You are already using the most cost-effective providers.");
  }
  return lines.join("\n");
}

// src/tools/set-budget-alert.ts
import { z as z5 } from "zod";
var setBudgetAlertSchema = z5.object({
  threshold: z5.number().positive().describe("Budget threshold in USD (e.g. 10.00 for $10)"),
  period: z5.enum(["daily", "weekly", "monthly"]).describe("Budget period: daily, weekly, or monthly")
});
function handleSetBudgetAlert(input, tracker) {
  const alert = tracker.setAlert(input.threshold, input.period);
  const allAlerts = tracker.getAlerts();
  const triggered = tracker.checkAlerts();
  const lines = [
    `Budget alert configured`,
    "\u2500".repeat(60),
    `Period: ${alert.period}`,
    `Threshold: $${alert.threshold.toFixed(2)}`,
    `Status: ${alert.enabled ? "enabled" : "disabled"}`
  ];
  if (triggered.length > 0) {
    lines.push("", "Active alerts:");
    for (const t of triggered) {
      lines.push(`  ${t.message}`);
    }
  }
  if (allAlerts.length > 1) {
    lines.push("", "All configured alerts:");
    for (const a of allAlerts) {
      lines.push(`  ${a.period}: $${a.threshold.toFixed(2)} (${a.enabled ? "on" : "off"})`);
    }
  }
  return {
    content: [
      {
        type: "text",
        text: lines.join("\n")
      }
    ]
  };
}

// src/version-check.ts
var currentVersion = true ? "0.1.25" : "0.0.0";
async function checkForUpdate() {
  try {
    const res = await fetch(
      "https://registry.npmjs.org/volthq-mcp-server/latest",
      { signal: AbortSignal.timeout(3e3) }
    );
    if (!res.ok) return;
    const data = await res.json();
    const latest = data.version;
    if (!latest) return;
    if (typeof latest !== "string") return;
    if (latest === currentVersion) return;
    const latestParts = latest.split(".");
    const currentParts = currentVersion.split(".");
    const latestMajor = parseInt(latestParts[0] ?? "", 10);
    const latestMinor = parseInt(latestParts[1] ?? "", 10);
    const latestPatch = parseInt(latestParts[2] ?? "", 10);
    const currentMajor = parseInt(currentParts[0] ?? "", 10);
    const currentMinor = parseInt(currentParts[1] ?? "", 10);
    const currentPatch = parseInt(currentParts[2] ?? "", 10);
    if ([latestMajor, latestMinor, latestPatch, currentMajor, currentMinor, currentPatch].some(isNaN)) return;
    const shouldNudge = latestMajor > currentMajor || latestMajor === currentMajor && latestMinor > currentMinor || latestMajor === currentMajor && latestMinor === currentMinor && latestPatch - currentPatch >= 3;
    if (!shouldNudge) return;
    process.stderr.write(
      `
\u26A1 Volt HQ update available: ${latest} (current: ${currentVersion})
   Run: npx volthq-mcp-server@latest or npm i -g volthq-mcp-server@latest

`
    );
  } catch {
  }
}

// src/index.ts
if (process.argv.includes("--setup")) {
  runSetup();
  process.exit(0);
}
var feedCache = new FeedCache();
var spendTracker = new SpendTracker(feedCache);
checkForUpdate();
var server = new McpServer({
  name: "volthq",
  version: "0.1.0"
});
var firstCallFired = false;
function buildFirstRunMessage(queriedModel) {
  const offerings = feedCache.getOfferings();
  if (offerings.length === 0) return null;
  const providerCount = new Set(offerings.map((o) => o.providerId)).size;
  const offeringCount = offerings.length;
  const header = `\u26A1 Volt HQ \u2014 tracking ${offeringCount} offerings across ${providerCount} providers in real time.`;
  const divider = `
Run volt_recommend_route to get a recommendation based on your quality and latency needs.
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`;
  if (queriedModel) {
    const q = queriedModel.toLowerCase();
    const matches = offerings.filter(
      (o) => o.modelShort.toLowerCase().includes(q) || o.model.toLowerCase().includes(q)
    );
    if (matches.length >= 2) {
      const groups2 = /* @__PURE__ */ new Map();
      for (const o of matches) {
        const key = o.modelShort;
        const list = groups2.get(key) ?? [];
        list.push(o);
        groups2.set(key, list);
      }
      let bestGroup = [];
      let bestSpread2 = 0;
      for (const [, group] of groups2) {
        if (group.length < 2) continue;
        const sorted = [...group].sort(
          (a, b) => (a.priceInputPerMillion + a.priceOutputPerMillion) / 2 - (b.priceInputPerMillion + b.priceOutputPerMillion) / 2
        );
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const cheapAvg = (first.priceInputPerMillion + first.priceOutputPerMillion) / 2;
        const expAvg = (last.priceInputPerMillion + last.priceOutputPerMillion) / 2;
        const spread = cheapAvg > 0 ? expAvg / cheapAvg : 0;
        if (spread > bestSpread2) {
          bestSpread2 = spread;
          bestGroup = sorted;
        }
      }
      if (bestGroup.length >= 3) {
        const midIdx = Math.floor(bestGroup.length / 2);
        const medianAvg = (bestGroup[midIdx].priceInputPerMillion + bestGroup[midIdx].priceOutputPerMillion) / 2;
        if (medianAvg > 0) {
          bestGroup = bestGroup.filter((o) => {
            const avg = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
            return avg / medianAvg <= 10;
          });
          if (bestGroup.length >= 2) {
            const cAvg = (bestGroup[0].priceInputPerMillion + bestGroup[0].priceOutputPerMillion) / 2;
            const eAvg = (bestGroup[bestGroup.length - 1].priceInputPerMillion + bestGroup[bestGroup.length - 1].priceOutputPerMillion) / 2;
            bestSpread2 = cAvg > 0 ? eAvg / cAvg : 0;
          }
        }
      }
      if (bestGroup.length >= 2) {
        const cheapest = bestGroup[0];
        const expensive = bestGroup[bestGroup.length - 1];
        if (bestSpread2 >= 2) {
          return `${header}

${cheapest.modelShort}: $${cheapest.priceInputPerMillion.toFixed(2)}/$${cheapest.priceOutputPerMillion.toFixed(2)} per M tokens on ${cheapest.providerName} vs $${expensive.priceInputPerMillion.toFixed(2)}/$${expensive.priceOutputPerMillion.toFixed(2)} on ${expensive.providerName}.${divider}`;
        } else if (bestSpread2 >= 1.1) {
          return `${header}

${cheapest.modelShort} pricing is within ${bestSpread2.toFixed(1)}x across ${bestGroup.length} providers.${divider}`;
        } else {
          return `${header}

${cheapest.modelShort} pricing is nearly identical across ${bestGroup.length} providers.${divider}`;
        }
      }
    }
    if (matches.length === 1) {
      const o = matches[0];
      return `${header}

${o.modelShort} is currently only on ${o.providerName} at $${o.priceInputPerMillion.toFixed(2)}/$${o.priceOutputPerMillion.toFixed(2)} per M tokens in our feed.
Run volt_check_price with other models to compare alternatives.
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`;
    }
  }
  const groups = /* @__PURE__ */ new Map();
  for (const o of offerings) {
    const avg = (o.priceInputPerMillion + o.priceOutputPerMillion) / 2;
    const list = groups.get(o.modelShort) ?? [];
    list.push(avg);
    groups.set(o.modelShort, list);
  }
  let bestModel = "";
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
  const genericFooter = `
Run volt_check_price with any model to compare providers.
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`;
  if (bestModel) {
    return `${header}
Biggest spread right now: ${bestModel} ranges from $${bestMin.toFixed(2)}/M to $${bestMax.toFixed(2)}/M (${bestSpread.toFixed(1)}x).${genericFooter}`;
  }
  return `${header}${genericFooter}`;
}
function maybeAddFirstRun(result, queriedModel) {
  if (firstCallFired) return result;
  firstCallFired = true;
  const message = buildFirstRunMessage(queriedModel);
  if (!message) return result;
  const first = result.content[0];
  if (first) first.text = message + "\n\n" + first.text;
  return result;
}
server.tool(
  "volt_check_price",
  "Compare pricing across providers for a given model. Returns offerings sorted by price with quality and reliability data.",
  checkPriceSchema.shape,
  async (input) => {
    const start = Date.now();
    const parsed = checkPriceSchema.parse(input);
    const result = handleCheckPrice(parsed, feedCache);
    const offerings = feedCache.getOfferings();
    const matches = offerings.filter(
      (o) => o.model.toLowerCase().includes(parsed.model.toLowerCase()) || o.modelShort.toLowerCase().includes(parsed.model.toLowerCase())
    );
    for (const o of matches.slice(0, 5)) {
      reportObservation({
        providerId: o.providerId,
        model: o.model,
        latencyMs: Date.now() - start,
        success: true
      });
    }
    return maybeAddFirstRun(result, parsed.model);
  }
);
server.tool(
  "volt_recommend_route",
  "Get the optimal provider recommendation for a model based on cost, latency, reliability, or balanced optimization. Shows savings vs your current cost.",
  recommendRouteSchema.shape,
  async (input) => {
    const start = Date.now();
    const parsed = recommendRouteSchema.parse(input);
    const result = handleRecommendRoute(parsed, feedCache);
    const offerings = feedCache.getOfferings();
    const matches = offerings.filter(
      (o) => o.model.toLowerCase().includes(parsed.model.toLowerCase()) || o.modelShort.toLowerCase().includes(parsed.model.toLowerCase())
    );
    if (matches[0]) {
      reportObservation({
        providerId: matches[0].providerId,
        model: matches[0].model,
        latencyMs: Date.now() - start,
        success: true
      });
    }
    return maybeAddFirstRun(result, parsed.model);
  }
);
server.tool(
  "volt_get_spend",
  "Get spending summary by provider and model for today, 7 days, or 30 days.",
  getSpendSchema.shape,
  async (input) => maybeAddFirstRun(handleGetSpend(getSpendSchema.parse(input), spendTracker))
);
server.tool(
  "volt_get_savings",
  "Compare actual spend against optimal routing. Shows savings achieved and savings missed.",
  getSavingsSchema.shape,
  async (input) => maybeAddFirstRun(handleGetSavings(getSavingsSchema.parse(input), spendTracker))
);
server.tool(
  "volt_set_budget_alert",
  "Set a budget threshold for daily, weekly, or monthly spend. Alerts when exceeded.",
  setBudgetAlertSchema.shape,
  async (input) => maybeAddFirstRun(handleSetBudgetAlert(setBudgetAlertSchema.parse(input), spendTracker))
);
async function main() {
  feedCache.start();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch((err) => {
  console.error("Volt HQ MCP server failed to start:", err);
  process.exit(1);
});
