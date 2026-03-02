/**
 * Memphis Doctor — Health Check Command
 * Diagnoses common issues and suggests fixes
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { MEMPHIS_HOME, CONFIG_PATH, CHAINS_PATH } from "../../config/defaults.js";
import { log } from "../../utils/logger.js";
import { detectEnvironment, checkEmbeddingsSupport } from "../../utils/environment.js";
import chalk from "chalk";
import { execSync } from "child_process";

export interface HealthCheck {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  fix?: string;
}

export async function doctorCommand(options: { json?: boolean }) {
  const checks: HealthCheck[] = [];
  
  // ─── Node.js Check ────────────────────────────────────────────────
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1).split(".")[0]);
  
  if (nodeMajor >= 18) {
    checks.push({
      name: "Node.js",
      status: "ok",
      message: `${nodeVersion} (supported)`
    });
  } else {
    checks.push({
      name: "Node.js",
      status: "error",
      message: `${nodeVersion} (requires 18+)`,
      fix: "Update Node.js to version 18 or higher"
    });
  }

  // ─── Config File Check ─────────────────────────────────────────────
  if (existsSync(CONFIG_PATH)) {
    try {
      const config = readFileSync(CONFIG_PATH, "utf8");
      
      // Check for provider config
      if (config.includes("providers:")) {
        checks.push({
          name: "Config File",
          status: "ok",
          message: `Found at ${CONFIG_PATH}`
        });
        
        // Check for provider
        if (config.includes("ollama:") || config.includes("openai:") || config.includes("zai:")) {
          checks.push({
            name: "Provider Config",
            status: "ok",
            message: "Provider configured"
          });
        } else {
          checks.push({
            name: "Provider Config",
            status: "error",
            message: "No provider configured",
            fix: "Run 'memphis init' to configure a provider"
          });
        }
        
        // Check for model
        if (config.includes("model:")) {
          checks.push({
            name: "Model Config",
            status: "ok",
            message: "Model specified"
          });
        } else {
          checks.push({
            name: "Model Config",
            status: "warning",
            message: "No model specified",
            fix: "Add 'model: <model-name>' to config"
          });
        }
      } else {
        checks.push({
          name: "Config File",
          status: "error",
          message: "Invalid config (no providers section)",
          fix: "Run 'memphis init' to regenerate config"
        });
      }
    } catch (error) {
      checks.push({
        name: "Config File",
        status: "error",
        message: `Cannot read config: ${error}`,
        fix: "Check file permissions or run 'memphis init'"
      });
    }
  } else {
    checks.push({
      name: "Config File",
      status: "error",
      message: "Not found",
      fix: "Run 'memphis init' to create config"
    });
  }

  // ─── Environment Detection ─────────────────────────────────────────
  const env = detectEnvironment();
  
  // Ollama check
  if (env.ollamaDetected) {
    checks.push({
      name: "Ollama",
      status: "ok",
      message: `Running at ${env.ollamaUrl} (${env.ollamaModels.length} models)`
    });
  } else {
    checks.push({
      name: "Ollama",
      status: "warning",
      message: "Not detected",
      fix: "Install Ollama or use cloud provider (ZAI/OpenAI)"
    });
  }

  // ─── Provider Connectivity ─────────────────────────────────────────
  if (env.ollamaDetected) {
    try {
      const response = execSync(`curl -s ${env.ollamaUrl}/api/tags`, { 
        timeout: 2000,
        encoding: "utf8" 
      });
      checks.push({
        name: "Provider Connection",
        status: "ok",
        message: "Ollama API responding"
      });
    } catch {
      checks.push({
        name: "Provider Connection",
        status: "error",
        message: "Ollama API not responding",
        fix: "Start Ollama service or check URL"
      });
    }
  }

  // ─── Embeddings Check ──────────────────────────────────────────────
  const embeddingsSupport = checkEmbeddingsSupport(env);
  
  if (embeddingsSupport.available) {
    checks.push({
      name: "Embeddings",
      status: "ok",
      message: `Model: ${embeddingsSupport.model}`
    });
  } else {
    checks.push({
      name: "Embeddings",
      status: "warning",
      message: "No embedding model found",
      fix: "Run 'ollama pull nomic-embed-text' to enable semantic search"
    });
  }

  // ─── Chains Directory Check ────────────────────────────────────────
  if (existsSync(CHAINS_PATH)) {
    try {
      const chains = ["journal", "ask", "decision", "summary"];
      let totalBlocks = 0;
      
      for (const chain of chains) {
        const chainPath = join(CHAINS_PATH, chain);
        if (existsSync(chainPath)) {
          const files = execSync(`find ${chainPath} -name "*.json" | wc -l`, {
            encoding: "utf8"
          });
          totalBlocks += parseInt(files.trim());
        }
      }
      
      checks.push({
        name: "Memory Chains",
        status: "ok",
        message: `${totalBlocks} blocks stored`
      });
    } catch {
      checks.push({
        name: "Memory Chains",
        status: "warning",
        message: "Cannot count blocks"
      });
    }
  } else {
    checks.push({
      name: "Memory Chains",
      status: "error",
      message: "Chains directory not found",
      fix: "Run 'memphis init' to create directory structure"
    });
  }

  // ─── API Keys Check ────────────────────────────────────────────────
  const apiKeys = {
    "OpenAI": env.openaiKey,
    "ZAI": env.zaiKey,
    "MiniMax": env.minimaxKey,
    "OpenRouter": env.openrouterKey
  };
  
  const availableKeys = Object.entries(apiKeys).filter(([_, v]) => v).map(([k]) => k);
  
  if (availableKeys.length > 0) {
    checks.push({
      name: "API Keys",
      status: "ok",
      message: `${availableKeys.length} found: ${availableKeys.join(", ")}`
    });
  } else {
    checks.push({
      name: "API Keys",
      status: "warning",
      message: "No API keys found",
      fix: "Set environment variables or use Ollama (offline)"
    });
  }

  // ─── Output Results ────────────────────────────────────────────────
  if (options.json) {
    console.log(JSON.stringify(checks, null, 2));
    return;
  }

  console.log(chalk.bold.cyan("\n╔═══════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║") + "              " + chalk.bold.white("Memphis Doctor — Health Check 🏥") + "           " + chalk.bold.cyan("║"));
  console.log(chalk.bold.cyan("╚═══════════════════════════════════════════════════════════╝\n"));

  const statusIcon = {
    "ok": chalk.green("✓"),
    "warning": chalk.yellow("⚠"),
    "error": chalk.red("✗")
  };

  for (const check of checks) {
    const icon = statusIcon[check.status];
    console.log(`${icon} ${chalk.bold(check.name)}: ${check.message}`);
    
    if (check.fix) {
      console.log(chalk.gray(`  → Fix: ${check.fix}`));
    }
  }

  console.log("");

  // ─── Summary ──────────────────────────────────────────────────────
  const errors = checks.filter(c => c.status === "error").length;
  const warnings = checks.filter(c => c.status === "warning").length;
  const okays = checks.filter(c => c.status === "ok").length;

  if (errors === 0 && warnings === 0) {
    console.log(chalk.bold.green("✓ All systems healthy!") + ` ${okays}/${checks.length} checks passed\n`);
  } else if (errors === 0) {
    console.log(chalk.bold.yellow("⚠ Some warnings") + ` — ${okays} passed, ${warnings} warnings\n`);
  } else {
    console.log(chalk.bold.red("✗ Issues found") + ` — ${errors} errors, ${warnings} warnings, ${okays} passed\n`);
    console.log(chalk.gray("Run suggested fixes above to resolve issues.\n"));
  }
}
