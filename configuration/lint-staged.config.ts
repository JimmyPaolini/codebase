/**
 * Lint-staged configuration — runs checks on staged files during pre-commit.
 *
 * Each key is a glob pattern matching staged files, and its handler returns
 * an array of commands to run. Uses `nx affected` to scope checks to the
 * projects that own the changed files, plus monorepo-level checks.
 *
 * Invoked by Husky's pre-commit hook via `npx lint-staged`.
 */
import path from "node:path";

import { CONFORMANCE_PATTERNS } from "../tools/conformance/src/constants";
import { SYNC_AGENT_SKILLS_FILES } from "../tools/synchronization/src/modules/agent-skills/agent-skills.constants";
import { SYNC_CONFORMANCE_GENERATORS_FILES } from "../tools/synchronization/src/modules/conformance-generators/conformance-generators.constants";
import { SYNC_CONVENTIONAL_CONFIG_FILES } from "../tools/synchronization/src/modules/conventional-config/conventional-config.constants";
import { SYNC_PULL_REQUEST_TEMPLATE_FILES } from "../tools/synchronization/src/modules/pull-request-template/pull-request-template.constants";

/**
 * Convert absolute staged paths into workspace-relative comma-separated paths
 * for `nx affected --files`.
 */
function getPaths(files: string[]): string {
  return files.map((file) => path.relative(process.cwd(), file)).join(",");
}

const config = {
  // 🔒 Lockfile integrity
  // When package.json or workspace config changes, verify the lockfile is in sync
  "**/package.json": (): string[] => [
    "./scripts/check-lockfile.sh",
    "pnpm exec nx run monorepo:syncpack:check --outputStyle=static",
  ],
  "pnpm-workspace.yaml": (): string[] => ["./scripts/check-lockfile.sh"],

  // 🧹 Unused-code analysis configuration
  // Re-run the abstract clean target when the Knip config changes
  "configuration/knip.config.ts": (): string[] => [
    "pnpm exec nx run monorepo:clean:check --outputStyle=static",
  ],

  // Run full advisory fallow suite when fallow config changes
  "configuration/fallow.config.jsonc": (): string[] => [
    "pnpm exec nx run monorepo:fallow-dead-code --outputStyle=static",
    "pnpm exec nx run monorepo:fallow-duplicates --outputStyle=static",
    "pnpm exec nx run monorepo:fallow-health --outputStyle=static",
    "pnpm exec nx run monorepo:fallow-audit --outputStyle=static",
  ],

  // 🔄 Config synchronization
  // Keep VS Code extensions list in sync between .vscode and local devcontainer config
  "{.vscode/extensions.json,.devcontainer/local/devcontainer.json}":
    (): string[] => [
      "pnpm exec nx run monorepo:sync-vscode-extensions:check --outputStyle=static",
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

  // 📝 TypeScript / JavaScript source files
  // Runs format (oxfmt + prettier), lint (eslint + oxlint), typecheck, spell-check,
  // and clean (Knip + jscpd advisory checks) on affected projects.
  // nx affected includes monorepo when root-level files change.
  "*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}": (files: string[]): string[] => {
    return [
      `pnpm exec nx affected --target=clean,format,lint,typecheck,spell-check,fallow-dead-code --configuration=check --outputStyle=static --files=${getPaths(files)}`,
      "pnpm exec nx run monorepo:fallow-duplicates --outputStyle=static",
    ];
  },

  // 📓 Jupyter notebooks
  // Strip outputs first (nbstripout modifies in-place; lint-staged re-stages the
  // clean file), then run Ruff format/lint, typecheck, dead-code analysis, and spell-check.
  "*.ipynb": (files: string[]): string[] => {
    return [
      `pnpm exec nx affected --target=nbstripout --configuration=check --outputStyle=static --files=${getPaths(files)}`,
      `pnpm exec nx affected --target=clean,format,lint,typecheck,spell-check --configuration=check --outputStyle=static --files=${getPaths(files)}`,
    ];
  },

  // 🐍 Python files
  // Runs format (Ruff), lint (Ruff), typecheck, spell-check, and clean (Vulture for Python)
  "*.py": (files: string[]): string[] => {
    return [
      `pnpm exec nx affected --target=clean,format,lint,spell-check,typecheck --configuration=check --outputStyle=static --files=${getPaths(files)}`,
    ];
  },

  // 📋 JSON / HTML data files
  // Runs format, lint, and spell-check
  "*.{json,jsonc,json5,html}": (files: string[]): string[] => {
    return [
      `pnpm exec nx affected --target=format,lint,spell-check --configuration=check --outputStyle=static --files=${getPaths(files)}`,
    ];
  },

  // 🎨 CSS files
  // Runs Stylelint, format, lint, and spell-check
  "*.css": (files: string[]): string[] => {
    return [
      `pnpm exec nx affected --target=stylelint,format,lint,spell-check --configuration=check --outputStyle=static --files=${getPaths(files)}`,
    ];
  },

  // 📄 Markdown files
  // Runs format, ESLint markdown plugin, markdownlint, and spell-check
  "*.{md,mdx}": (files: string[]): string[] => {
    return [
      `pnpm exec nx affected --target=format,lint,markdown-lint,spell-check --configuration=check --outputStyle=static --files=${getPaths(files)}`,
    ];
  },

  // 🗂️ YAML files
  // Runs format, yamllint, and spell-check (GitHub Actions, Helm values, etc.)
  // pnpm-lock.yaml is excluded: it's auto-generated and should not be linted.
  "{*.yml,!(pnpm-lock).yaml}": (files: string[]): string[] => {
    return [
      `pnpm exec nx affected --target=format,yaml-lint,spell-check --configuration=check --outputStyle=static --files=${getPaths(files)}`,
    ];
  },

  // ✅ Conformance validation
  // Run conformance validation when generator templates or generated instances change
  // to ensure generated code instances conform to their template definitions.
  // Patterns are derived from generator configuration files (see tools/conformance/src/constants.ts)
  [`{${CONFORMANCE_PATTERNS.join(",")}}`]: (): string[] => [
    "pnpm exec nx run conformance:start:validator --outputStyle=static",
  ],

  // 🗄️ SQL files
  // Runs format (SQLFluff), lint (SQLFluff), and squawk (migration safety checks)
  "*.sql": (files: string[]): string[] => {
    return [
      `pnpm exec nx affected --target=format,lint --configuration=check --outputStyle=static --files=${getPaths(files)}`,
      `pnpm exec nx affected --target=squawk --configuration=check --outputStyle=static --files=${getPaths(files)}`,
    ];
  },
};

export default config;
