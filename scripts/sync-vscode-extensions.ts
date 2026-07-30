#!/usr/bin/env tsx

/**
 * Sync VS Code extensions from .vscode/extensions.json into both devcontainer configs.
 *
 * Source: .vscode/extensions.json
 *   - recommendations: Extensions to recommend (gets copied to BOTH arrays below)
 *   - unwantedRecommendations: Extensions to discourage.
 *
 * Targets:
 *   - .devcontainer/local/devcontainer.json
 *   - .devcontainer/cloud/devcontainer.json.
 *
 * Each target receives:
 *   - extensions: Auto-installed in devcontainers (copied from recommendations)
 *   - recommendations: Shown as suggestions (copied from recommendations)
 *   - unwantedRecommendations: Extensions to discourage (copied as-is).
 *
 * Usage: tsx scripts/sync-vscode-extensions.ts [check|write]
 *   check (default): Validate that both configs are in sync with extensions.json, exit 1 if not
 *   write: Update both devcontainer.json files from extensions.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import JSON5 from "json5";
import _ from "lodash";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.join(__dirname, "..");
const EXTENSIONS_FILE = path.join(WORKSPACE_ROOT, ".vscode/extensions.json");
const DEVCONTAINER_FILES = [
  path.join(WORKSPACE_ROOT, ".devcontainer/local/devcontainer.json"),
  path.join(WORKSPACE_ROOT, ".devcontainer/cloud/devcontainer.json"),
];
const MODE = process.argv[2] || "check";

/**
 * Minimal devcontainer shape used to compare and update VS Code extension lists.
 */
interface DevcontainerJson {
  customizations: {
    vscode: {
      extensions: string[];
      recommendations: string[];
      unwantedRecommendations: string[];
    };
  };
}

/**
 * Canonical extension recommendation lists loaded from .vscode/extensions.json.
 */
interface ExtensionsJson {
  recommendations: string[];
  unwantedRecommendations: string[];
}

/**
 * Compares one devcontainer's extension fields against the canonical extension lists.
 */
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
    if (!extensionsMatch)
      reportExtensionsDiff(recommendations, devcontainerExtensions);
    if (!recommendationsMatch)
      reportRecommendationsDiff(recommendations, devcontainerRecommendations);
    if (!unwantedRecommendationsMatch)
      reportUnwantedRecommendationsDiff(
        unwantedRecommendations,
        devcontainerUnwantedRecommendations,
      );
    console.log(
      "💡 Run 'nx run codebase:sync-vscode-extensions:write' to sync both devcontainer configs",
    );
    return false;
  }
  return true;
}

/**
 * Verifies both devcontainer files are synchronized with .vscode/extensions.json.
 */
function handleCheckMode(extensions: ExtensionsJson): void {
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
}

/**
 * Writes extension updates to each devcontainer file when mismatches are detected.
 */
function handleWriteMode(extensions: ExtensionsJson): void {
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
}

/**
 * Script entrypoint that reads the source extension manifest and runs the selected mode.
 */
function main(): void {
  const extensions: ExtensionsJson = JSON5.parse(
    readFileSync(EXTENSIONS_FILE, "utf8"),
  );

  if (MODE === "check") {
    handleCheckMode(extensions);
  } else if (MODE === "write") {
    handleWriteMode(extensions);
  } else {
    console.error(`❌ Invalid mode: ${MODE}`);
    console.error(
      "💡 Usage: tsx scripts/sync-vscode-extensions.ts [check|write]",
    );
    process.exit(1);
  }
}

/**
 * Reports differences for the auto-installed devcontainer extension list.
 */
function reportExtensionsDiff(
  recommendations: string[],
  devcontainerExtensions: string[],
): void {
  console.log(
    "🔧 Differences in devcontainer extensions (should match recommendations):",
  );
  showDifference(recommendations, devcontainerExtensions);
  console.log("");
}

/**
 * Reports differences for the devcontainer recommendations list.
 */
function reportRecommendationsDiff(
  recommendations: string[],
  devcontainerRecommendations: string[],
): void {
  console.log(
    "📋 Differences in devcontainer recommendations (should match recommendations):",
  );
  showDifference(recommendations, devcontainerRecommendations);
  console.log("");
}

/**
 * Reports differences for the devcontainer unwantedRecommendations list.
 */
function reportUnwantedRecommendationsDiff(
  unwantedRecommendations: string[],
  devcontainerUnwantedRecommendations: string[],
): void {
  console.log("🚫 Differences in unwantedRecommendations:");
  showDifference(unwantedRecommendations, devcontainerUnwantedRecommendations);
  console.log("");
}

/**
 * Prints missing and extra extension identifiers for a compared list.
 */
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

/**
 * Updates a devcontainer file so its extension fields match the source manifest.
 */
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

main();
