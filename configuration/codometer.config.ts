import { type CodometerConfiguration } from "@codometer/configuration";

// ♟️ Conventions

/**
 * Name of the target holding a project's compiled JavaScript.
 *
 * Written out rather than derived: the pull request report joins each measured
 * target against the same target measured on the base branch, and the name is
 * the join key.
 */
const COMPILED_TARGET_NAME = "Compiled JavaScript";

// 🧱 Shared Configuration

/**
 * What every measurement in this repository shares, spread by every project.
 *
 * Imported and spread by each project's `codometer.config.ts`, the same way
 * each project's `eslint.config.ts` spreads the base config beside this file.
 * A plain object rather than a function: nothing here depends on which project
 * is reading it, so nothing here has to be told.
 *
 * The counters are the file suffixes this repository's project structure
 * enforces. Counting them says what the TypeScript total is actually made of —
 * how much is services, and how much is the tests for them.
 */
const codometerConfiguration = {
  // Where each project leaves the report the pull request's ⏲️ Codometer
  // section reads. Declared here rather than passed as `--json` by the Nx
  // target, because it is the same path for every project and a destination is
  // configuration. Its sibling `--readme` stays on the command line, and
  // deliberately: only the `write` configuration passes it, which is what keeps
  // a branch's `check` run from rewriting every project README.
  output: { json: { path: "codometer-report.json" } },
  // Python lives in a uv workspace, so the interpreter is reached through uv
  // rather than being on PATH.
  python: { command: "uv run python" },
  statistics: [
    { label: "Module Files", patterns: ["**/*.module.ts"] },
    { label: "Service Files", patterns: ["**/*.service.ts"] },
    { label: "Command Files", patterns: ["**/*.command.ts"] },
    { label: "Constants Files", patterns: ["**/*.constants.ts"] },
    { label: "Types Files", patterns: ["**/*.types.ts"] },
    { label: "Utilities Files", patterns: ["**/*.utilities.ts"] },
    { label: "Errors Files", patterns: ["**/*.errors.ts"] },
    { label: "TypeORM Entities", patterns: ["**/*.entity.ts"] },
    { label: "Unit Tests", patterns: ["**/*.unit.test.ts"] },
    { label: "Integration Tests", patterns: ["**/*.integration.test.ts"] },
    { label: "End To End Tests", patterns: ["**/*.end-to-end.test.ts"] },
    // Not a file-name counter but a symbol one, and rendered beside the
    // built-in TypeScript counters rather than under Conventions. Every
    // service here is an injected singleton, so a static method appearing
    // anywhere is worth seeing in the report.
    {
      color: "166534",
      group: "typescript",
      label: "Static Methods",
      symbols: { kinds: ["method"], modifiers: ["static"] },
    },
  ],
} satisfies CodometerConfiguration;

// 🎯 Targets

/**
 * Everything a project's compiled-output target holds except which files it is.
 *
 * Spread by each project that emits compiled JavaScript, which then supplies
 * the one field that differs — the glob naming its own build output. Every
 * project sits two levels beneath the workspace directory and every build is
 * written to `dist/<project path>`, so `directory` and the rest are the same
 * for all of them and are written once here.
 *
 * A project that emits nothing declares no target at all rather than an empty
 * one. That is the difference between a project that was never going to have a
 * build and one whose build has not run: only the second should read as a
 * target matching no files.
 */
export const compiledJavaScriptTarget = {
  analyses: ["size"],
  compression: "gzip",
  // Build output sits outside the project being measured, so the target says
  // how to get back out to the directory it is written beneath.
  directory: "../..",
  name: COMPILED_TARGET_NAME,
} satisfies Omit<
  NonNullable<CodometerConfiguration["targets"]>[number],
  "include"
>;

// 🏛️ Workspace

/**
 * What a run measuring the whole repository measures.
 *
 * Re-exported as the default of the workspace-root `codometer.config.ts`,
 * which is the file codometer's upward walk actually finds for the repository
 * itself. No target of its own: the repository is the one thing measured
 * without a glob, and its build output belongs to the projects that emit it.
 */
export const workspaceConfiguration = {
  ...codometerConfiguration,
  // What this repository does not measure lives in an ignore file, the way
  // every other tool here keeps its exclusions. Files `.gitignore` covers are
  // already absent — discovery reads those files itself — so the ignore file
  // only has to name what is committed but generated.
  excludeFrom: ["configuration/.codometerignore"],
  // Replaces the shared destination rather than adding to it: the repository
  // writes badges and no report, because the pull request's change report is
  // assembled from the per-project reports and has nothing to diff a
  // repository-wide one against.
  output: {
    markdown: {
      description:
        "Repository statistics measured by [codometer](packages/codometer-cli), regenerated by `nx run codebase:codometer`.",
      path: "README.md",
    },
  },
} satisfies CodometerConfiguration;

/**
 * What a project inherits before it declares anything of its own.
 *
 * The default export so a project reads `import codometerConfiguration from
 * "../../configuration/codometer.config.js"`, matching how `eslint.config.ts`
 * imports its own base. It is also what codometer resolves for any folder here
 * that is not a project — `configuration/`, `scripts/` — which then gets the
 * conventions and nothing else.
 *
 * @see [`packages/codometer-examples/README.md`](../packages/codometer-examples/README.md)
 * for the guided tour, and
 * [`packages/codometer-examples/AGENTS.md`](../packages/codometer-examples/AGENTS.md)
 * for the message-to-example lookup table.
 */
export default codometerConfiguration;
