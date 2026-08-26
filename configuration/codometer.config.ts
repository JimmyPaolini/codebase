import { existsSync } from "node:fs";
import path from "node:path";

import {
  type CodometerConfiguration,
  type CodometerConfigurationContext,
  type CodometerConfigurationFactory,
} from "@codometer/configuration";

// ♟️ Conventions

/** File whose presence marks the directory every project path is written from. */
const WORKSPACE_MARKER = "pnpm-workspace.yaml";

/** Directory every project's build output is emitted beneath. */
const BUILD_DIRECTORY = "dist";

/** Manifest whose presence is what makes a directory a project. */
const MANIFEST_FILE = "package.json";

/**
 * Name of the target holding a project's compiled JavaScript.
 *
 * Written out rather than derived: the pull request report joins each measured
 * target against the same target measured on the base branch, and the name is
 * the join key.
 */
const COMPILED_TARGET_NAME = "Compiled JavaScript";

/** Path separator every glob and every configured path is written with. */
const PATH_SEPARATOR = "/";

// 📏 Limits

/**
 * The limit each project's compiled output is gated against, gzipped.
 *
 * Keyed by the project's path beneath the workspace directory, which is both
 * where its build output is written and the name the pull request's
 * ⏲️ Codometer section shows, so a row here is findable from either. A project this names
 * nothing for is measured and reported like the rest and gated by nothing.
 *
 * Declared here rather than as a `sizeLimit` field in each project's
 * `package.json`, where these used to sit beside `typeCoverage`. A manifest
 * says what a package ships and what it depends on; a limit is what codometer
 * enforces, so it belongs in the file codometer reads. Written together they
 * are also reviewable as a set, which is what limits ratcheted against a
 * measured size need — each one is visible beside the others rather than being
 * a field per manifest that nothing lists.
 *
 * A project this table cannot describe — one emitting several bundles, or
 * gated by more than one limit — declares its limits in a
 * `codometer.config.cjs` of its own, which fully replaces this file for that
 * folder, so it is absent here.
 */
const PROJECT_LIMITS: Record<string, string> = {
  "packages/callidescope-cli": "70 KB",
  "packages/callidescope-configuration": "10 KB",
  "packages/codometer-cli": "84 KB",
  "packages/codometer-configuration": "13 KB",
  "packages/conformetry-cli": "14 KB",
  "packages/conformetry-configuration": "25 KB",
  "packages/conformetry-core": "15 KB",
  "packages/conformetry-files": "3 KB",
  "packages/conformetry-generation": "6 KB",
  "packages/conformetry-json": "5 KB",
  "packages/conformetry-jupyter": "6 KB",
  "packages/conformetry-markdown": "7 KB",
  "packages/conformetry-nx": "40 KB",
  "packages/conformetry-python": "5 KB",
  "packages/conformetry-text": "3 KB",
  "packages/conformetry-typescript": "9 KB",
  "packages/conformetry-validation": "14 KB",
  "packages/lexico-entities": "34 KB",
  "packages/logger": "6 KB",
};

// 🔧 Helpers

/** Rewrites a path in the separator globs and configured paths are written with. */
const toConfiguredPath = (systemPath: string): string =>
  systemPath.split(path.sep).join(PATH_SEPARATOR);

/**
 * Walks upward from a directory looking for the one every path starts at.
 *
 * The workspace file is what marks it, so nothing here has to be told where
 * the repository was checked out — a worktree, a container, and a contributor's
 * laptop all answer the same.
 */
const findWorkspaceDirectory = (searchDirectory: string): string => {
  let candidateDirectory = path.resolve(searchDirectory);

  for (;;) {
    if (existsSync(path.join(candidateDirectory, WORKSPACE_MARKER))) {
      return candidateDirectory;
    }

    const parentDirectory = path.dirname(candidateDirectory);

    if (parentDirectory === candidateDirectory) {
      return path.resolve(searchDirectory);
    }

    candidateDirectory = parentDirectory;
  }
};

/**
 * Whether a directory holds a project at all.
 *
 * A folder carrying no manifest is no project, so it gets no target rather
 * than one over a build nobody emits. A project that has not been built yet
 * and a folder that was never going to have a build must not read alike: the
 * first is an empty target, which is what the empty-match rule exists to
 * report on.
 */
const holdsProject = (directory: string): boolean =>
  existsSync(path.join(directory, MANIFEST_FILE));

// 🧱 Shared Configuration

/**
 * What every run of this repository measures the same way, wherever it starts.
 *
 * The file suffixes this repository's project structure enforces. Counting
 * them says what the TypeScript total is actually made of — how much is
 * services, and how much is the tests for them.
 */
const sharedConfiguration = {
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

/**
 * What a run measuring one project measures, derived from where that project is.
 *
 * This is the convention nineteen near-identical per-project configuration
 * files used to each restate: build output mirrors a project's own path under
 * the workspace directory, and the limit on it is the one this file declares
 * for that path. Written once here, it serves every project that follows it
 * without any of them carrying a configuration file at all.
 */
const buildProjectConfiguration = (
  context: CodometerConfigurationContext,
  workspaceDirectory: string,
): CodometerConfiguration => {
  const projectPath = toConfiguredPath(
    path.relative(workspaceDirectory, context.directory),
  );
  const declaredLimit = PROJECT_LIMITS[projectPath];

  return {
    ...sharedConfiguration,
    limits:
      declaredLimit === undefined
        ? []
        : [{ metric: `${COMPILED_TARGET_NAME}.size`, value: declaredLimit }],
    targets: [
      {
        analyses: ["size"],
        compression: "gzip",
        // Build output sits outside the project being measured, so the target
        // says how to get back out to the directory it is written beneath.
        directory: toConfiguredPath(
          path.relative(context.directory, workspaceDirectory),
        ),
        include: [
          [BUILD_DIRECTORY, projectPath, "**", "*.js"].join(PATH_SEPARATOR),
        ],
        name: COMPILED_TARGET_NAME,
      },
    ],
  };
};

/**
 * What a run measuring the whole repository measures.
 *
 * No target of its own: the repository is the one thing measured without a
 * glob, and its build output belongs to the projects that emit it.
 */
const buildWorkspaceConfiguration = (): CodometerConfiguration => ({
  ...sharedConfiguration,
  // What this repository does not measure lives in an ignore file, the way
  // every other tool here keeps its exclusions. Files `.gitignore` covers are
  // already absent — discovery reads those files itself — so the ignore file
  // only has to name what is committed but generated.
  excludeFrom: ["configuration/.codometerignore"],
  output: {
    markdown: {
      description:
        "Repository statistics measured by [codometer](packages/codometer-cli), regenerated by `nx run codebase:codometer`.",
      path: "README.md",
    },
  },
});

/**
 * Everything codometer needs to know about this repository in particular.
 *
 * Authored as a function rather than an object because one configuration file
 * serves every folder in the workspace: run in the workspace directory it
 * describes the repository, and run in a project it describes that project,
 * derived from where the project sits rather than from anything codometer
 * knows. The measurement itself lives in `@codometer/cli` and knows nothing
 * about this workspace.
 *
 * A project this cannot describe — one emitting several bundles rather than a
 * single compiled tree, or gated by more than one limit — carries a
 * configuration file of its own, which fully replaces this one for that folder
 * and declares its limits there rather than in the table above.
 */
const codometerConfiguration: CodometerConfigurationFactory = (context) => {
  const workspaceDirectory = findWorkspaceDirectory(
    context.configurationDirectory,
  );

  if (context.directory === workspaceDirectory) {
    return buildWorkspaceConfiguration();
  }

  return holdsProject(context.directory)
    ? buildProjectConfiguration(context, workspaceDirectory)
    : { ...sharedConfiguration };
};

export default codometerConfiguration;
