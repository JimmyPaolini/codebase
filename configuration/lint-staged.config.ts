/**
 * Lint-staged configuration — runs checks on staged files during pre-commit.
 *
 * Each key is a glob pattern matching staged files, and its handler returns
 * an array of commands to run. Uses `nx affected` to scope checks to the
 * projects that own the changed files, plus codebase-level checks.
 *
 * Invoked by Husky's pre-commit hook via `npx lint-staged`.
 */
import path from "node:path";

import { SYNC_AGENT_SKILLS_FILES } from "../tools/synchronization/src/modules/agent-skills/agent-skills.constants.ts";
import { SYNC_CONFORMANCE_GENERATORS_FILES } from "../tools/synchronization/src/modules/conformance-generators/conformance-generators.constants.ts";
import { SYNC_CONVENTIONAL_CONFIG_FILES } from "../tools/synchronization/src/modules/conventional-config/conventional-config.constants.ts";
import { SYNC_PULL_REQUEST_TEMPLATE_FILES } from "../tools/synchronization/src/modules/pull-request-template/pull-request-template.constants.ts";

/**
 * How many tasks one `nx affected` run may execute at once.
 *
 * A change under `configuration/` belongs to the root project, and every
 * project depends on the shared configuration, so one such path expands
 * `affected` from a handful of projects to all of them. Left unbounded, the
 * resulting fan-out exhausts memory and the operating system kills the run,
 * which surfaces only as lint-staged's "Task failed to spawn: undefined".
 */
const ANALYSIS_PARALLELISM = 2;

/** Joins staged paths into the workspace-relative list `--files` expects. */
function getRelativePaths(files: string[]): string {
  return files.map((file) => path.relative(process.cwd(), file)).join(",");
}

const config = {
  // 🔒 Lockfile integrity
  // When package.json or workspace config changes, verify the lockfile is in sync
  "**/package.json": (): string[] => [
    "./scripts/check-lockfile.sh",
    "pnpm exec nx run codebase:syncpack:check --outputStyle=static",
  ],
  "pnpm-workspace.yaml": (): string[] => ["./scripts/check-lockfile.sh"],

  // 🧹 Unused-code analysis configuration
  // Re-run the abstract clean target when the Knip config changes
  "configuration/knip.config.ts": (): string[] => [
    "pnpm exec nx run codebase:clean:check --outputStyle=static",
  ],

  // Run full advisory fallow suite when fallow config changes
  "configuration/fallow.config.jsonc": (): string[] => [
    "pnpm exec nx run codebase:fallow-dead-code --outputStyle=static",
    "pnpm exec nx run codebase:fallow-duplicates --outputStyle=static",
    "pnpm exec nx run codebase:fallow-health --outputStyle=static",
    "pnpm exec nx run codebase:fallow-audit --outputStyle=static",
  ],

  // 🔄 Config synchronization
  // Keep VS Code extensions list in sync between .vscode and local devcontainer config
  "{.vscode/extensions.json,.devcontainer/local/devcontainer.json}":
    (): string[] => [
      "pnpm exec nx run codebase:sync-vscode-extensions:check --outputStyle=static",
    ],

  // Keep cloud devcontainer config in sync with local config for common fields
  "{.devcontainer/cloud/devcontainer.json,.devcontainer/local/devcontainer.json}":
    (): string[] => [
      "pnpm exec nx run synchronization:start:devcontainer-configuration-check --outputStyle=static",
    ],

  // Keep conventional commit types/scopes consistent across config, settings, docs, and issue templates
  [`{${SYNC_CONVENTIONAL_CONFIG_FILES.join(",")}}`]: (): string[] => [
    "pnpm exec nx run synchronization:start:conventional-config-check --outputStyle=static",
  ],

  // Keep PR template in sync across skills and prompt files
  [`{${SYNC_PULL_REQUEST_TEMPLATE_FILES.join(",")}}`]: (): string[] => [
    "pnpm exec nx run synchronization:start:pull-request-template-check --outputStyle=static",
  ],

  // Keep agent skills table of contents in sync in AGENTS.md
  [`{${SYNC_AGENT_SKILLS_FILES.join(",")}}`]: (): string[] => [
    "pnpm exec nx run synchronization:start:agent-skills-check --outputStyle=static",
  ],

  // Keep conformance generators table in sync in AGENTS.md
  [`{${SYNC_CONFORMANCE_GENERATORS_FILES.join(",")}}`]: (): string[] => [
    "pnpm exec nx run synchronization:start:conformance-generators-check --outputStyle=static",
  ],

  // 🔬 Static analysis and conformetry validation
  // One `nx affected` run over every staged path, on the same `analyze-code`
  // target the Analyze Code workflow runs, so what passes here passes there.
  // Nx skips a target a project does not define and cache-hits one whose
  // inputs did not change, which is what makes a single union cheaper than
  // the per-extension fan-out this replaces.
  //
  // Conformetry validates the whole workspace on every commit: generated
  // instances need not match a template-pattern glob to have drifted.
  // `nx sync:check` runs from the Husky hook instead: it needs NX_DAEMON=false,
  // and lint-staged spawns commands without a shell, so an environment prefix
  // here would be parsed as the executable name.
  "*": (files: string[]): string[] => [
    `pnpm exec nx affected --target=analyze-code --configuration=check --parallel=${String(ANALYSIS_PARALLELISM)} --outputStyle=static --files=${getRelativePaths(files)}`,
    "pnpm exec nx run codebase:conformetry-validate --outputStyle=static",
  ],
};

export default config;
