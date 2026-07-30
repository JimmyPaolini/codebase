#!/usr/bin/env tsx

/**
 * Sync VS Code extensions from .vscode/extensions.json into both devcontainer configs.
 *
 * Source: .vscode/extensions.json
 *   - recommendations: Extensions to recommend (gets copied to BOTH arrays below)
 *   - unwantedRecommendations: Extensions to discourage
 *
 * Targets:
 *   - .devcontainer/local/devcontainer.json
 *   - .devcontainer/cloud/devcontainer.json
 *
 * Each target receives:
 *   - extensions: Auto-installed in devcontainers (copied from recommendations)
 *   - recommendations: Shown as suggestions (copied from recommendations)
 *   - unwantedRecommendations: Extensions to discourage (copied as-is)
 *
 * Usage: tsx .devcontainer/scripts/sync-vscode-extensions.ts [check|write]
 *   check (default): Validate that both configs are in sync with extensions.json, exit 1 if not
 *   write: Update both devcontainer.json files from extensions.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import JSON5 from "json5";
import _ from "lodash";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.join(__dirname, "../..");
const EXTENSIONS_FILE = path.join(WORKSPACE_ROOT, ".vscode/extensions.json");
const DEVCONTAINER_FILES = [
  path.join(WORKSPACE_ROOT, ".devcontainer/local/devcontainer.json"),
  path.join(WORKSPACE_ROOT, ".devcontainer/cloud/devcontainer.json"),
];
const MODE = process.argv[2] || "check";

interface ExtensionsJson {
  recommendations: string[];
  unwantedRecommendations: string[];
}

interface DevcontainerJson {
  customizations: {
    vscode: {
      extensions: string[];
      recommendations: string[];
      unwantedRecommendations: string[];
    };
  };
}

function showDifference(source: string[], target: string[]): void {
  const missing = _.difference(source, target);
  const extra = _.difference(target, source);

  if (missing.length > 0) {
    console.log(`  Missing in devcontainer.json (${missing.length} items):`);
    missing.forEach((item) => console.log(`    + ${item}`));
  }
  if (extra.length > 0) {
    console.log(`  Extra in devcontainer.json (${extra.length} items):`);
    extra.forEach((item) => console.log(`    - ${item}`));
  }
}

function checkSync(
  extensions: ExtensionsJson,
  devcontainer: DevcontainerJson,
  devcontainerFile: string,
): boolean {
  const label = path.relative(WORKSPACE_ROOT, devcontainerFile);
  const { recommendations, unwantedRecommendations } = extensions;
  const {
    extensions: devcontainerExtensions,
    recommendations: devcontainerRecommendations,
    unwantedRecommendations: devcontainerUnwantedRecommendations,
  } = devcontainer.customizations.vscode;

  // Both extensions and recommendations in devcontainer should match recommendations from extensions.json
  const extensionsMatch = _.isEqual(
    _.sortBy([...recommendations]),
    _.sortBy([...devcontainerExtensions]),
  );
  const recommendationsMatch = _.isEqual(
    _.sortBy([...recommendations]),
    _.sortBy([...devcontainerRecommendations]),
  );
  const unwantedRecommendationsMatch = _.isEqual(
    _.sortBy([...unwantedRecommendations]),
    _.sortBy([...devcontainerUnwantedRecommendations]),
  );

  if (
    !extensionsMatch ||
    !recommendationsMatch ||
    !unwantedRecommendationsMatch
  ) {
    console.log(`❌ VS Code extensions are out of sync in ${label}\n`);
    if (!extensionsMatch) {
      console.log(
        "🔧 Differences in devcontainer extensions (should match recommendations):",
      );
      showDifference(recommendations, devcontainerExtensions);
      console.log("");
    }
    if (!recommendationsMatch) {
      console.log(
        "📋 Differences in devcontainer recommendations (should match recommendations):",
      );
      showDifference(recommendations, devcontainerRecommendations);
      console.log("");
    }
    if (!unwantedRecommendationsMatch) {
      console.log("🚫 Differences in unwantedRecommendations:");
      showDifference(
        unwantedRecommendations,
        devcontainerUnwantedRecommendations,
      );
      console.log("");
    }
    console.log(
      "💡 Run 'nx run codebase:sync-vscode-extensions:write' to sync both devcontainer configs",
    );
    return false;
  }
  return true;
}

function writeSync(
  extensions: ExtensionsJson,
  devcontainer: DevcontainerJson,
  devcontainerFile: string,
): void {
  const label = path.relative(WORKSPACE_ROOT, devcontainerFile);
  console.log(`🔄 Syncing extensions to ${label}...`);
  // Copy recommendations to both extensions and recommendations in devcontainer
  devcontainer.customizations.vscode.extensions = extensions.recommendations;
  devcontainer.customizations.vscode.recommendations =
    extensions.recommendations;
  devcontainer.customizations.vscode.unwantedRecommendations =
    extensions.unwantedRecommendations;
  writeFileSync(
    devcontainerFile,
    `${JSON.stringify(devcontainer, null, 2)}\n`,
    "utf8",
  );
  console.log(`✅ Extensions synced to ${label}`);
}

function main(): void {
  const extensions: ExtensionsJson = JSON5.parse(
    readFileSync(EXTENSIONS_FILE, "utf8"),
  );

  if (MODE === "check") {
    let allInSync = true;
    for (const devcontainerFile of DEVCONTAINER_FILES) {
      const devcontainer: DevcontainerJson = JSON5.parse(
        readFileSync(devcontainerFile, "utf8"),
      );
      if (!checkSync(extensions, devcontainer, devcontainerFile)) {
        allInSync = false;
      }
    }
    if (!allInSync) process.exit(1);
    console.log(
      "✅ VS Code extensions are in sync with both devcontainer configurations",
    );
  } else if (MODE === "write") {
    for (const devcontainerFile of DEVCONTAINER_FILES) {
      const devcontainer: DevcontainerJson = JSON5.parse(
        readFileSync(devcontainerFile, "utf8"),
      );
      if (checkSync(extensions, devcontainer, devcontainerFile)) {
        const label = path.relative(WORKSPACE_ROOT, devcontainerFile);
        console.log(`✅ ${label} already in sync`);
      } else {
        writeSync(extensions, devcontainer, devcontainerFile);
      }
    }
  } else {
    console.error(`❌ Invalid mode: ${MODE}`);
    console.error(
      "💡 Usage: tsx .devcontainer/scripts/sync-vscode-extensions.ts [check|write]",
    );
    process.exit(1);
  }
}

main();
